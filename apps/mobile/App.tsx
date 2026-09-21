import React, { useState, useEffect, useCallback } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Dimensions,
  useColorScheme,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DeviceInfo from 'react-native-device-info';
import { initExecutorch } from 'react-native-executorch';
import { BareResourceFetcher } from 'react-native-executorch-bare-resource-fetcher';

import { DatabaseProvider } from './src/contexts/DatabaseContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { AdminProvider } from './src/contexts/AdminContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { TabBarVisibilityProvider } from './src/contexts/TabBarVisibilityContext';
import { DownloadProgressProvider } from './src/contexts/DownloadProgressContext';
import { TranscriptionJobsProvider } from './src/contexts/TranscriptionJobsContext';
import { BottomSheetManagerProvider } from './src/contexts/BottomSheetManagerContext';
import { PowerSyncProvider } from './src/hooks/powersync/usePowerSync';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { LoadingScreen } from './src/components/ui/LoadingScreen';
import { MainNavigator, SessionUser } from './src/navigation/MainNavigator';
import { authService } from './src/services/AuthService';
import { getBaseUrl, getApiUrl } from './src/config';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/signup/SignupScreen';
import WaitingRoomScreen from './src/screens/WaitingRoomScreen';
import { ToastProvider } from './src/hooks/useToast';
import { pushNotificationService } from './src/services/PushNotificationService';
import { useIsDarkMode } from './src/contexts/ThemeContext';

/** StatusBar that auto-switches barStyle based on system theme */
const ThemedStatusBar = () => {
  const isDark = useIsDarkMode();
  return <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />;
};

// Debug logging for app initialization
console.log('📱 [App] Module loading...');

// Note: initExecutorch() moved from module scope to useEffect inside App component.
// Module-scope native calls run before RN's bridge is fully initialized, which
// can cause SIGABRT under RN 0.84's new architecture.

// Log device information at app startup
(async () => {
  console.log('════════════════════════════════════════════════════════');
  console.log('📱 [App] DEVICE INFORMATION AT STARTUP');
  console.log('════════════════════════════════════════════════════════');
  console.log('Platform:', Platform.OS);
  console.log('Device Model:', await DeviceInfo.getModel());
  console.log('Device Name:', await DeviceInfo.getDeviceName());
  console.log('Device ID (UDID):', await DeviceInfo.getUniqueId());
  console.log('Is Physical Device:', (await DeviceInfo.isEmulator()) ? 'NO (Simulator/Emulator) ⚠️' : 'YES ✅');
  console.log('System Version:', DeviceInfo.getSystemVersion());
  console.log('Brand:', DeviceInfo.getBrand());
  console.log('Bundle ID:', DeviceInfo.getBundleId());
  console.log('App Version:', DeviceInfo.getVersion());
  console.log('Build Number:', DeviceInfo.getBuildNumber());
  console.log('════════════════════════════════════════════════════════');
})();

// Validate critical modules are loaded
const validateModules = () => {
  const criticalModules = {
    React: React,
    SafeAreaProvider: SafeAreaProvider,
    GestureHandlerRootView: GestureHandlerRootView,
    QueryClient: QueryClient,
    ErrorBoundary: ErrorBoundary,
    MainNavigator: MainNavigator,
  };

  const missing = Object.entries(criticalModules)
    .filter(([_name, module]) => !module)
    .map(([name]) => name);

  if (missing.length > 0) {
    console.error('❌ [App] Missing critical modules:', missing);
    throw new Error(`Critical modules not loaded: ${missing.join(', ')}`);
  }

  console.log('✅ [App] All critical modules validated');
};

