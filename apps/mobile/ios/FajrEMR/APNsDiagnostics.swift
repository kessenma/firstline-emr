//
//  APNsDiagnostics.swift
//  FajrEMR
//
//  Native module to expose APNs diagnostics and entitlements to React Native
//

import Foundation
import UIKit
import UserNotifications
import React

@objc(APNsDiagnostics)
class APNsDiagnostics: NSObject {

  // Static storage for the last delivered token (persists across JS bridge reloads)
  private static var lastDeliveredToken: String?
  private static var lastDeliveredTokenTimestamp: Date?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    // Must be true — this module accesses UIKit APIs (UIApplication.shared)
    // which must run on the main thread. Under RN 0.84's TurboModule interop,
    // returning false causes methods to run on a background queue → SIGABRT.
    return true
  }

  // Called from AppDelegate when a token is received - stores it for later retrieval
  @objc
  static func storeDeliveredToken(_ token: String) {
    print("📱 [APNsDiagnostics] Storing delivered token: \(token.prefix(20))...")
    lastDeliveredToken = token
    lastDeliveredTokenTimestamp = Date()
  }

  // Retrieve the last delivered token (useful if token arrived before JS was ready)
  @objc
  func getLastDeliveredToken(_ resolve: @escaping RCTPromiseResolveBlock,
                             rejecter reject: @escaping RCTPromiseRejectBlock) {
    var result: [String: Any] = [:]

    if let token = APNsDiagnostics.lastDeliveredToken {
      result["token"] = token
      result["hasToken"] = true
      if let timestamp = APNsDiagnostics.lastDeliveredTokenTimestamp {
        result["deliveredAt"] = ISO8601DateFormatter().string(from: timestamp)
        result["ageSeconds"] = Date().timeIntervalSince(timestamp)
      }
    } else {
      result["token"] = NSNull()
      result["hasToken"] = false
    }

    resolve(result)
  }

  // Clear the stored token (useful after JS has processed it)
  @objc
  func clearStoredToken(_ resolve: @escaping RCTPromiseResolveBlock,
                        rejecter reject: @escaping RCTPromiseRejectBlock) {
    APNsDiagnostics.lastDeliveredToken = nil
    APNsDiagnostics.lastDeliveredTokenTimestamp = nil
    resolve(["success": true])
  }

  // Get entitlements from the app
  @objc
  func getEntitlements(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    // UIApplication.shared APIs must be called on the main thread.
    // Dispatch to main to avoid SIGABRT under TurboModule interop.
    DispatchQueue.main.async { [weak self] in
      var diagnostics: [String: Any] = [:]

      // Check for APNs entitlement
      if let entitlements = Bundle.main.object(forInfoDictionaryKey: "Entitlements") as? [String: Any] {
        diagnostics["entitlements"] = entitlements
      }

      // Check aps-environment
      let apsEnvironment = self?.getAPSEnvironment()
      diagnostics["apsEnvironment"] = apsEnvironment as Any
      diagnostics["apsEnvironmentExists"] = apsEnvironment != nil

      // Check bundle configuration
      diagnostics["bundleId"] = Bundle.main.bundleIdentifier ?? "unknown"
      diagnostics["bundleVersion"] = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
      diagnostics["buildNumber"] = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown"

      // Check if running in simulator
      #if targetEnvironment(simulator)
      diagnostics["isSimulator"] = true
      diagnostics["simulatorWarning"] = "Running on simulator - APNs tokens will not work in production"
      #else
      diagnostics["isSimulator"] = false
      #endif

      // Check device capabilities
      diagnostics["deviceModel"] = UIDevice.current.model
      diagnostics["systemVersion"] = UIDevice.current.systemVersion
      diagnostics["systemName"] = UIDevice.current.systemName

      // Check if app is registered for remote notifications (UIKit, main thread only)
      let isRegistered = UIApplication.shared.isRegisteredForRemoteNotifications
      diagnostics["isRegisteredForRemoteNotifications"] = isRegistered

      resolve(diagnostics)
    }
  }

  // Check notification authorization status
  @objc
  func getNotificationAuthorizationStatus(_ resolve: @escaping RCTPromiseResolveBlock,
                                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      var statusInfo: [String: Any] = [:]

      // Authorization status
      let authStatus: String
      switch settings.authorizationStatus {
      case .notDetermined:
        authStatus = "notDetermined"
      case .denied:
        authStatus = "denied"
      case .authorized:
        authStatus = "authorized"
      case .provisional:
        authStatus = "provisional"
      case .ephemeral:
        authStatus = "ephemeral"
      @unknown default:
        authStatus = "unknown"
      }
      statusInfo["authorizationStatus"] = authStatus

      // Alert setting
      let alertSetting: String
      switch settings.alertSetting {
      case .enabled:
        alertSetting = "enabled"
      case .disabled:
        alertSetting = "disabled"
      case .notSupported:
        alertSetting = "notSupported"
      @unknown default:
        alertSetting = "unknown"
      }
      statusInfo["alertSetting"] = alertSetting

      // Badge setting
      let badgeSetting: String
      switch settings.badgeSetting {
      case .enabled:
        badgeSetting = "enabled"
      case .disabled:
        badgeSetting = "disabled"
      case .notSupported:
        badgeSetting = "notSupported"
      @unknown default:
        badgeSetting = "unknown"
      }
      statusInfo["badgeSetting"] = badgeSetting

      // Sound setting
      let soundSetting: String
      switch settings.soundSetting {
      case .enabled:
        soundSetting = "enabled"
      case .disabled:
        soundSetting = "disabled"
      case .notSupported:
        soundSetting = "notSupported"
      @unknown default:
        soundSetting = "unknown"
      }
      statusInfo["soundSetting"] = soundSetting

      // Lock screen setting
      let lockScreenSetting: String
      switch settings.lockScreenSetting {
      case .enabled:
        lockScreenSetting = "enabled"
      case .disabled:
        lockScreenSetting = "disabled"
      case .notSupported:
        lockScreenSetting = "notSupported"
      @unknown default:
        lockScreenSetting = "unknown"
      }
      statusInfo["lockScreenSetting"] = lockScreenSetting

      // Notification center setting
      let notificationCenterSetting: String
      switch settings.notificationCenterSetting {
      case .enabled:
        notificationCenterSetting = "enabled"
      case .disabled:
        notificationCenterSetting = "disabled"
      case .notSupported:
        notificationCenterSetting = "notSupported"
      @unknown default:
        notificationCenterSetting = "unknown"
      }
      statusInfo["notificationCenterSetting"] = notificationCenterSetting

      // Critical alert setting (iOS 12+)
      if #available(iOS 12.0, *) {
        let criticalAlertSetting: String
        switch settings.criticalAlertSetting {
        case .enabled:
          criticalAlertSetting = "enabled"
        case .disabled:
          criticalAlertSetting = "disabled"
        case .notSupported:
          criticalAlertSetting = "notSupported"
        @unknown default:
          criticalAlertSetting = "unknown"
        }
        statusInfo["criticalAlertSetting"] = criticalAlertSetting
      }

      // Show previews setting (iOS 11+)
      if #available(iOS 11.0, *) {
        let showPreviewsSetting: String
        switch settings.showPreviewsSetting {
        case .always:
          showPreviewsSetting = "always"
        case .whenAuthenticated:
          showPreviewsSetting = "whenAuthenticated"
        case .never:
          showPreviewsSetting = "never"
        @unknown default:
          showPreviewsSetting = "unknown"
        }
        statusInfo["showPreviewsSetting"] = showPreviewsSetting
      }

      resolve(statusInfo)
    }
  }

  // Force re-register for remote notifications
  @objc
  func forceRegisterForRemoteNotifications(_ resolve: @escaping RCTPromiseResolveBlock,
                                          rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      print("🔄 [APNsDiagnostics] Force registering for remote notifications...")
      UIApplication.shared.registerForRemoteNotifications()

      // Check registration status after a short delay
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
        let isRegistered = UIApplication.shared.isRegisteredForRemoteNotifications
        resolve([
          "success": true,
          "isRegistered": isRegistered,
          "message": "Called registerForRemoteNotifications()"
        ])
      }
    }
  }

  // Check network connectivity to APNs
  @objc
  func checkAPNsConnectivity(_ resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    var results: [String: Any] = [:]

    // Test production APNs endpoint
    let prodUrl = URL(string: "https://api.push.apple.com")!
    self.testConnection(url: prodUrl) { [weak self] success, latency, error in
      results["production"] = [
        "reachable": success,
        "latency": latency,
        "error": error ?? NSNull()
      ]

      // Test development APNs endpoint
      let devUrl = URL(string: "https://api.development.push.apple.com")!
      self?.testConnection(url: devUrl) { success, latency, error in
        results["development"] = [
          "reachable": success,
          "latency": latency,
          "error": error ?? NSNull()
        ]

        resolve(results)
      }
    }
  }

  // MARK: - Private Helper Methods

  private func getAPSEnvironment() -> String? {
    // Read aps-environment from the embedded provisioning profile
    // At runtime, entitlements are embedded in the app signature, not as separate files

    guard let provisioningPath = Bundle.main.path(forResource: "embedded", ofType: "mobileprovision"),
          let provisioningData = try? Data(contentsOf: URL(fileURLWithPath: provisioningPath)) else {
      // No embedded.mobileprovision = likely running from Xcode (development)
      // In this case, infer from DEBUG flag
      #if DEBUG
      return "development"
      #else
      // App Store builds don't include embedded.mobileprovision
      // If we're getting APNs tokens, production is working
      if UIApplication.shared.isRegisteredForRemoteNotifications {
        return "production"
      }
      return nil
      #endif
    }

    // Parse the provisioning profile to extract aps-environment
    // The profile is a signed plist wrapped in CMS, we need to extract the plist portion
    guard let provisioningString = String(data: provisioningData, encoding: .ascii) else {
      return nil
    }

    // Find the plist content between <?xml and </plist>
    guard let startRange = provisioningString.range(of: "<?xml"),
          let endRange = provisioningString.range(of: "</plist>") else {
      return nil
    }

    let plistString = String(provisioningString[startRange.lowerBound...endRange.upperBound])
    guard let plistData = plistString.data(using: .utf8),
          let plist = try? PropertyListSerialization.propertyList(from: plistData, options: [], format: nil) as? [String: Any] else {
      return nil
    }

    // Check Entitlements dictionary in the provisioning profile
    if let entitlements = plist["Entitlements"] as? [String: Any],
       let apsEnvironment = entitlements["aps-environment"] as? String {
      return apsEnvironment
    }

    // Fallback: infer from DEBUG flag if entitlements not found
    #if DEBUG
    return "development"
    #else
    return UIApplication.shared.isRegisteredForRemoteNotifications ? "production" : nil
    #endif
  }

  private func testConnection(url: URL, completion: @escaping (Bool, Double, String?) -> Void) {
    let startTime = Date()

    var request = URLRequest(url: url)
    request.httpMethod = "HEAD"
    request.timeoutInterval = 5.0

    let task = URLSession.shared.dataTask(with: request) { _, response, error in
      let latency = Date().timeIntervalSince(startTime) * 1000 // Convert to ms

      if let error = error {
        completion(false, latency, error.localizedDescription)
      } else if let httpResponse = response as? HTTPURLResponse {
        // APNs typically returns 400 for HEAD requests, which is fine - it means we reached it
        let success = httpResponse.statusCode >= 200 && httpResponse.statusCode < 500
        completion(success, latency, nil)
      } else {
        completion(false, latency, "No response")
      }
    }

    task.resume()
  }
}
