//
//  NativeSpeechRecognitionModule.swift
//  FajrEMR
//
//  On-device streaming speech recognition via SFSpeechRecognizer.
//  Features:
//  - Streaming partial results emitted to JS as they arrive
//  - Auto-restart at ~55s to work around Apple's ~60s recognition limit
//  - Medical vocabulary hints via contextualStrings
//  - Audio level reporting for UI visualization
//  - Silence-based session end detection
//

import Foundation
import Speech
import AVFoundation
import React

@objc(NativeSpeechRecognition)
class NativeSpeechRecognition: RCTEventEmitter {

  // MARK: - Properties

  private var speechRecognizer: SFSpeechRecognizer?
  private var audioEngine: AVAudioEngine?
  private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
  private var recognitionTask: SFSpeechRecognitionTask?

  private var accumulatedText = ""
  private var currentSegmentText = ""
  private var contextualStrings: [String] = []
  private var useOnDevice = true

  // Auto-restart timer for >60s recordings
  private var restartTimer: Timer?
  private let maxSegmentDuration: TimeInterval = 55

  // Silence detection
  private var lastSpeechTimestamp: Date?
  private var silenceTimer: Timer?
  private let silenceTimeout: TimeInterval = 3.0 // seconds of silence before auto-stop

  // Audio level reporting
  private var levelTimer: Timer?
  private var currentAudioLevel: Float = 0.0

  // Stop promise (resolved when stopListening is called)
  private var stopResolve: RCTPromiseResolveBlock?
  private var isListening = false

  // Track if JS has listeners attached
  private var hasListeners = false

  // MARK: - RCTEventEmitter

  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  override func supportedEvents() -> [String]! {
    return ["onPartialResult", "onAudioLevel", "onError", "onSessionEnded"]
  }

  override func startObserving() {
    hasListeners = true
  }

  override func stopObserving() {
    hasListeners = false
  }

  // MARK: - Public API

  @objc
  func isAvailable(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
    let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    let available = recognizer?.isAvailable ?? false
    // Don't require on-device support — fall back to server-based if needed
    resolve(available)
  }