try {
  validateModules();
} catch (error) {
  console.error('❌ [App] Module validation failed:', error);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function App() {
  const colorScheme = useColorScheme();
  const isDarkRoot = colorScheme === 'dark';
  const rootBg = isDarkRoot ? '#0A0A0A' : '#F8F9FA';

  // Initialize ExecuTorch after the component mounts (bridge is ready)
  useEffect(() => {
    try {
      initExecutorch({ resourceFetcher: BareResourceFetcher });
      console.log('✅ [App] ExecuTorch initialized');
    } catch (err) {
      console.warn('⚠️ [App] ExecuTorch init failed (non-fatal):', err);
    }
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [initError, setInitError] = useState<Error | null>(null);
  const [isNavigatorReady, setIsNavigatorReady] = useState(false);
  const [_authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
  // Keep signup mounted during exit animation so it can slide back down
  const [signupMounted, setSignupMounted] = useState(false);
  const signupTranslateY = useSharedValue(Dimensions.get('window').height);

  const signupAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: signupTranslateY.value }],
  }));

  const handleNavigateToSignup = useCallback(() => {
    setSignupMounted(true);
    setAuthScreen('signup');
    signupTranslateY.value = Dimensions.get('window').height;
    signupTranslateY.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [signupTranslateY]);

  const handleBackToLogin = useCallback(() => {
    const screenH = Dimensions.get('window').height;
    signupTranslateY.value = withTiming(screenH, {
      duration: 350,
      easing: Easing.in(Easing.cubic),
    }, () => {
      runOnJS(setAuthScreen)('login');
      runOnJS(setSignupMounted)(false);
    });
  }, [signupTranslateY]);

  // WaitingRoom slide-up overlay (same pattern as signup)
  const [waitingRoomOverlay, setWaitingRoomOverlay] = useState(false);
  const waitingRoomTranslateY = useSharedValue(Dimensions.get('window').height);

  const waitingRoomAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: waitingRoomTranslateY.value }],
  }));

  const finalizeWaitingRoom = useCallback(() => {
    setIsAuthenticated(true);
    setInitError(null);
    setWaitingRoomOverlay(false);
    setSignupMounted(false);
  }, []);

  // Restore session on app launch
  const restoreSession = useCallback(async () => {
    console.log('🚀 App starting - checking for saved session...');
    console.log('🌐 Current API URL:', getApiUrl());
    console.log('🌐 Current Base URL:', getBaseUrl());
    setInitError(null);
    setIsRestoringSession(true);

    // Add safety check for auth service
    if (!authService || !authService.setBaseUrl) {
      console.error('❌ AuthService not properly initialized');
      setInitError(new Error('Authentication service not available'));
      setIsRestoringSession(false);
      return;
    }

    // Set the base URL for auth service
    authService.setBaseUrl(getBaseUrl());

    try {
      const result = await authService.restoreSession();

      if (result.success && result.user) {
        console.log('✅ Session restored successfully:', result.user.email);

        // Validate user object has required properties
        if (!result.user.id || !result.user.email) {
          console.error('❌ Invalid user object received:', result.user);
          throw new Error('Invalid user data');
        }

        setCurrentUser(result.user);
        setIsAuthenticated(true);

        // Initialize push notifications for authenticated user with longer delay
        setTimeout(() => {
          if (pushNotificationService && pushNotificationService.initialize) {
            pushNotificationService.initialize().catch(error => {
              console.error('Failed to initialize push notifications:', error);
            });
          }
        }, 3000); // Further increased delay to ensure app is fully loaded
      } else {
        console.log('ℹ️ No valid session to restore:', result.error);
      }
    } catch (error) {
      console.error('❌ Error during session restoration:', error);
      setInitError(error as Error);
    } finally {
      setIsRestoringSession(false);
    }
  }, []);

  useEffect(() => {
    // Add a small delay before starting session restoration
    const initTimer = setTimeout(() => {
      restoreSession();
    }, 100);

    return () => clearTimeout(initTimer);
  }, [restoreSession]);

  // Delay navigator readiness to avoid race conditions
  useEffect(() => {
    if (isAuthenticated && currentUser && !isRestoringSession) {
      // Validate current user before setting navigator ready
      if (!currentUser.id || !currentUser.email) {
        console.error('❌ [App] Invalid currentUser state:', currentUser);
        setInitError(new Error('Invalid user session'));
        return;
      }

      const timer = setTimeout(() => {
        console.log('📱 [App] Setting navigator ready after delay');
        setIsNavigatorReady(true);
      }, 800); // Increased delay for better stability

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, currentUser, isRestoringSession]);

  const handleLoginSuccess = (user: SessionUser) => {
    console.log('User logged in:', user);

    if (user.authorized === false) {
      // Unauthorized: slide WaitingRoom up over the current screen
      setCurrentUser(user);
      setWaitingRoomOverlay(true);
      waitingRoomTranslateY.value = Dimensions.get('window').height;
      waitingRoomTranslateY.value = withTiming(0, {
        duration: 400,
        easing: Easing.out(Easing.cubic),
      }, () => {
        runOnJS(finalizeWaitingRoom)();
      });
      return;
    }

    setCurrentUser(user);
    setIsAuthenticated(true);
    setInitError(null);

    // Delay navigator readiness for new login
    setTimeout(() => {
      setIsNavigatorReady(true);
    }, 500);
  };

  const handleLogout = async () => {
    console.log('🔓 Logging out...');
    setIsNavigatorReady(false);
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
    setInitError(null);
    setAuthScreen('login');
    setSignupMounted(false);
    setWaitingRoomOverlay(false);
  };

  // Handle when user gets approved (called from WaitingRoom)
  const handleApprovalGranted = useCallback(() => {
    console.log('✅ [App] User approved! Updating state...');
    if (currentUser) {
      // Update the user's authorized status
      setCurrentUser({ ...currentUser, authorized: true });
    }
    // The MainNavigator will now render since authorized is true
  }, [currentUser]);

  // Determine if the app is still loading (session restore or navigator init)
  const isAppLoading = isRestoringSession || (isAuthenticated && currentUser && !isNavigatorReady);
  const loadingMessage = isRestoringSession ? 'Restoring session...' : 'Preparing workspace...';

  // Show error screen if initialization failed
  if (initError) {
    return (
      <ErrorBoundary>
        <GestureHandlerRootView style={[styles.container, { backgroundColor: rootBg }]}>
          <SafeAreaProvider>
            <View style={[styles.errorContainer, { backgroundColor: rootBg }]}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>Initialization Error</Text>
              <Text style={styles.errorMessage}>
                {initError.message || 'Failed to initialize the app'}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={restoreSession}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    );
  }

  console.log(
    '📱 [App] Rendering, authenticated:',
    isAuthenticated,
    'user:',
    currentUser?.email,
    'navigatorReady:',
    isNavigatorReady,
  );

  return (
    <ErrorBoundary
      fallback={(error, resetError) => (
        <GestureHandlerRootView style={[styles.container, { backgroundColor: rootBg }]}>
          <SafeAreaProvider>
            <View style={[styles.errorContainer, { backgroundColor: rootBg }]}>
              <Text style={styles.errorIcon}>💥</Text>
              <Text style={styles.errorTitle}>App Crashed</Text>
              <Text style={styles.errorMessage}>
                {error.message || 'An unexpected error occurred'}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={resetError}>
                <Text style={styles.retryButtonText}>Restart App</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      )}
    >
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={[styles.container, { backgroundColor: rootBg }]}>
          <SafeAreaProvider>
            <ThemeProvider>
              <ToastProvider>
                <AuthProvider>
                  <DatabaseProvider>
                    <PowerSyncProvider>
                      <AdminProvider>
                        <DownloadProgressProvider>
                        <TranscriptionJobsProvider>
                        <TabBarVisibilityProvider>
                          <BottomSheetManagerProvider>
                          <BottomSheetModalProvider>
                          <ThemedStatusBar />
                          {(() => {
                        try {
                          // Check if user is authenticated but not yet approved
                          if (
                            isAuthenticated &&
                            currentUser &&
                            currentUser.authorized === false
                          ) {
                            console.log(
                              '📱 [App] Rendering WaitingRoomScreen for unapproved user:',
                              currentUser.email,
                            );
                            return (
                              <WaitingRoomScreen
                                user={currentUser}
                                onLogout={handleLogout}
                                onApproved={handleApprovalGranted}
                              />
                            );
                          }

                          if (
                            isAuthenticated &&
                            currentUser &&
                            isNavigatorReady
                          ) {
                            console.log(
                              '📱 [App] Rendering MainNavigator for:',
                              currentUser.email,
                            );
                            console.log(
                              '📱 [App] About to render <MainNavigator> with user.id:',
                              currentUser.id,
                            );

                            // Final validation before rendering
                            if (!MainNavigator) {
                              throw new Error(
                                'MainNavigator component not available',
                              );
                            }

                            const nav = (
                              <MainNavigator
                                user={currentUser}
                                onLogout={handleLogout}
                              />
                            );
                            console.log(
                              '📱 [App] MainNavigator element created',
                            );
                            return nav;
                          } else if (!isAuthenticated) {
                            console.log('📱 [App] Rendering LoginScreen');

                            if (!LoginScreen) {
                              throw new Error(
                                'LoginScreen component not available',
                              );
                            }

                            return (
                              <View style={StyleSheet.absoluteFill}>
                                <LoginScreen
                                  onLoginSuccess={handleLoginSuccess}
                                  onNavigateToSignup={handleNavigateToSignup}
                                />
                                {signupMounted && (
                                  <Animated.View style={[StyleSheet.absoluteFill, signupAnimatedStyle]}>
                                    <SignupScreen
                                      onSignupComplete={handleLoginSuccess}
                                      onBackToLogin={handleBackToLogin}
                                    />
                                  </Animated.View>
                                )}
                                {waitingRoomOverlay && currentUser && (
                                  <Animated.View style={[StyleSheet.absoluteFill, waitingRoomAnimatedStyle]}>
                                    <WaitingRoomScreen
                                      user={currentUser}
                                      onLogout={handleLogout}
                                      onApproved={handleApprovalGranted}
                                    />
                                  </Animated.View>
                                )}
                              </View>
                            );
                          } else {
                            // This shouldn't happen but just in case
                            console.log(
                              '📱 [App] In unexpected state, showing loading',
                            );
                            return <LoadingScreen visible={true} message="Loading..." />;
                          }
                        } catch (renderError) {
                          console.error(
                            '❌ [App] Error during render:',
                            renderError,
                          );
                          return (
                            <View style={[styles.errorContainer, { backgroundColor: rootBg }]}>
                              <Text style={styles.errorIcon}>⚠️</Text>
                              <Text style={styles.errorTitle}>
                                Render Error
                              </Text>
                              <Text style={styles.errorMessage}>
                                {renderError instanceof Error
                                  ? renderError.message
                                  : 'Failed to render navigation'}
                              </Text>
                              <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => {
                                  setIsNavigatorReady(false);
                                  setTimeout(
                                    () => setIsNavigatorReady(true),
                                    500,
                                  );
                                }}
                              >
                                <Text style={styles.retryButtonText}>
                                  Try Again
                                </Text>
                              </TouchableOpacity>
                            </View>
                          );
                        }
                          })()}
                          <LoadingScreen
                            visible={!!isAppLoading}
                            message={loadingMessage}
                          />
                          </BottomSheetModalProvider>
                          </BottomSheetManagerProvider>
                        </TabBarVisibilityProvider>
                        </TranscriptionJobsProvider>
                        </DownloadProgressProvider>
                      </AdminProvider>
                    </PowerSyncProvider>
                  </DatabaseProvider>
                </AuthProvider>
              </ToastProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
