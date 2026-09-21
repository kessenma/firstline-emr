//
//  CallAudioCapture.swift
//  FajrEMR
//
//  Taps both sides of a LiveKit call as separate PCM streams.
//
//  Local capture (post AEC/NS) is the clinician; the mixed remote render is the
//  patient in a 1:1 consult. Keeping them apart is what gives the transcript
//  speaker labels without any diarization model.
//
//  Two hard-won constraints from the M0 device spike, both load-bearing:
//
//  1. Renderers must be attached ONCE and left attached. Attaching per-call
//     produced zero callbacks on the first call after app launch and ~100/sec
//     on every call after — a cold start somewhere in the audio pipeline.
//     Recording is therefore gated by a flag, never by attach/detach.
//
//  2. The two streams do NOT share a sample rate. Measured on device: local
//     48 kHz, remote 32 kHz, both mono Int16 in 10 ms frames. Resample each
//     independently; never assume a common clock.
//

import AVFoundation
import Foundation
import os
import livekit_react_native
import livekit_react_native_webrtc

enum CallAudioStream: String {
  case doctor
  case patient
}

/// Per-stream statistics for one reporting window.
struct CallAudioStats {
  var callbacks = 0
  var frames = 0
  var droppedFrames = 0
  var rms: Double = 0
  var sampleRate: Double = 0
  var channels = 0
}

/// Fixed-capacity Int16 ring written from the realtime audio thread and drained
/// from a serial queue.
///
/// Drop-oldest on overflow, with a counter surfaced to JS. Silently corrupting
/// the timeline would be far worse than an honest, reported gap: a consult
/// transcript that quietly omits thirty seconds is a clinical hazard.
private final class PCMRing {
  private struct State {
    var buffer: [Int16]
    var writeIndex = 0
    var available = 0
    var dropped = 0

    var callbacks = 0
    var frames = 0
    var sumOfSquares: Double = 0
    var sampleRate: Double = 0
    var channels = 0
  }

  private let capacity: Int
  private let state: OSAllocatedUnfairLock<State>

  init(capacity: Int) {
    self.capacity = capacity
    self.state = OSAllocatedUnfairLock(
      initialState: State(buffer: [Int16](repeating: 0, count: capacity))
    )
  }

  /// REALTIME AUDIO THREAD. No allocation, no logging, no Date(), no dispatch.
  func write(
    _ samples: UnsafePointer<Int16>,
    count: Int,
    sampleRate: Double,
    channels: Int,
    sumSq: Double
  ) {
    state.withLock { s in
      s.callbacks += 1
      s.frames += count
      s.sumOfSquares += sumSq
      s.sampleRate = sampleRate
      s.channels = channels

      if count >= capacity {
        // Single buffer larger than the whole ring: keep only the tail.
        let start = count - capacity
        for i in 0 ..< capacity { s.buffer[i] = samples[start + i] }
        s.writeIndex = 0
        s.dropped += count - capacity
        s.available = capacity
        return
      }

      for i in 0 ..< count {
        s.buffer[s.writeIndex] = samples[i]
        s.writeIndex = (s.writeIndex + 1) % capacity
      }

      let room = capacity - s.available
      if count > room {
        s.dropped += count - room
        s.available = capacity
      } else {
        s.available += count
      }
    }
  }

  /// Drains everything currently buffered. Returns nil when empty.
  func drain() -> (samples: [Int16], sampleRate: Double, channels: Int)? {
    state.withLock { s -> (samples: [Int16], sampleRate: Double, channels: Int)? in
      guard s.available > 0 else { return nil }

      var out = [Int16](repeating: 0, count: s.available)
      let start = (s.writeIndex - s.available + capacity) % capacity
      for i in 0 ..< s.available {
        out[i] = s.buffer[(start + i) % capacity]
      }
      s.available = 0
      return (out, s.sampleRate, s.channels)
    }
  }

  /// Reads and resets the reporting window.
  func takeStats() -> CallAudioStats {
    state.withLock { s in
      var stats = CallAudioStats()
      stats.callbacks = s.callbacks
      stats.frames = s.frames
      stats.droppedFrames = s.dropped
      stats.rms = s.frames > 0 ? (s.sumOfSquares / Double(s.frames)).squareRoot() : 0
      stats.sampleRate = s.sampleRate
      stats.channels = s.channels

      s.callbacks = 0
      s.frames = 0
      s.sumOfSquares = 0
      return stats
    }
  }

