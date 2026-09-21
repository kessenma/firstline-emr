//
//  CallAudioRecorder.swift
//  FajrEMR
//
//  Writes the two call audio streams to disk as separate mono AAC files.
//
//  Two files rather than one stereo file: if a stream stalls, the other is
//  unaffected, and each transcribes independently.
//
//  Both files are kept on a single wall-clock timeline by padding silence
//  whenever a stream falls behind — see `catchUp`. That is what lets transcript
//  timestamps from two independent SpeechAnalyzer runs be compared directly,
//  and it also absorbs the cold-start case where one stream starts late.
//
//  Output lives in Library/Caches, which iOS excludes from iCloud backup —
//  correct for consult audio. Files are deleted as soon as the transcript is
//  written; nothing here is a long-term store.
//

import AVFoundation
import Foundation

struct CallRecordingResult {
  let doctorPath: String
  let patientPath: String
  let durationSeconds: Double
  let doctorDroppedFrames: Int
  let patientDroppedFrames: Int
}

enum CallAudioRecorderError: LocalizedError {
  case alreadyRecording
  case notRecording
  case couldNotCreateFile(String)

  var errorDescription: String? {
    switch self {
    case .alreadyRecording: return "A recording is already in progress"
    case .notRecording: return "No recording is in progress"
    case .couldNotCreateFile(let detail): return "Could not create audio file: \(detail)"
    }
  }
}

final class CallAudioRecorder {

  /// SpeechAnalyzer works comfortably at 16 kHz and it keeps a 25-minute
  /// consult around 4.5 MB per stream at 24 kbps.
  static let targetSampleRate: Double = 16_000

  private final class StreamWriter {
    let stream: CallAudioStream
    let url: URL
    let file: AVAudioFile
    var converter: AVAudioConverter?
    var sourceFormat: AVAudioFormat?
    var samplesWritten: Int = 0

    init(stream: CallAudioStream, url: URL) throws {
      self.stream = stream
      self.url = url
      let settings: [String: Any] = [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: CallAudioRecorder.targetSampleRate,
        AVNumberOfChannelsKey: 1,
        AVEncoderBitRateKey: 24_000,
      ]
      do {
        self.file = try AVAudioFile(forWriting: url, settings: settings)
      } catch {
        throw CallAudioRecorderError.couldNotCreateFile(error.localizedDescription)
      }
    }
  }

  private let capture = CallAudioCapture.shared
  private let queue = DispatchQueue(label: "org.fajrmission.emr.callAudioRecorder")

  private var doctor: StreamWriter?
  private var patient: StreamWriter?
  private var drainTimer: DispatchSourceTimer?
  private var startedAt: CFAbsoluteTime = 0
  private var directory: URL?

  /// Fires roughly every 200 ms — 20 WebRTC frames' worth. Converting per
  /// 10 ms frame would churn AVAudioConverter 20x for no benefit.
  private static let drainInterval: TimeInterval = 0.2

  // MARK: - Lifecycle

  func start(sessionId: String) throws -> String {
    var thrown: Error?
    var directoryPath = ""

    queue.sync {
      guard doctor == nil else {
        thrown = CallAudioRecorderError.alreadyRecording
        return
      }

      do {
        let dir = try Self.recordingDirectory(sessionId: sessionId)
        directory = dir
        directoryPath = dir.path

        doctor = try StreamWriter(stream: .doctor, url: dir.appendingPathComponent("doctor.m4a"))
        patient = try StreamWriter(stream: .patient, url: dir.appendingPathComponent("patient.m4a"))
      } catch {
        thrown = error
        doctor = nil
        patient = nil
        return
      }

      startedAt = CFAbsoluteTimeGetCurrent()

      // Renderers are already attached (permanently, at module init). This is
      // what actually opens the tap.
      capture.setCapturing(true)

      let timer = DispatchSource.makeTimerSource(queue: queue)
      timer.schedule(deadline: .now() + Self.drainInterval, repeating: Self.drainInterval)
      timer.setEventHandler { [weak self] in self?.drainAll() }
      timer.resume()
      drainTimer = timer
    }

    if let thrown { throw thrown }
    NSLog("[CallAudioRecorder] started session=%@", sessionId)
    return directoryPath
  }

  func stop() throws -> CallRecordingResult {
    var result: CallRecordingResult?
    var thrown: Error?

    queue.sync {
      guard let doctorWriter = doctor, let patientWriter = patient else {
        thrown = CallAudioRecorderError.notRecording
        return
      }

      drainTimer?.cancel()
      drainTimer = nil

      // Stop the tap first, then take everything still buffered, so no audio is
      // written after the files are considered closed.
      capture.setCapturing(false)
      drainAll()

      let duration = CFAbsoluteTimeGetCurrent() - startedAt

      result = CallRecordingResult(
        doctorPath: doctorWriter.url.path,
        patientPath: patientWriter.url.path,
        durationSeconds: duration,
        doctorDroppedFrames: capture.droppedFrames(.doctor),
        patientDroppedFrames: capture.droppedFrames(.patient)
      )

      // AVAudioFile finalizes the container on deinit.
      doctor = nil
      patient = nil
    }

    if let thrown { throw thrown }
    guard let result else { throw CallAudioRecorderError.notRecording }
    NSLog(
      "[CallAudioRecorder] stopped duration=%.1fs dropped d=%d p=%d",
      result.durationSeconds, result.doctorDroppedFrames, result.patientDroppedFrames
    )
    return result
  }

