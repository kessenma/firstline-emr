import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Eye, EyeOff, Fingerprint, KeyRound } from 'lucide-react-native';
import { authService } from '../services/AuthService';
import { API_CONFIG } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { TokenStorage } from '../services/TokenStorage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useOptionalToast } from '../hooks/useToast';
import { pushNotificationService } from '../services/PushNotificationService';
import { usePasskey } from '../hooks/usePasskey';
import { AnimatedGradientBackground } from '../components/ui/AnimatedGradientBackground';
import { useAppVersion } from '../hooks/useAppVersion';
import { palette, brandColors } from '../utils/colors';
import { ForgotPasswordSheet } from './forgot-password/ForgotPasswordSheet';
import { TermsDrawer } from './signup/components/TermsDrawer';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
  onNavigateToSignup?: () => void;
}

export default function LoginScreen({ onLoginSuccess, onNavigateToSignup }: LoginScreenProps) {
  // Read the active server fresh on each mount so switching servers (Settings →
  // Server) takes effect on the next login instead of using a stale import-time value.
  const BASE_URL = API_CONFIG.current.BASE_URL;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [networkDiagnostics, setNetworkDiagnostics] = useState<string>('');
  const { login } = useAuth();
  const { isSupported: passkeySupported, authenticate: passkeyAuthenticate } = usePasskey();
  const { displayVersion } = useAppVersion();
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  // 2FA state
  const [twoFAState, setTwoFAState] = useState<{
    loginToken: string;
    methods: string[];
    email: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [termsDrawerOpen, setTermsDrawerOpen] = useState(false);

  // Exit animation (login success only)
  const exitOpacity = useSharedValue(1);
  const exitTranslateY = useSharedValue(0);
  const pendingUserRef = useRef<any>(null);

  const finishLogin = useCallback(() => {
    if (pendingUserRef.current) {
      onLoginSuccess(pendingUserRef.current);
      pendingUserRef.current = null;
    }
  }, [onLoginSuccess]);

  const playExitAnimation = useCallback((user: any) => {
    pendingUserRef.current = user;
    exitOpacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    });
    exitTranslateY.value = withTiming(-60, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    }, () => {
      runOnJS(finishLogin)();
    });
  }, [exitOpacity, exitTranslateY, finishLogin]);

  const exitAnimatedStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
    transform: [{ translateY: exitTranslateY.value }],
  }));

  // ToastProvider may not be mounted yet during auth
  const toastFunction = useOptionalToast()?.toast;

  // Test network connectivity
  const testNetworkConnectivity = async () => {
    const testUrl = BASE_URL;
    try {
      setNetworkDiagnostics('Testing connection to ' + testUrl + '...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(testUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setNetworkDiagnostics('Connected! Status: ' + response.status);
    } catch (error) {
      setNetworkDiagnostics(
        'Connection failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    }
  };

  useEffect(() => {
    authService.setBaseUrl(BASE_URL);
  }, []);

  const handleLogin = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      if (toastFunction) {
        toastFunction({ title: 'Please enter both email and password', variant: 'destructive' });
      }
      return;
    }

    setIsLoading(true);

    try {
      // Attempt login via mobile auth API
      const response = await authService.login({
        email: email.trim(),
        password: password.trim(),
      });

      // Handle 2FA requirement
      if (response.requires2FA && response.loginToken) {
        console.log('🔐 2FA required, methods:', response.methods);
        setTwoFAState({
          loginToken: response.loginToken,
          methods: response.methods || ['totp'],
          email: email.trim(),
        });
        return;
      }

      if (response.requires2FASetup) {
        if (toastFunction) {
          toastFunction({
            title: response.error || 'Please set up two-factor authentication to continue.',
            variant: 'destructive',
          });
        }
        return;
      }

      if (response.success && response.user) {
        console.log('✅ Login successful:', response.user.email);

        // Tokens are now stored separately in TokenStorage by AuthService
        // Notify AuthContext to initialize PowerSync for admin users
        const powerSyncToken = TokenStorage.getPowerSyncToken();
        if (powerSyncToken) {
          console.log('[LoginScreen] Notifying AuthContext of login...');
          await login(powerSyncToken, response.user);
        } else {
          console.warn('[LoginScreen] No PowerSync token found after login');
        }

        // Initialize push notifications (will only register if token changed)
        setTimeout(() => {
          pushNotificationService.initialize().catch(err => {
            console.warn('Failed to initialize push notifications:', err);
          });
        }, 1000);

        // Play exit animation, then call onLoginSuccess
        playExitAnimation(response.user);
      } else {
        if (toastFunction) {
          toastFunction({ title: response.error || 'Invalid credentials', variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      if (toastFunction) {
        toastFunction({
          title: error instanceof Error ? error.message : 'An error occurred during login',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    // Email is optional - if not provided, uses discoverable credentials mode
    // which lets the OS show all passkeys registered for this site
    const emailValue = email.trim() || undefined;

    setPasskeyLoading(true);

    try {
      // 1. Authenticate with native passkey (Face ID / Touch ID / Fingerprint)
      // Email is optional - discoverable mode shows all passkeys for this site
      const passkeyResult = await passkeyAuthenticate(emailValue);

      if (!passkeyResult.verified || !passkeyResult.token) {
        throw new Error('Passkey authentication failed');
      }

      // 2. Use the passkey token to complete login
      // Use email from result (server looked it up from credential)
      const response = await authService.loginWithPasskeyToken(
        passkeyResult.token,
        passkeyResult.user.email,
      );

      if (response.success && response.user) {
        console.log('✅ Passkey login successful:', response.user.email);

        // Notify AuthContext to initialize PowerSync
        const powerSyncToken = TokenStorage.getPowerSyncToken();
        if (powerSyncToken) {
          await login(powerSyncToken, response.user);
        }

        // Initialize push notifications
        setTimeout(() => {
          pushNotificationService.initialize().catch(err => {
            console.warn('Failed to initialize push notifications:', err);
          });
        }, 1000);

        playExitAnimation(response.user);
      } else {
        if (toastFunction) {
          toastFunction({ title: response.error || 'Passkey authentication failed', variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('❌ Passkey login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Passkey login failed';

      // Handle user cancellation gracefully
      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
        return;
      }

      if (toastFunction) {
        toastFunction({ title: errorMessage, variant: 'destructive' });
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  // Handle 2FA TOTP verification
  const handleTotpVerify = async () => {
    if (!twoFAState || totpCode.length !== 6) return;
    setTwoFALoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/mobile-login/verify-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loginToken: twoFAState.loginToken,
          totpCode,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        if (toastFunction) {
          toastFunction({ title: data.error || 'Invalid code', variant: 'destructive' });
        }
        setTwoFALoading(false);
        return;
      }

      // Store tokens and complete login (same as normal login success)
      const authToken = data.authToken || data.token;
      if (authToken) {
        TokenStorage.setAuthToken(authToken);
      }
      if (data.powerSyncToken) {
        TokenStorage.setPowerSyncToken(data.powerSyncToken);
      }
      if (data.user) {
        TokenStorage.setUser(data.user);
        const powerSyncToken = TokenStorage.getPowerSyncToken();
        if (powerSyncToken) {
          await login(powerSyncToken, data.user);
        }
        setTimeout(() => {
          pushNotificationService.initialize().catch(() => {});
        }, 1000);
        playExitAnimation(data.user);
      }
    } catch {
      if (toastFunction) {
        toastFunction({ title: 'Failed to verify code. Please try again.', variant: 'destructive' });
      }
      setTwoFALoading(false);
    }
  };

  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${BASE_URL}/api/auth/session`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        setIsOfflineMode(!response.ok);
      } catch {
        setIsOfflineMode(true);
      }
    };

    checkNetworkStatus();
  }, []);

  return (
    <Animated.View style={[styles.container, exitAnimatedStyle]}>
      {/* Background layer */}
      <AnimatedGradientBackground />
      {/* Content layer - renders on top */}
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/fajr-triage-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Fajr Mission EMR</Text>
            <Text style={styles.subtitle}>Electronic Medical Records</Text>
          </View>

          {/* Network Status */}
          {isOfflineMode && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineText}>
                Offline Mode - Using local authentication
              </Text>
            </View>
          )}

          {/* Network Diagnostics */}
          {networkDiagnostics && (
            <View style={styles.diagnosticsBanner}>
              <Text style={styles.diagnosticsText}>{networkDiagnostics}</Text>
            </View>
          )}

          {twoFAState ? (
            <View style={styles.form}>
              <TouchableOpacity
                onPress={() => { setTwoFAState(null); setTotpCode(''); }}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
              >
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{'< Back'}</Text>
              </TouchableOpacity>

              <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={[styles.title, { fontSize: 22, marginBottom: 4 }]}>
                  Two-Factor Authentication
                </Text>
                <Text style={styles.subtitle}>
                  {twoFAState.methods.includes('totp')
                    ? 'Enter the 6-digit code from your authenticator app'
                    : 'Verify with your passkey to continue'}
                </Text>
              </View>

              {twoFAState.methods.includes('totp') && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Verification Code</Text>
                    <Input
                      placeholder="000000"
                      value={totpCode}
                      onChangeText={(text: string) => setTotpCode(text.replace(/\D/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      maxLength={6}
                      autoComplete="one-time-code"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      style={[styles.darkInput, { textAlign: 'center', fontSize: 24, letterSpacing: 8 }]}
                      onSubmitEditing={() => { if (totpCode.length === 6) handleTotpVerify(); }}
                    />
                  </View>

                  <Button
                    variant="teal"
                    onPress={handleTotpVerify}
                    disabled={totpCode.length !== 6 || twoFALoading}
                    style={{ marginBottom: 12 }}
                  >
                    {twoFALoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.buttonText}>Verify Code</Text>
                      </View>
                    )}
                  </Button>
                </>
              )}

              {twoFAState.methods.includes('passkey') && passkeySupported && (
                <Button
                  variant={twoFAState.methods.includes('totp') ? 'tealOutline' : 'teal'}
                  onPress={async () => {
                    setTwoFALoading(true);
                    try {
                      const result = await passkeyAuthenticate(twoFAState.email);
                      if (result.verified && result.token) {
                        const res = await fetch(`${BASE_URL}/api/auth/mobile-login/verify-2fa`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ loginToken: twoFAState.loginToken, passkeyToken: result.token }),
                        });
                        const data = await res.json();
                        if (data.success && data.user) {
                          const authToken = data.authToken || data.token;
                          if (authToken) TokenStorage.setAuthToken(authToken);
                          if (data.powerSyncToken) TokenStorage.setPowerSyncToken(data.powerSyncToken);
                          TokenStorage.setUser(data.user);
                          const pst = TokenStorage.getPowerSyncToken();
                          if (pst) await login(pst, data.user);
                          playExitAnimation(data.user);
                          return;
                        }
                      }
                      throw new Error('Passkey verification failed');
                    } catch (err: any) {
                      if (!err?.message?.includes('cancelled') && !err?.message?.includes('canceled')) {
                        if (toastFunction) {
                          toastFunction({ title: 'Passkey failed. Try authenticator code.', variant: 'destructive' });
                        }
                      }
                    } finally {
                      setTwoFALoading(false);
                    }
                  }}
                  disabled={twoFALoading}
                  style={{ marginBottom: 12 }}
                  textStyle={{ color: brandColors.white }}
                >
                  {twoFALoading && !twoFAState.methods.includes('totp') ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Fingerprint size={16} color={brandColors.white} style={{ marginRight: 8 }} />
                      <Text style={twoFAState.methods.includes('totp') ? styles.buttonTextOutline : styles.buttonText}>
                        {twoFAState.methods.includes('totp') ? 'Use Passkey Instead' : 'Verify with Passkey'}
                      </Text>
                    </View>
                  )}
                </Button>
              )}
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <Input
                  placeholder="doctor@example.com"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                  autoComplete="email"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.darkInput}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordInputContainer}>
                  <Input
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                    autoComplete="password"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={[styles.darkInput, styles.passwordInput]}
                  />
                  <TouchableOpacity
                    style={styles.showPasswordButton}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color={palette.teal[400]} />
                    ) : (
                      <Eye size={20} color={palette.teal[400]} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => setForgotPasswordOpen(true)}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                variant="teal"
                onPress={handleLogin}
                disabled={isLoading || passkeyLoading}
                style={{ marginBottom: 12 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <KeyRound size={16} color={brandColors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Sign In</Text>
                  </View>
                )}
              </Button>

              {passkeySupported && (
                <Button
                  variant="tealOutline"
                  onPress={handlePasskeyLogin}
                  disabled={isLoading || passkeyLoading}
                  style={{ marginBottom: 12 }}
                  textStyle={{ color: brandColors.white }}
                >
                  {passkeyLoading ? (
                    <ActivityIndicator color={palette.teal[400]} />
                  ) : (
                    <View style={styles.buttonContent}>
                      <Fingerprint size={16} color={brandColors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.buttonTextOutline}>Sign In with Passkey</Text>
                    </View>
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                onPress={testNetworkConnectivity}
                textStyle={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Test Connection
              </Button>

              {onNavigateToSignup && (
                <TouchableOpacity
                  style={styles.signupLink}
                  onPress={onNavigateToSignup}
                  activeOpacity={0.7}
                >
                  <Text style={styles.signupLinkText}>
                    Don't have an account?{' '}
                    <Text style={styles.signupLinkHighlight}>Sign Up</Text>
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.legalLink}
                onPress={() => setTermsDrawerOpen(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.legalLinkText}>Privacy Policy & Terms of Service</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.versionText}>{displayVersion}</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <ForgotPasswordSheet
        visible={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />

      <TermsDrawer
        isOpen={termsDrawerOpen}
        onClose={() => setTermsDrawerOpen(false)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: brandColors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,152,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  offlineText: {
    fontSize: 14,
    color: palette.orange[300],
    fontWeight: '600',
  },
  diagnosticsBanner: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  diagnosticsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 8,
  },
  darkInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.2)',
    color: brandColors.white,
  },
  passwordInputContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 60,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    color: brandColors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonTextOutline: {
    color: brandColors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: palette.teal[400],
    fontSize: 14,
    fontWeight: '600',
  },
  signupLink: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 12,
  },
  signupLinkText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  signupLinkHighlight: {
    color: palette.teal[400],
    fontWeight: '600',
  },
  legalLink: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 12,
  },
  legalLinkText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'underline',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 24,
  },
});
