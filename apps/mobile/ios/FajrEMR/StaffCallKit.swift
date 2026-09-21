//
//  StaffCallKit.swift
//  FajrEMR
//
//  PushKit + CallKit for staff-to-staff audio calls.
//
//  The hard constraint that shapes this whole file: iOS requires that EVERY
//  PushKit VoIP push results in a call to `reportNewIncomingCall` before the
//  push's completion handler returns — including pushes that merely cancel a
//  ring. Miss it once and iOS terminates the app; miss it repeatedly and iOS
//  stops delivering VoIP pushes to the app entirely.
//
//  That is why the receive path is 100% native and does not touch the React
//  Native bridge. On a cold launch the bridge takes 1–3 seconds to come up,
//  which is far past the deadline. JS is told about the call afterwards, by
//  draining `pendingEvents` once the emitter attaches.
//
//  Split in two on purpose:
//    - StaffCallManager is a plain singleton owned by AppDelegate, so PushKit
//      is live from `didFinishLaunching` regardless of whether JS ever starts.
//    - StaffCallKit is the RCTEventEmitter. React Native instantiates it on its
//      own schedule, so it must never be on the critical path.
//

import Foundation
import AVFoundation
import CallKit
import PushKit
import React
import livekit_react_native_webrtc

// MARK: - Manager (native critical path)

@objc(StaffCallManager)
public final class StaffCallManager: NSObject {

  @objc public static let shared = StaffCallManager()

  private var provider: CXProvider?
  private var callController = CXCallController()
  private var pushRegistry: PKPushRegistry?

  /// Hex APNs PushKit token, once PushKit hands it to us.
  private(set) var voipToken: String?

  /// Calls we have reported and not yet ended, keyed by call uuid.
  private var activeCalls: [UUID: String] = [:]

  /// Events raised before JS was listening. Drained on attach — this is what
  /// makes a cold-launch answer work.
  private var pendingEvents: [(name: String, body: [String: Any])] = []

  /// Set by the RCTEventEmitter when JS starts observing.
  weak var emitter: StaffCallKit?

  private let lock = NSLock()

  // MARK: Setup

  /// Called from AppDelegate.didFinishLaunching. Idempotent.
  @objc public func start() {
    guard provider == nil else { return }

    let config = CXProviderConfiguration()
    config.supportsVideo = false
    // 1:1 today. The server models N participants, but CallKit only ever shows
    // one entry per call and grouping is a separate feature.
    config.maximumCallsPerCallGroup = 1
    config.maximumCallGroups = 1
    // .generic because the handle is a user uuid, not a phone number or email.
    // Using .phoneNumber would make iOS offer to add it to Contacts.
    config.supportedHandleTypes = [.generic]
    config.includesCallsInRecents = false

    let provider = CXProvider(configuration: config)
    provider.setDelegate(self, queue: nil)
    self.provider = provider

    let registry = PKPushRegistry(queue: .main)
    registry.delegate = self
    registry.desiredPushTypes = [.voIP]
    self.pushRegistry = registry

    NSLog("[StaffCallKit] PushKit + CallKit initialised")
  }

  // MARK: Emitting

  /// Queues when JS is not attached yet, rather than dropping. A call answered
  /// from the lock screen on a cold launch arrives here long before JS exists.
  func emit(_ name: String, _ body: [String: Any]) {
    lock.lock()
    let target = emitter
    if target == nil {
      pendingEvents.append((name, body))
      lock.unlock()
      return
    }
    lock.unlock()
    target?.dispatch(name: name, body: body)
  }

  func drainPendingEvents() {
    lock.lock()
    let events = pendingEvents
    pendingEvents.removeAll()
    let target = emitter
    lock.unlock()

    for event in events {
      target?.dispatch(name: event.name, body: event.body)
    }
  }

  // MARK: Call lifecycle (called from JS)

  /// Tell CallKit the media path is up, so the UI stops saying "connecting".
  func reportConnected(callId: String) {
    guard let uuid = UUID(uuidString: callId), let provider else { return }
    provider.reportOutgoingCall(with: uuid, connectedAt: Date())
  }

