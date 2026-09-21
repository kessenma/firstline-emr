//
//  CallLiveTranscription.swift
//  FajrEMR
//
//  Live captioning of a call: both streams transcribed as they arrive.
//
//  Same SpeechAnalyzer engine as the post-call path, fed from the capture ring
//  buffers instead of a file. The difference that matters is what is kept: live
//  mode writes NO audio to disk at all. Nothing to upload, nothing to purge,
//  and nothing to recover from if it fails — the trade for captions is that a
//  failed run cannot be retried, because the audio is gone the moment it has
//  been through the analyzer.
//
//  Live and post-call are mutually exclusive by design. Both drain the same
//  rings, so running them together would have each stealing half the other's
//  audio. NativeCallTranscription enforces that only one is active.
//

import AVFoundation
import Foundation
import Speech

@available(iOS 26.0, *)
final class CallLiveTranscription {

  struct LiveSegment {
    let speaker: CallAudioStream
    let text: String
    let startMs: Int
    let endMs: Int
    let isFinal: Bool
  }

  /// One speaker's analyzer, fed by a drain loop off the capture ring.
  private final class Stream {
    let speaker: CallAudioStream
    let analyzer: SpeechAnalyzer
    let transcriber: SpeechTranscriber
    let continuation: AsyncStream<AnalyzerInput>.Continuation
    let analyzerFormat: AVAudioFormat
    var converter: AVAudioConverter?
    var sourceFormat: AVAudioFormat?
    var resultsTask: Task<Void, Never>?

    init(
      speaker: CallAudioStream,
      analyzer: SpeechAnalyzer,
      transcriber: SpeechTranscriber,
      continuation: AsyncStream<AnalyzerInput>.Continuation,
      analyzerFormat: AVAudioFormat
    ) {
      self.speaker = speaker
      self.analyzer = analyzer
      self.transcriber = transcriber
      self.continuation = continuation
      self.analyzerFormat = analyzerFormat
    }
  }

  private let capture = CallAudioCapture.shared
  private let queue = DispatchQueue(label: "org.fajrmission.emr.liveTranscription")
  private var streams: [CallAudioStream: Stream] = [:]
  private var drainTimer: DispatchSourceTimer?
  private var onSegment: ((LiveSegment) -> Void)?

  /// 200 ms, matching the recorder. Short enough that captions feel live,
  /// long enough that AVAudioConverter is not invoked per 10 ms frame.
  private static let drainInterval: TimeInterval = 0.2

  var isRunning: Bool { queue.sync { !streams.isEmpty } }

  // MARK: - Lifecycle

  func start(
    doctorLocale: String,
    patientLocale: String,
    contextualStrings: [String],
    onSegment: @escaping (LiveSegment) -> Void
  ) async throws {
    guard !isRunning else { return }
    self.onSegment = onSegment

    let doctor = try await makeStream(
      speaker: .doctor,
      localeIdentifier: doctorLocale,
      contextualStrings: contextualStrings
    )
    let patient = try await makeStream(
      speaker: .patient,
      localeIdentifier: patientLocale,
      contextualStrings: contextualStrings
    )

    queue.sync {
      streams[.doctor] = doctor
      streams[.patient] = patient
    }

    capture.setCapturing(true)

    let timer = DispatchSource.makeTimerSource(queue: queue)
    timer.schedule(deadline: .now() + Self.drainInterval, repeating: Self.drainInterval)
    timer.setEventHandler { [weak self] in self?.drainAll() }
    timer.resume()
    drainTimer = timer

    NSLog("[CallLiveTranscription] started")
  }

  func stop() async {
    let active: [Stream] = queue.sync {
      drainTimer?.cancel()
      drainTimer = nil
      capture.setCapturing(false)
      let values = Array(streams.values)
      streams.removeAll()
      return values
    }

    guard !active.isEmpty else { return }

    // Drain whatever is still buffered before closing the input, so the last
    // few words of a consult are not lost to a 200 ms timing accident.
    for stream in active {
      feed(stream: stream)
      stream.continuation.finish()
    }

    for stream in active {
      // Flushes any partial result the analyzer is still holding.
      try? await stream.analyzer.finalizeAndFinishThroughEndOfInput()
      stream.resultsTask?.cancel()
    }

    onSegment = nil
    NSLog("[CallLiveTranscription] stopped")
  }