  @objc
  func requestPermission(_ resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    SFSpeechRecognizer.requestAuthorization { status in
      switch status {
      case .authorized:
        // Also check mic permission
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
          resolve(granted ? "authorized" : "mic_denied")
        }
      case .denied:
        resolve("denied")
      case .restricted:
        resolve("restricted")
      case .notDetermined:
        resolve("undetermined")
      @unknown default:
        resolve("unknown")
      }
    }
  }

  @objc
  func startListening(_ options: NSDictionary,
                       resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Parse options
    let locale = options["locale"] as? String ?? "en-US"
    useOnDevice = options["onDevice"] as? Bool ?? true
    if let strings = options["contextualStrings"] as? [String] {
      contextualStrings = strings
    }

    // Check authorization
    let authStatus = SFSpeechRecognizer.authorizationStatus()
    guard authStatus == .authorized else {
      reject("PERMISSION_DENIED", "Speech recognition not authorized (status: \(authStatus.rawValue))", nil)
      return
    }

    // Initialize recognizer
    speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: locale))
    guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
      reject("UNAVAILABLE", "Speech recognizer not available for locale \(locale)", nil)
      return
    }

    // Reset state
    accumulatedText = ""
    currentSegmentText = ""
    isListening = true

    // Start the recognition pipeline
    do {
      try startRecognitionSegment()
      resolve(nil)
    } catch {
      isListening = false
      reject("START_FAILED", "Failed to start speech recognition: \(error.localizedDescription)", error)
    }
  }

  @objc
  func stopListening(_ resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard isListening else {
      // Not listening — return whatever we have
      resolve(buildFinalText())
      return
    }

    stopResolve = resolve
    stopRecognition(reason: "stopped")
  }

  @objc
  func cancelListening(_ resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
    stopRecognition(reason: "cancelled")
    accumulatedText = ""
    currentSegmentText = ""
    resolve(nil)
  }

  // MARK: - Recognition Pipeline

  private func startRecognitionSegment() throws {
    // Set up audio session
    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetoothHFP])
    try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

    // Create audio engine
    if audioEngine == nil {
      audioEngine = AVAudioEngine()
    }
    guard let audioEngine = audioEngine else { return }

    // Create recognition request
    recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
    guard let recognitionRequest = recognitionRequest else { return }

    recognitionRequest.shouldReportPartialResults = true
    recognitionRequest.contextualStrings = contextualStrings

    // Prefer on-device recognition when available (works offline, better privacy)
    // but fall back to server-based if not supported (e.g. Simulator)
    if useOnDevice {
      recognitionRequest.requiresOnDeviceRecognition = speechRecognizer?.supportsOnDeviceRecognition ?? false
    }

    // Guard: ensure audio input is available (Simulator may not have one)
    guard audioSession.availableInputs?.isEmpty == false else {
      throw NSError(domain: "NativeSpeechRecognition", code: -1,
                    userInfo: [NSLocalizedDescriptionKey: "No audio input available. If on Simulator, the host Mac mic may be unavailable."])
    }

    // Install audio tap
    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)
    guard recordingFormat.sampleRate > 0 else {
      throw NSError(domain: "NativeSpeechRecognition", code: -2,
                    userInfo: [NSLocalizedDescriptionKey: "Audio input has invalid format (sample rate 0). Enable microphone input."])
    }

    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
      guard let self = self else { return }
      self.recognitionRequest?.append(buffer)
      self.updateAudioLevel(buffer: buffer)
    }

    // Start audio engine
    audioEngine.prepare()
    try audioEngine.start()

    // Start recognition task
    recognitionTask = speechRecognizer?.recognitionTask(with: recognitionRequest) { [weak self] result, error in
      guard let self = self else { return }

      if let result = result {
        self.currentSegmentText = result.bestTranscription.formattedString
        self.lastSpeechTimestamp = Date()

        let fullText = self.buildFinalText()
        if self.hasListeners {
          self.sendEvent(withName: "onPartialResult", body: [
            "text": fullText,
            "isFinal": result.isFinal,
          ])
        }

        if result.isFinal {
          self.commitCurrentSegment()
        }
      }

      if let error = error {
        let nsError = error as NSError
        // Error code 216 = "request was canceled" — expected during restart/stop
        // Error code 301 = "recognition request was canceled" — expected during stop
        // Error code 1110 = "no speech detected" — expected during silence
        if nsError.code != 216 && nsError.code != 301 && nsError.code != 1110 {
          if self.hasListeners {
            self.sendEvent(withName: "onError", body: [
              "code": String(nsError.code),
              "message": error.localizedDescription,
            ])
          }
        }

        // If no speech detected, treat as silence
        if nsError.code == 1110 {
          self.handleSilenceDetected()
        }
      }
    }

    // Start auto-restart timer
    restartTimer?.invalidate()
    restartTimer = Timer.scheduledTimer(withTimeInterval: maxSegmentDuration, repeats: false) { [weak self] _ in
      self?.restartRecognitionSegment()
    }

    // Start silence detection timer
    lastSpeechTimestamp = Date()
    startSilenceMonitor()

    // Start audio level reporting
    startLevelReporting()
  }

  /// Restart the recognition task without stopping the audio engine.
  /// This handles the ~60s Apple recognition limit seamlessly.
  private func restartRecognitionSegment() {
    guard isListening else { return }

    // Commit current segment text
    commitCurrentSegment()

    // Stop current recognition task (but keep audio engine running)
    recognitionTask?.cancel()
    recognitionTask = nil
    recognitionRequest?.endAudio()
    recognitionRequest = nil

    // Remove tap so we can reinstall
    audioEngine?.inputNode.removeTap(onBus: 0)

    // Start a new recognition segment
    do {
      try startRecognitionSegment()
    } catch {
      if hasListeners {
        sendEvent(withName: "onError", body: [
          "code": "RESTART_FAILED",
          "message": "Failed to restart recognition: \(error.localizedDescription)",
        ])
      }
      stopRecognition(reason: "error")
    }
  }

  private func commitCurrentSegment() {
    let trimmed = currentSegmentText.trimmingCharacters(in: .whitespacesAndNewlines)
    if !trimmed.isEmpty {
      if accumulatedText.isEmpty {
        accumulatedText = trimmed
      } else {
        accumulatedText += " " + trimmed
      }
    }
    currentSegmentText = ""
  }

  private func buildFinalText() -> String {
    let trimmed = currentSegmentText.trimmingCharacters(in: .whitespacesAndNewlines)
    if accumulatedText.isEmpty {
      return trimmed
    }
    if trimmed.isEmpty {
      return accumulatedText
    }
    return accumulatedText + " " + trimmed
  }

  // MARK: - Stop / Cleanup

  private func stopRecognition(reason: String) {
    isListening = false

    // Stop timers
    restartTimer?.invalidate()
    restartTimer = nil
    silenceTimer?.invalidate()
    silenceTimer = nil
    levelTimer?.invalidate()
    levelTimer = nil

    // Stop recognition
    recognitionTask?.cancel()
    recognitionTask = nil
    recognitionRequest?.endAudio()
    recognitionRequest = nil

    // Stop audio engine
    audioEngine?.stop()
    audioEngine?.inputNode.removeTap(onBus: 0)

    // Deactivate audio session
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)

    // Commit any remaining text
    commitCurrentSegment()

    // Emit session ended event
    if hasListeners {
      sendEvent(withName: "onSessionEnded", body: ["reason": reason])
    }

    // Resolve stop promise if pending
    if let resolve = stopResolve {
      resolve(accumulatedText)
      stopResolve = nil
    }
  }

  // MARK: - Silence Detection

  private func startSilenceMonitor() {
    silenceTimer?.invalidate()
    silenceTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
      guard let self = self, self.isListening else { return }
      guard let lastSpeech = self.lastSpeechTimestamp else { return }

      let silenceDuration = Date().timeIntervalSince(lastSpeech)
      if silenceDuration >= self.silenceTimeout {
        self.handleSilenceDetected()
      }
    }
  }

  private func handleSilenceDetected() {
    guard isListening else { return }
    stopRecognition(reason: "silence")
  }

  // MARK: - Audio Level

  private func updateAudioLevel(buffer: AVAudioPCMBuffer) {
    guard let channelData = buffer.floatChannelData?[0] else { return }
    let frameCount = Int(buffer.frameLength)
    guard frameCount > 0 else { return }

    // Calculate RMS
    var sumOfSquares: Float = 0
    for i in 0..<frameCount {
      let sample = channelData[i]
      sumOfSquares += sample * sample
    }
    let rms = sqrtf(sumOfSquares / Float(frameCount))

    // Normalize to 0-1 range with smoothing
    let normalized = min(rms * 5.0, 1.0) // Scale up for typical speech levels
    currentAudioLevel = currentAudioLevel * 0.7 + normalized * 0.3 // EMA smoothing
  }

  private func startLevelReporting() {
    levelTimer?.invalidate()
    levelTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
      guard let self = self, self.hasListeners, self.isListening else { return }
      self.sendEvent(withName: "onAudioLevel", body: [
        "level": self.currentAudioLevel,
      ])
    }
  }
}