  /// End a call locally — used when JS hangs up, or the room drops.
  func endCall(callId: String) {
    guard let uuid = UUID(uuidString: callId) else { return }
    lock.lock()
    activeCalls.removeValue(forKey: uuid)
    lock.unlock()

    // Ask CallKit via the controller rather than reportCall(endedAt:) so the
    // usual CXEndCallAction path runs and the audio session is released.
    let action = CXEndCallAction(call: uuid)
    callController.request(CXTransaction(action: action)) { error in
      if let error {
        // Already gone is the common case (both sides hung up at once) —
        // fall back to a direct report so CallKit's UI never sticks.
        NSLog("[StaffCallKit] endCall transaction failed: \(error.localizedDescription)")
        self.provider?.reportCall(with: uuid, endedAt: Date(), reason: .remoteEnded)
      }
    }
  }

  fileprivate func currentVoipToken() -> String? {
    lock.lock()
    defer { lock.unlock() }
    return voipToken
  }
}

// MARK: - PushKit

extension StaffCallManager: PKPushRegistryDelegate {

  public func pushRegistry(
    _ registry: PKPushRegistry,
    didUpdate pushCredentials: PKPushCredentials,
    for type: PKPushType
  ) {
    guard type == .voIP else { return }

    let token = pushCredentials.token.map { String(format: "%02x", $0) }.joined()
    lock.lock()
    voipToken = token
    lock.unlock()

    NSLog("[StaffCallKit] VoIP token updated (%d chars)", token.count)
    // Queued if JS is not up; PushNotificationService registers it on drain.
    emit("voipTokenReceived", ["token": token])
  }

  public func pushRegistry(
    _ registry: PKPushRegistry,
    didInvalidatePushTokenFor type: PKPushType
  ) {
    guard type == .voIP else { return }
    lock.lock()
    voipToken = nil
    lock.unlock()
    emit("voipTokenInvalidated", [:])
  }

  public func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    guard type == .voIP else {
      completion()
      return
    }

    // Payload shape is set by apps/notifications-server/voip.go.
    let call = payload.dictionaryPayload["call"] as? [String: Any] ?? [:]
    let callId = call["callId"] as? String ?? ""
    let event = call["event"] as? String ?? "invite"
    let callerName = call["callerName"] as? String ?? "Unknown caller"
    let callerId = call["callerId"] as? String ?? ""

    // A malformed push still has to report something, or iOS penalises the app.
    let uuid = UUID(uuidString: callId) ?? UUID()

    let update = CXCallUpdate()
    update.remoteHandle = CXHandle(type: .generic, value: callerId.isEmpty ? callerName : callerId)
    update.localizedCallerName = callerName
    update.hasVideo = false
    update.supportsGrouping = false
    update.supportsUngrouping = false
    update.supportsHolding = false
    update.supportsDTMF = false

    guard let provider else {
      completion()
      return
    }

    // Report unconditionally — even for `cancel`, and even for a malformed
    // payload. This is the rule that keeps VoIP push delivery alive.
    provider.reportNewIncomingCall(with: uuid, update: update) { [weak self] error in
      guard let self else {
        completion()
        return
      }

      if let error {
        NSLog("[StaffCallKit] reportNewIncomingCall failed: \(error.localizedDescription)")
        completion()
        return
      }

      if event == "cancel" {
        // We just raised a ring for a call that is already over. Tear it down
        // immediately; a brief flash is the accepted cost of the report rule.
        let reason: CXCallEndedReason
        switch call["reason"] as? String {
        case "declined": reason = .declinedElsewhere
        case "answered_elsewhere": reason = .answeredElsewhere
        case "timeout": reason = .unanswered
        default: reason = .remoteEnded
        }
        provider.reportCall(with: uuid, endedAt: Date(), reason: reason)

        self.lock.lock()
        self.activeCalls.removeValue(forKey: uuid)
        self.lock.unlock()

        self.emit("callCancelled", ["callId": callId, "reason": call["reason"] as? String ?? "canceled"])
        completion()
        return
      }

      self.lock.lock()
      self.activeCalls[uuid] = callId
      self.lock.unlock()

      self.emit("callInvite", [
        "callId": callId,
        "callerId": callerId,
        "callerName": callerName,
      ])

      completion()
    }
  }
}

