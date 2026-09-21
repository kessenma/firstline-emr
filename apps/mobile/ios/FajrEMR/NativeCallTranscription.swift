//
//  NativeCallTranscription.swift
//  FajrEMR
//
//  React Native surface for on-device call transcription.
//
//  Record (CallAudioRecorder) and transcribe (CallTranscriptionEngine) are
//  deliberately separate calls rather than one fused operation: post-call mode
//  hangs up first and transcribes afterwards, and a failed transcription must
//  be retryable from the audio that is still on disk.
//
//  Supersedes CallAudioProbe — the per-second stats it emitted live on here as
//  `onCallAudioStats`, so the M0 diagnostic remains available without a second
//  set of renderers competing for the same streams.
//

import AVFoundation
import Foundation
import React

// @unchecked Sendable: transcription runs on Swift concurrency tasks and the
// live-caption callback fires from the analyzer's own context, so `self` is
// legitimately captured across threads. RCTEventEmitter is not Sendable, but
// sendEvent is safe to call from any thread and every mutable field here is
// confined to `queue`. Asserted rather than inferred — without this the
// compiler warns at each hop and the warnings become errors under Swift 6.
@objc(NativeCallTranscription)
class NativeCallTranscription: RCTEventEmitter, @unchecked Sendable {

  private let recorder = CallAudioRecorder()
  /// Live captioning. Mutually exclusive with recording — both drain the same
  /// capture rings, so running them together would have each stealing half the
  /// other's audio. Enforced in startLiveTranscription/startRecording.
  private var liveTranscription: Any?
  private var statsTimer: DispatchSourceTimer?
  private var hasListeners = false
  private var activeJobs: [String: Task<Void, Never>] = [:]
  private let queue = DispatchQueue(label: "org.fajrmission.emr.callTranscription")

  override init() {
    super.init()
    // Attach the audio taps immediately and permanently. Attaching per-call
    // yielded zero callbacks on the first call after launch — see
    // CallAudioCapture's header. Cheap: capture stays gated off until a
    // recording actually starts.
    CallAudioCapture.shared.attachIfNeeded()
  }

  // MARK: - RCTEventEmitter

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! {
    ["onCallAudioStats", "onTranscriptionProgress", "onLiveSegment"]
  }

  override func startObserving() { hasListeners = true }
  override func stopObserving() { hasListeners = false }

  // MARK: - Capability