  var isRecording: Bool { queue.sync { doctor != nil } }

  /// Abandons an in-flight recording and deletes its files. Used when consent
  /// is withdrawn mid-call, where keeping the audio would be exactly wrong.
  func cancelAndDiscard() {
    queue.sync {
      drainTimer?.cancel()
      drainTimer = nil
      capture.setCapturing(false)
      doctor = nil
      patient = nil
      if let dir = directory {
        try? FileManager.default.removeItem(at: dir)
      }
      directory = nil
    }
  }

  // MARK: - Draining

  private func drainAll() {
    if let doctor { drain(writer: doctor) }
    if let patient { drain(writer: patient) }
  }

  private func drain(writer: StreamWriter) {
    guard let chunk = capture.drain(writer.stream), !chunk.samples.isEmpty else { return }
    guard chunk.sampleRate > 0 else { return }

    catchUp(writer: writer)

    guard let source = sourceFormat(for: writer, sampleRate: chunk.sampleRate),
          let converter = converter(for: writer, source: source)
    else { return }

    guard let input = AVAudioPCMBuffer(
      pcmFormat: source,
      frameCapacity: AVAudioFrameCount(chunk.samples.count)
    ) else { return }

    input.frameLength = AVAudioFrameCount(chunk.samples.count)
    if let dest = input.floatChannelData?[0] {
      let scale = Float(Int16.max)
      for i in 0 ..< chunk.samples.count {
        dest[i] = Float(chunk.samples[i]) / scale
      }
    }

    write(converted: input, through: converter, to: writer)
  }

  /// Pads silence when a stream has written less audio than wall-clock says it
  /// should have. Absorbs a late first buffer and any dropout, keeping the two
  /// files on one timeline so their transcript timestamps stay comparable.
  private func catchUp(writer: StreamWriter) {
    let elapsed = CFAbsoluteTimeGetCurrent() - startedAt
    let expected = Int(elapsed * Self.targetSampleRate)
    let deficit = expected - writer.samplesWritten

    // 150 ms of slack absorbs ordinary drain jitter; anything larger is a real
    // gap worth filling so later audio does not slide earlier in the timeline.
    let tolerance = Int(0.15 * Self.targetSampleRate)
    guard deficit > tolerance else { return }

    let format = writer.file.processingFormat
    guard let silence = AVAudioPCMBuffer(
      pcmFormat: format,
      frameCapacity: AVAudioFrameCount(deficit)
    ) else { return }
    silence.frameLength = AVAudioFrameCount(deficit)
    if let data = silence.floatChannelData?[0] {
      data.update(repeating: 0, count: deficit)
    }

    do {
      try writer.file.write(from: silence)
      writer.samplesWritten += deficit
    } catch {
      NSLog("[CallAudioRecorder] silence pad failed: %@", error.localizedDescription)
    }
  }

  private func sourceFormat(for writer: StreamWriter, sampleRate: Double) -> AVAudioFormat? {
    if let existing = writer.sourceFormat, existing.sampleRate == sampleRate {
      return existing
    }
    // Rate changed (or first buffer): rebuild both format and converter.
    let format = AVAudioFormat(
      commonFormat: .pcmFormatFloat32,
      sampleRate: sampleRate,
      channels: 1,
      interleaved: false
    )
    writer.sourceFormat = format
    writer.converter = nil
    return format
  }

  private func converter(for writer: StreamWriter, source: AVAudioFormat) -> AVAudioConverter? {
    if let existing = writer.converter { return existing }
    let converter = AVAudioConverter(from: source, to: writer.file.processingFormat)
    writer.converter = converter
    return converter
  }

  private func write(
    converted input: AVAudioPCMBuffer,
    through converter: AVAudioConverter,
    to writer: StreamWriter
  ) {
    let ratio = writer.file.processingFormat.sampleRate / input.format.sampleRate
    let capacity = AVAudioFrameCount(Double(input.frameLength) * ratio) + 64

    guard let output = AVAudioPCMBuffer(
      pcmFormat: writer.file.processingFormat,
      frameCapacity: capacity
    ) else { return }

    var consumed = false
    var error: NSError?
    let status = converter.convert(to: output, error: &error) { _, outStatus in
      if consumed {
        outStatus.pointee = .noDataNow
        return nil
      }
      consumed = true
      outStatus.pointee = .haveData
      return input
    }

    guard status != .error, output.frameLength > 0 else {
      if let error {
        NSLog("[CallAudioRecorder] convert failed: %@", error.localizedDescription)
      }
      return
    }

    do {
      try writer.file.write(from: output)
      writer.samplesWritten += Int(output.frameLength)
    } catch {
      NSLog("[CallAudioRecorder] write failed: %@", error.localizedDescription)
    }
  }

  // MARK: - Paths

  static func recordingDirectory(sessionId: String) throws -> URL {
    let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
    let dir = caches
      .appendingPathComponent("call-audio", isDirectory: true)
      .appendingPathComponent(sessionId, isDirectory: true)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  /// Removes a session's audio once its transcript is safely persisted.
  static func discardRecording(sessionId: String) {
    guard let dir = try? recordingDirectory(sessionId: sessionId) else { return }
    try? FileManager.default.removeItem(at: dir)
  }
}