// MARK: - CallKit

extension StaffCallManager: CXProviderDelegate {

  public func providerDidReset(_ provider: CXProvider) {
    lock.lock()
    activeCalls.removeAll()
    lock.unlock()
    emit("callEnded", ["callId": "", "reason": "provider_reset"])
  }

  public func provider(_ provider: CXProvider, perform action: CXAnswerCallAction) {
    lock.lock()
    let callId = activeCalls[action.callUUID] ?? action.callUUID.uuidString
    lock.unlock()

    // JS joins the LiveKit room and then calls reportConnected. Fulfilling here
    // rather than after the join keeps CallKit's own UI responsive; a slow join
    // shows "connecting" instead of freezing the answer button.
    emit("callAnswered", ["callId": callId])
    action.fulfill()
  }

  public func provider(_ provider: CXProvider, perform action: CXEndCallAction) {
    lock.lock()
    let callId = activeCalls[action.callUUID] ?? action.callUUID.uuidString
    activeCalls.removeValue(forKey: action.callUUID)
    lock.unlock()

    emit("callEnded", ["callId": callId, "reason": "user_ended"])
    action.fulfill()
  }

  public func provider(_ provider: CXProvider, perform action: CXSetMutedCallAction) {
    lock.lock()
    let callId = activeCalls[action.callUUID] ?? action.callUUID.uuidString
    lock.unlock()

    emit("callMuteChanged", ["callId": callId, "muted": action.isMuted])
    action.fulfill()
  }

  /// CallKit owns the audio session for the duration of the call. WebRTC has to
  /// be told explicitly, or the call connects with no audio in either direction.
  public func provider(_ provider: CXProvider, didActivate audioSession: AVAudioSession) {
    RTCAudioSession.sharedInstance().audioSessionDidActivate(audioSession)
    RTCAudioSession.sharedInstance().isAudioEnabled = true
  }

  public func provider(_ provider: CXProvider, didDeactivate audioSession: AVAudioSession) {
    RTCAudioSession.sharedInstance().isAudioEnabled = false
    RTCAudioSession.sharedInstance().audioSessionDidDeactivate(audioSession)
  }
}

// MARK: - React Native module

@objc(StaffCallKit)
final class StaffCallKit: RCTEventEmitter {

  override static func requiresMainQueueSetup() -> Bool { false }

  override func supportedEvents() -> [String]! {
    [
      "voipTokenReceived",
      "voipTokenInvalidated",
      "callInvite",
      "callAnswered",
      "callEnded",
      "callCancelled",
      "callMuteChanged",
    ]
  }

  override func startObserving() {
    StaffCallManager.shared.emitter = self
    // Anything that happened before JS was ready — including the answer that
    // launched the app — arrives now.
    StaffCallManager.shared.drainPendingEvents()
  }

  override func stopObserving() {
    StaffCallManager.shared.emitter = nil
  }

  /// Bridge hop used by the manager. Separate from sendEvent so the manager
  /// does not need to know about RCTEventEmitter's API.
  func dispatch(name: String, body: [String: Any]) {
    sendEvent(withName: name, body: body)
  }

  @objc(getVoipToken:rejecter:)
  func getVoipToken(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    resolve(StaffCallManager.shared.currentVoipToken())
  }

  @objc(endCall:resolver:rejecter:)
  func endCall(
    _ callId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    StaffCallManager.shared.endCall(callId: callId)
    resolve(nil)
  }

  @objc(reportConnected:resolver:rejecter:)
  func reportConnected(
    _ callId: String,
    resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    StaffCallManager.shared.reportConnected(callId: callId)
    resolve(nil)
  }
}