  @objc(isSupported:rejecter:)
  func isSupported(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 26.0, *) {
      resolve(["supported": true])
    } else {
      resolve(["supported": false, "reason": "Requires iOS 26 or later"])
    }
  }

  @objc(supportedLocales:rejecter:)
  func supportedLocales(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 26.0, *) else { return resolve([]) }
    Task { resolve(await CallTranscriptionEngine.supportedLocaleIdentifiers()) }
  }

  @objc(installedLocales:rejecter:)
  func installedLocales(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 26.0, *) else { return resolve([]) }
    Task { resolve(await CallTranscriptionEngine.installedLocaleIdentifiers()) }
  }

  @objc(isLocaleSupported:resolve:rejecter:)
  func isLocaleSupported(
    _ locale: String,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 26.0, *) else { return resolve(false) }
    Task { resolve(await CallTranscriptionEngine.isSupported(localeIdentifier: locale)) }
  }

  @objc(prepareLocale:resolve:rejecter:)
  func prepareLocale(
    _ locale: String,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 26.0, *) else {
      return reject("unsupported_os", "Requires iOS 26 or later", nil)
    }
    Task {
      do {
        try await CallTranscriptionEngine.prepare(localeIdentifier: locale)
        resolve(["prepared": true])
      } catch {
        reject("prepare_failed", error.localizedDescription, error)
      }
    }
  }

  // MARK: - Recording

  @objc(startRecording:resolve:rejecter:)
  func startRecording(
    _ sessionId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if isLiveRunning() {
      return reject(
        "live_active",
        "Live transcription is running; stop it before recording",
        nil
      )
    }

    do {
      let directory = try recorder.start(sessionId: sessionId)
      startStatsTimer()
      resolve(["started": true, "directory": directory])
    } catch {
      reject("record_failed", error.localizedDescription, error)
    }
  }

  @objc(stopRecording:rejecter:)
  func stopRecording(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    stopStatsTimer()
    do {
      let result = try recorder.stop()
      resolve([
        "doctorPath": result.doctorPath,
        "patientPath": result.patientPath,
        "durationSeconds": result.durationSeconds,
        "doctorDroppedFrames": result.doctorDroppedFrames,
        "patientDroppedFrames": result.patientDroppedFrames,
      ])
    } catch {
      reject("stop_failed", error.localizedDescription, error)
    }
  }

  /// Abandons an in-flight recording and deletes its audio. Used when the
  /// patient withdraws consent mid-call — keeping that audio would be exactly
  /// the thing they just refused.
  @objc(cancelRecording:rejecter:)
  func cancelRecording(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    stopStatsTimer()
    recorder.cancelAndDiscard()
    resolve(["cancelled": true])
  }

  @objc(discardRecording:resolve:rejecter:)
  func discardRecording(
    _ sessionId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    CallAudioRecorder.discardRecording(sessionId: sessionId)
    resolve(["discarded": true])
  }

  // MARK: - Transcription

  @objc(transcribe:resolve:rejecter:)
  func transcribe(
    _ options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 26.0, *) else {
      return reject("unsupported_os", "Requires iOS 26 or later", nil)
    }

    guard
      let jobId = options["jobId"] as? String,
      let doctorPath = options["doctorPath"] as? String,
      let patientPath = options["patientPath"] as? String
    else {
      return reject("bad_arguments", "jobId, doctorPath and patientPath are required", nil)
    }

    let doctorLocale = options["doctorLocale"] as? String ?? "en-US"
    let patientLocale = options["patientLocale"] as? String ?? doctorLocale
    let vocabulary = options["contextualStrings"] as? [String] ?? []

    let task = Task { [weak self] in
      guard let self else { return }
      do {
        // Sequential, not parallel. Halves peak memory and thermal load, and
        // there is no latency requirement post-call — the phone has usually
        // just finished a video call and is already warm.
        let doctorSegments = try await CallTranscriptionEngine.transcribe(
          fileURL: URL(fileURLWithPath: doctorPath),
          speaker: .doctor,
          localeIdentifier: doctorLocale,
          contextualStrings: vocabulary,
          onProgress: { [weak self] fraction in
            self?.emitProgress(jobId: jobId, speaker: .doctor, fraction: fraction * 0.5)
          }
        )

        let patientSegments = try await CallTranscriptionEngine.transcribe(
          fileURL: URL(fileURLWithPath: patientPath),
          speaker: .patient,
          localeIdentifier: patientLocale,
          contextualStrings: vocabulary,
          onProgress: { [weak self] fraction in
            self?.emitProgress(jobId: jobId, speaker: .patient, fraction: 0.5 + fraction * 0.5)
          }
        )

        if Task.isCancelled {
          reject("cancelled", "Transcription was cancelled", nil)
          return
        }

        // Both files share one wall-clock timeline (CallAudioRecorder pads
        // silence to keep them aligned), so a plain sort interleaves the two
        // speakers into a readable conversation.
        let merged = (doctorSegments + patientSegments)
          .sorted { $0.startMs < $1.startMs }
          .map { $0.asDictionary }

        resolve(["jobId": jobId, "segments": merged])
      } catch {
        reject("transcribe_failed", error.localizedDescription, error)
      }
      self.queue.async { self.activeJobs[jobId] = nil }
    }

    queue.async { self.activeJobs[jobId] = task }
  }

  @objc(cancelTranscription:resolve:rejecter:)
  func cancelTranscription(
    _ jobId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    queue.async {
      self.activeJobs[jobId]?.cancel()
      self.activeJobs[jobId] = nil
      resolve(["cancelled": true])
    }
  }

  // MARK: - Live transcription

  private func isLiveRunning() -> Bool {
    guard #available(iOS 26.0, *) else { return false }
    return (liveTranscription as? CallLiveTranscription)?.isRunning ?? false
  }

  @objc(startLiveTranscription:resolve:rejecter:)
  func startLiveTranscription(
    _ options: NSDictionary,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 26.0, *) else {
      return reject("unsupported_os", "Requires iOS 26 or later", nil)
    }
    if recorder.isRecording {
      return reject(
        "recording_active",
        "A recording is running; stop it before live transcription",
        nil
      )
    }

    let doctorLocale = options["doctorLocale"] as? String ?? "en-US"
    let patientLocale = options["patientLocale"] as? String ?? doctorLocale
    let vocabulary = options["contextualStrings"] as? [String] ?? []

    let live = (liveTranscription as? CallLiveTranscription) ?? CallLiveTranscription()
    liveTranscription = live

    Task { [weak self] in
      do {
        try await live.start(
          doctorLocale: doctorLocale,
          patientLocale: patientLocale,
          contextualStrings: vocabulary
        ) { segment in
          self?.emitLiveSegment(segment)
        }
        self?.startStatsTimer()
        resolve(["started": true])
      } catch {
        reject("live_failed", error.localizedDescription, error)
      }
    }
  }

  @objc(stopLiveTranscription:rejecter:)
  func stopLiveTranscription(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard #available(iOS 26.0, *) else { return resolve(["stopped": true]) }
    stopStatsTimer()
    guard let live = liveTranscription as? CallLiveTranscription else {
      return resolve(["stopped": true])
    }
    Task {
      await live.stop()
      resolve(["stopped": true])
    }
  }

  @available(iOS 26.0, *)
  private func emitLiveSegment(_ segment: CallLiveTranscription.LiveSegment) {
    guard hasListeners else { return }
    sendEvent(
      withName: "onLiveSegment",
      body: [
        "id": "\(segment.speaker.rawValue)-\(segment.startMs)",
        "speaker": segment.speaker.rawValue,
        "text": segment.text,
        "startMs": segment.startMs,
        "endMs": segment.endMs,
        "isFinal": segment.isFinal,
      ]
    )
  }

  // MARK: - Stats

  private func emitProgress(jobId: String, speaker: CallAudioStream, fraction: Double) {
    guard hasListeners else { return }
    sendEvent(
      withName: "onTranscriptionProgress",
      body: ["jobId": jobId, "speaker": speaker.rawValue, "fraction": fraction]
    )
  }

  private func startStatsTimer() {
    stopStatsTimer()
    let timer = DispatchSource.makeTimerSource(queue: queue)
    timer.schedule(deadline: .now() + 1.0, repeating: 1.0)
    timer.setEventHandler { [weak self] in self?.emitStats() }
    timer.resume()
    statsTimer = timer
  }

  private func stopStatsTimer() {
    statsTimer?.cancel()
    statsTimer = nil
  }

  private func emitStats() {
    let doctor = CallAudioCapture.shared.takeStats(.doctor)
    let patient = CallAudioCapture.shared.takeStats(.patient)

    // Logged as well as evented: if a stream is silent, the device console is
    // the fastest way to tell whether audio is arriving at all.
    NSLog(
      "[CallAudio] doctor %d cb/s rms=%.4f %.0fHz | patient %d cb/s rms=%.4f %.0fHz",
      doctor.callbacks, doctor.rms, doctor.sampleRate,
      patient.callbacks, patient.rms, patient.sampleRate
    )

    guard hasListeners else { return }
    sendEvent(
      withName: "onCallAudioStats",
      body: [
        "doctor": statsDictionary(doctor),
        "patient": statsDictionary(patient),
      ]
    )
  }

  private func statsDictionary(_ stats: CallAudioStats) -> [String: Any] {
    [
      "callbacks": stats.callbacks,
      "frames": stats.frames,
      "droppedFrames": stats.droppedFrames,
      "rms": stats.rms,
      "sampleRate": stats.sampleRate,
      "channels": stats.channels,
    ]
  }
}
