import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import UserNotifications
import livekit_react_native

@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    print("🚀 [AppDelegate] didFinishLaunchingWithOptions called")

    // MUST run before the React Native factory builds WebRTCModule. setup()
    // installs LKAudioProcessingManager as WebRTCModuleOptions.audioProcessingModule,
    // which WebRTCModule reads once when it creates the peer connection factory.
    // Without this the manager is an orphan: addLocalAudioRenderer:/
    // addRemoteAudioRenderer: still compile and run but deliver zero callbacks.
    // It also installs the simulcast video encoder factory.
    LivekitReactNative.setup()
    print("🎥 [AppDelegate] LiveKit audio processing + simulcast encoder installed")

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "FajrEMR",
      in: window,
      launchOptions: launchOptions
    )

    // PushKit + CallKit for staff calls.
    //
    // Started here, NOT from JS, and deliberately unlike the APNs registration
    // below. iOS requires that every VoIP push reports an incoming call to
    // CallKit before the push's completion handler returns; on a cold launch
    // the RN bridge takes 1–3s to come up, which is far too late. The registry
    // and provider therefore have to exist before JS does.
    //
    // JS still learns about calls — StaffCallManager queues events and drains
    // them once the emitter attaches. See StaffCallKit.swift.
    StaffCallManager.shared.start()
    print("📞 [AppDelegate] PushKit + CallKit initialised for staff calls")

    // Configure push notifications
    print("📱 [AppDelegate] Setting up push notifications...")
    UNUserNotificationCenter.current().delegate = self

    // Check if running on real device or simulator
    #if targetEnvironment(simulator)
    print("⚠️ [AppDelegate] Running on SIMULATOR - APNs tokens may not work")
    #else
    print("✅ [AppDelegate] Running on REAL DEVICE - APNs should work")
    #endif

    // NOTE: We NO LONGER call registerForRemoteNotifications() here automatically.
    // This was causing a race condition where the token would be delivered before
    // React Native JS was ready to receive it. Instead, the JS side will call
    // registerForRemoteNotifications() when it sets up its event listeners.
    // See PushNotificationService.ts for the JS-side registration flow.
    print("ℹ️ [AppDelegate] Deferring registerForRemoteNotifications() to JS side")

    // Check if already registered (from a previous app session)
    if application.isRegisteredForRemoteNotifications {
      print("✅ [AppDelegate] App is already registered for remote notifications from previous session")
    } else {
      print("⏳ [AppDelegate] App is NOT yet registered for remote notifications (will register from JS)")
    }

    return true
  }

  // MARK: - Push Notification Delegate Methods

  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    // Convert token to string for logging
    let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
    let token = tokenParts.joined()

    print("✅✅✅ [AppDelegate] didRegisterForRemoteNotificationsWithDeviceToken CALLED! ✅✅✅")
    print("📱 [AppDelegate] APNs Device Token: \(token)")
    print("📏 [AppDelegate] Token length: \(token.count)")
    print("🔍 [AppDelegate] Token preview: \(String(token.prefix(20)))...")

    #if targetEnvironment(simulator)
    print("⚠️ [AppDelegate] This is a SIMULATOR token (will not work in production)")
    #else
    print("✅ [AppDelegate] This is a REAL DEVICE token (production-ready)")
    #endif

    // Store token in APNsDiagnostics for retrieval by JS
    // JS polls via getLastDeliveredToken() after calling forceRegisterForRemoteNotifications()
    APNsDiagnostics.storeDeliveredToken(token)
  }

  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("❌❌❌ [AppDelegate] didFailToRegisterForRemoteNotificationsWithError CALLED! ❌❌❌")
    print("❌ [AppDelegate] Failed to register for remote notifications")
    print("❌ [AppDelegate] Error: \(error.localizedDescription)")
    print("❌ [AppDelegate] Full error: \(error)")

    // Check for specific error types
    let nsError = error as NSError
    print("❌ [AppDelegate] Error domain: \(nsError.domain)")
    print("❌ [AppDelegate] Error code: \(nsError.code)")

    if nsError.domain == "NSCocoaErrorDomain" {
      print("⚠️ [AppDelegate] This is a Cocoa error - possible entitlements issue")
    }

    #if targetEnvironment(simulator)
    print("⚠️ [AppDelegate] Note: Simulators may not support APNs properly")
    #endif

  }

  func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    print("📱 [AppDelegate] Received remote notification: \(userInfo)")
    completionHandler(.newData)
  }

  // MARK: - UNUserNotificationCenterDelegate

  func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    print("📱 [AppDelegate] willPresent notification: \(notification.request.content.userInfo)")

    // Show notification even when app is in foreground
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .badge, .sound])
    } else {
      completionHandler([.alert, .badge, .sound])
    }
  }

  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
    print("📱 [AppDelegate] didReceive notification response: \(response.notification.request.content.userInfo)")

    // Post notification for app-level handling
    let userInfo = response.notification.request.content.userInfo
    NotificationCenter.default.post(
      name: Notification.Name("didReceiveNotificationResponse"),
      object: nil,
      userInfo: userInfo
    )

    completionHandler()
  }

}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    // Rock/Repack bundler - use explicit URL for better debugging
    let bundleURL = URL(string: "http://localhost:8081/index.bundle?platform=ios&dev=true&minify=false")
    print("📦 [AppDelegate] Debug Bundle URL: \(bundleURL?.absoluteString ?? "nil")")
    return bundleURL
#else
    // Production - embedded bundle
    let bundleURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    print("📦 [AppDelegate] Production Bundle URL: \(bundleURL?.absoluteString ?? "nil")")
    return bundleURL
#endif
  }
}