  var totalDropped: Int { state.withLock { $0.dropped } }

  func resetDropped() { state.withLock { $0.dropped = 0 } }
}

/// Bridges one WebRTC audio stream into a ring.
private final class StreamRenderer: NSObject, RTCAudioRenderer {
  let ring: PCMRing

  /// Gates ring writes. The renderer stays attached for the process lifetime
  /// (see the header) — this is what actually starts and stops capture.
  private let capturing = OSAllocatedUnfairLock(initialState: false)

  init(ringCapacity: Int) {
    self.ring = PCMRing(capacity: ringCapacity)
    super.init()
  }

  func setCapturing(_ on: Bool) { capturing.withLock { $0 = on } }

  func render(pcmBuffer: AVAudioPCMBuffer) {
    // REALTIME AUDIO THREAD.
    guard capturing.withLock({ $0 }) else { return }

    let frames = Int(pcmBuffer.frameLength)
    guard frames > 0 else { return }

    if let int16 = pcmBuffer.int16ChannelData {
      let channel = int16[0]
      var sumSq: Double = 0
      let scale = Double(Int16.max)
      for i in 0 ..< frames {
        let v = Double(channel[i]) / scale
        sumSq += v * v
      }
      ring.write(
        channel,
        count: frames,
        sampleRate: pcmBuffer.format.sampleRate,
        channels: Int(pcmBuffer.format.channelCount),
        sumSq: sumSq
      )
      return
    }

    // Float path: WebRTC delivers Int16 in practice, but the renderer contract
    // does not promise it. Convert in place rather than dropping audio.
    guard let floats = pcmBuffer.floatChannelData else { return }
    let channel = floats[0]
    var scratch = [Int16](repeating: 0, count: frames)
    var sumSq: Double = 0
    for i in 0 ..< frames {
      let v = channel[i]
      sumSq += Double(v) * Double(v)
      scratch[i] = Int16(max(-32768, min(32767, v * 32767)))
    }
    scratch.withUnsafeBufferPointer { buf in
      guard let base = buf.baseAddress else { return }
      ring.write(
        base,
        count: frames,
        sampleRate: pcmBuffer.format.sampleRate,
        channels: Int(pcmBuffer.format.channelCount),
        sumSq: sumSq
      )
    }
  }
}

/// Owns both renderers and their attachment to LiveKit's audio pipeline.
final class CallAudioCapture {

  static let shared = CallAudioCapture()

  /// ~4 s at 48 kHz. Generous: the drain runs every 200 ms, so this only fills
  /// if the device is badly stalled, and a big ring is far cheaper than a gap.
  private static let ringCapacity = 48_000 * 4

  private let doctorRenderer = StreamRenderer(ringCapacity: ringCapacity)
  private let patientRenderer = StreamRenderer(ringCapacity: ringCapacity)

  private var attached = false
  private let lock = OSAllocatedUnfairLock(initialState: false)

  private init() {}

  /// Registers both renderers with LiveKit. Idempotent, and never undone —
  /// detaching between calls is what caused the cold-start dropout.
  func attachIfNeeded() {
    let alreadyAttached = lock.withLock { state -> Bool in
      if state { return true }
      state = true
      return false
    }
    guard !alreadyAttached else { return }

    let manager = LKAudioProcessingManager.sharedInstance()
    manager.addLocalAudioRenderer(doctorRenderer)
    manager.addRemoteAudioRenderer(patientRenderer)
    attached = true
    NSLog("[CallAudioCapture] renderers attached (permanent)")
  }

  func setCapturing(_ on: Bool) {
    doctorRenderer.setCapturing(on)
    patientRenderer.setCapturing(on)
    if on {
      doctorRenderer.ring.resetDropped()
      patientRenderer.ring.resetDropped()
    }
  }

  func drain(_ stream: CallAudioStream) -> (samples: [Int16], sampleRate: Double, channels: Int)? {
    renderer(for: stream).ring.drain()
  }

  func takeStats(_ stream: CallAudioStream) -> CallAudioStats {
    renderer(for: stream).ring.takeStats()
  }

  func droppedFrames(_ stream: CallAudioStream) -> Int {
    renderer(for: stream).ring.totalDropped
  }

  private func renderer(for stream: CallAudioStream) -> StreamRenderer {
    switch stream {
    case .doctor: return doctorRenderer
    case .patient: return patientRenderer
    }
  }
}
