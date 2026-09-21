//
//  CallTranscriptionEngine.swift
//  FajrEMR
//
//  On-device transcription of a recorded call stream, via SpeechAnalyzer.
//
//  Why not SFSpeechRecognizer, which this app already ships for note dictation:
//  SFSpeechRecognizer sets `requiresOnDeviceRecognition` to whatever the device
//  claims to support and silently falls back to Apple's SERVERS when it does
//  not. That is tolerable for a clinician dictating their own note. For patient
//  consult audio it is a PHI disclosure. SpeechAnalyzer has no server path at
//  all, so the failure mode cannot occur. It also has no ~60s session limit,
//  which is what the dictation module's 55s restart machinery exists to work
//  around, and it reports real CMTimeRange timestamps.
//
//  iOS 26+ only, by design. The feature is simply unavailable below that.
//

import AVFoundation
import Foundation
import Speech

struct TranscriptSegment {
  let speaker: CallAudioStream
  let text: String
  let startMs: Int
  let endMs: Int

  var asDictionary: [String: Any] {
    [
      "id": "\(speaker.rawValue)-\(startMs)",
      "speaker": speaker.rawValue,
      "text": text,
      "startMs": startMs,
      "endMs": endMs,
      "isFinal": true,
    ]
  }
}

enum CallTranscriptionError: LocalizedError {
  case unsupportedOS
  case unsupportedLocale(String)
  case assetsUnavailable(String)
  case audioUnreadable(String)
  case cancelled

  var errorDescription: String? {
    switch self {
    case .unsupportedOS:
      return "On-device transcription requires iOS 26 or later"
    case .unsupportedLocale(let tag):
      return "Transcription is not available for \(tag)"
    case .assetsUnavailable(let detail):
      return "Speech model unavailable: \(detail)"
    case .audioUnreadable(let detail):
      return "Could not read call audio: \(detail)"
    case .cancelled:
      return "Transcription was cancelled"
    }
  }
}

@available(iOS 26.0, *)
enum CallTranscriptionEngine {

  // MARK: - Capability

  static func supportedLocaleIdentifiers() async -> [String] {
    await SpeechTranscriber.supportedLocales.map { $0.identifier(.bcp47) }
  }

  static func installedLocaleIdentifiers() async -> [String] {
    await SpeechTranscriber.installedLocales.map { $0.identifier(.bcp47) }
  }

  /// True when the locale can be transcribed at all. Callers must check this
  /// before recording: transcribing an unsupported language produces confident
  /// nonsense, which in a medical record is worse than no transcript.
  static func isSupported(localeIdentifier: String) async -> Bool {
    let target = Locale(identifier: localeIdentifier)
    return await SpeechTranscriber.supportedLocale(equivalentTo: target) != nil
  }

  /// Downloads and installs the speech assets for a locale if needed.
  ///
  /// AssetInventory caps how many locales may be reserved at once
  /// (`maximumReservedLocales`), so this is worth doing deliberately — e.g.
  /// ahead of a trip, on WiFi — rather than mid-consult.
  static func prepare(localeIdentifier: String) async throws {
    let locale = try await resolveLocale(localeIdentifier)
    let transcriber = SpeechTranscriber(locale: locale, preset: .timeIndexedProgressiveTranscription)

    if await AssetInventory.status(forModules: [transcriber]) == .installed { return }

    do {
      _ = try await AssetInventory.reserve(locale: locale)
      if let request = try await AssetInventory.assetInstallationRequest(supporting: [transcriber]) {
        try await request.downloadAndInstall()
      }
    } catch {
      throw CallTranscriptionError.assetsUnavailable(error.localizedDescription)
    }
  }

  // MARK: - Transcription

  /// Transcribes one recorded stream end to end.
  ///
  /// `onProgress` receives 0...1 based on how far into the file the analyzer
  /// has reported. Only final results are returned; volatile ones exist purely
  /// to drive that progress and are never persisted.
  static func transcribe(
    fileURL: URL,
    speaker: CallAudioStream,
    localeIdentifier: String,
    contextualStrings: [String],
    onProgress: @escaping (Double) -> Void
  ) async throws -> [TranscriptSegment] {

    let locale = try await resolveLocale(localeIdentifier)

    let audioFile: AVAudioFile
    do {
      audioFile = try AVAudioFile(forReading: fileURL)
    } catch {
      throw CallTranscriptionError.audioUnreadable(error.localizedDescription)
    }

    let sampleRate = audioFile.fileFormat.sampleRate
    let totalSeconds = sampleRate > 0 ? Double(audioFile.length) / sampleRate : 0

    let transcriber = SpeechTranscriber(locale: locale, preset: .timeIndexedProgressiveTranscription)

    let context = AnalysisContext()
    if !contextualStrings.isEmpty {
      // Medical vocabulary. Shared with note dictation and passed in from JS so
      // there is exactly one list to maintain.
      context.contextualStrings[.general] = contextualStrings
    }

    let analyzer = SpeechAnalyzer(modules: [transcriber])
    try await analyzer.setContext(context)

    // Results must be consumed concurrently with the analysis run: start()
    // does not return until the file has been fed through.
    let collector = Task<[TranscriptSegment], Error> {
      var segments: [TranscriptSegment] = []
      for try await result in transcriber.results {
        let endSeconds = result.range.end.seconds

        if totalSeconds > 0, endSeconds.isFinite {
          onProgress(min(1.0, max(0.0, endSeconds / totalSeconds)))
        }

        guard result.isFinal else { continue }

        let text = String(result.text.characters).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { continue }

        let start = result.range.start.seconds
        segments.append(
          TranscriptSegment(
            speaker: speaker,
            text: text,
            startMs: Int((start.isFinite ? start : 0) * 1000),
            endMs: Int((endSeconds.isFinite ? endSeconds : 0) * 1000)
          )
        )
      }
      return segments
    }

    do {
      try await analyzer.start(inputAudioFile: audioFile, finishAfterFile: true)
      try await analyzer.finalizeAndFinishThroughEndOfInput()
    } catch {
      collector.cancel()
      throw CallTranscriptionError.audioUnreadable(error.localizedDescription)
    }

    let segments = try await collector.value
    onProgress(1.0)
    return segments
  }

  // MARK: - Helpers

  private static func resolveLocale(_ identifier: String) async throws -> Locale {
    let requested = Locale(identifier: identifier)
    guard let resolved = await SpeechTranscriber.supportedLocale(equivalentTo: requested) else {
      throw CallTranscriptionError.unsupportedLocale(identifier)
    }
    return resolved
  }
}