  // MARK: - Setup

  private func makeStream(
    speaker: CallAudioStream,
    localeIdentifier: String,
    contextualStrings: [String]
  ) async throws -> Stream {
    let requested = Locale(identifier: localeIdentifier)
    guard let locale = await SpeechTranscriber.supportedLocale(equivalentTo: requested) else {
      throw CallTranscriptionError.unsupportedLocale(localeIdentifier)
    }

    // Progressive preset: emits volatile results as the speaker talks, which is
    // the whole point of captions. Time-indexed so segments can be ordered
    // against the other speaker's.
    let transcriber = SpeechTranscriber(
      locale: locale,
      preset: .timeIndexedProgressiveTranscription
    )

    let context = AnalysisContext()
    if !contextualStrings.isEmpty {
      context.contextualStrings[.general] = contextualStrings
    }

    let analyzer = SpeechAnalyzer(modules: [transcriber])
    try await analyzer.setContext(context)

    guard let analyzerFormat = await SpeechAnalyzer.bestAvailableAudioFormat(
      compatibleWith: [transcriber]
    ) else {
      throw CallTranscriptionError.assetsUnavailable("no compatible audio format")
    }

    var continuation: AsyncStream<AnalyzerInput>.Continuation!
    let inputSequence = AsyncStream<AnalyzerInput> { continuation = $0 }

    let stream = Stream(
      speaker: speaker,
      analyzer: analyzer,
      transcriber: transcriber,
      continuation: continuation,
      analyzerFormat: analyzerFormat
    )

    stream.resultsTask = Task { [weak self] in
      do {
        for try await result in transcriber.results {
          guard let self else { return }
          let text = String(result.text.characters)
            .trimmingCharacters(in: .whitespacesAndNewlines)
          guard !text.isEmpty else { continue }

          let start = result.range.start.seconds
          let end = result.range.end.seconds
          self.onSegment?(
            LiveSegment(
              speaker: speaker,
              text: text,
              startMs: Int((start.isFinite ? start : 0) * 1000),
              endMs: Int((end.isFinite ? end : 0) * 1000),
              isFinal: result.isFinal
            )
          )
        }
      } catch {
        NSLog(
          "[CallLiveTranscription] %@ results ended: %@",
          speaker.rawValue,
          error.localizedDescription
        )
      }
    }

    try await analyzer.start(inputSequence: inputSequence)
    return stream
  }

  // MARK: - Draining

  private func drainAll() {
    for stream in streams.values {
      feed(stream: stream)
    }
  }

  private func feed(stream: Stream) {
    guard let chunk = capture.drain(stream.speaker), !chunk.samples.isEmpty else { return }
    guard chunk.sampleRate > 0 else { return }

    // Rebuild the converter if the stream's rate changed. The two sides do not
    // share a rate — measured 48 kHz local, 32 kHz remote — and neither is
    // guaranteed stable across a reconnect.
    if stream.sourceFormat?.sampleRate != chunk.sampleRate {
      stream.sourceFormat = AVAudioFormat(
        commonFormat: .pcmFormatFloat32,
        sampleRate: chunk.sampleRate,
        channels: 1,
        interleaved: false
      )
      stream.converter = nil
    }

    guard let source = stream.sourceFormat else { return }
    if stream.converter == nil {
      stream.converter = AVAudioConverter(from: source, to: stream.analyzerFormat)
    }
    guard let converter = stream.converter else { return }

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

    let ratio = stream.analyzerFormat.sampleRate / source.sampleRate
    let capacity = AVAudioFrameCount(Double(input.frameLength) * ratio) + 64
    guard let output = AVAudioPCMBuffer(
      pcmFormat: stream.analyzerFormat,
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

    guard status != .error, output.frameLength > 0 else { return }
    stream.continuation.yield(AnalyzerInput(buffer: output))
  }
}
