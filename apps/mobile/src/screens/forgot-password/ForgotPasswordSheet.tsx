import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { useThemeColors } from '../../contexts/ThemeContext';
import { authService } from '../../services/AuthService';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { palette } from '../../utils/colors';

interface ForgotPasswordSheetProps {
  visible: boolean;
  onClose: () => void;
}

type Step = 1 | 2 | 3 | 4;

const STEP_TITLES: Record<Step, string> = {
  1: 'Forgot Password',
  2: 'Verify Code',
  3: 'Reset Password',
  4: 'Password Reset',
};

const COOLDOWN_SECONDS = 60;

export const ForgotPasswordSheet: React.FC<ForgotPasswordSheetProps> = ({
  visible,
  onClose,
}) => {
  const colors = useThemeColors();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCloseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      if (autoCloseRef.current) clearTimeout(autoCloseRef.current);
    };
  }, []);

  // Reset state when sheet closes
  const handleClose = useCallback(() => {
    setStep(1);
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirm(false);
    setLoading(false);
    setError('');
    setCooldown(0);
    if (cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
    if (autoCloseRef.current) {
      clearTimeout(autoCloseRef.current);
      autoCloseRef.current = null;
    }
    onClose();
  }, [onClose]);

  const startCooldown = useCallback(() => {
    setCooldown(COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Step 1: Send verification code
  const handleSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    const result = await authService.sendVerificationCode(trimmed);

    setLoading(false);

    if (result.success) {
      startCooldown();
      setStep(2);
    } else {
      // Server returns generic message for security, so always advance
      // unless there's a network error
      if (result.error?.includes('timeout') || result.error?.includes('Network')) {
        setError(result.error);
      } else {
        // Still advance — server doesn't reveal if email exists
        startCooldown();
        setStep(2);
      }
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('Please enter the 6-character code');
      return;
    }

    setLoading(true);
    setError('');

    const result = await authService.verifyResetCode(email.trim(), code.toUpperCase());

    setLoading(false);

    if (result.success) {
      setStep(3);
    } else {
      setError(result.error || 'Invalid or expired code');
    }
  };

  // Step 2: Resend code
  const handleResendCode = async () => {
    if (cooldown > 0) return;

    setLoading(true);
    setError('');

    await authService.sendVerificationCode(email.trim());

    setLoading(false);
    startCooldown();
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    if (!passwordValid) return;

    setLoading(true);
    setError('');

    const result = await authService.resetPassword(email.trim(), newPassword);

    setLoading(false);

    if (result.success) {
      setStep(4);
      // Auto-close after 3 seconds
      autoCloseRef.current = setTimeout(handleClose, 3000);
    } else {
      setError(result.error || 'Failed to reset password');
    }
  };

  // Password validation
  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const passwordValid = hasMinLength && hasNumber && passwordsMatch;

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconWrapper}>
              <Mail size={32} color={palette.teal[400]} />
            </View>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Enter your email and we'll send you a verification code to reset your password.
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
              placeholder="doctor@example.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
              autoFocus
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, !email.trim() && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading || !email.trim()}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Send Verification Code</Text>
                  <ArrowRight size={16} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconWrapper}>
              <KeyRound size={32} color={palette.teal[400]} />
            </View>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              We sent a 6-character code to{' '}
              <Text style={{ color: colors.text, fontWeight: '600' }}>{email}</Text>.
              Check your email and enter the code below.
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>Verification Code</Text>
            <TextInput
              style={[
                styles.input,
                styles.codeInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
              ]}
              placeholder="ABC123"
              placeholderTextColor={colors.textTertiary}
              value={code}
              onChangeText={(t) => { setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setError(''); }}
              autoCapitalize="characters"
              maxLength={6}
              editable={!loading}
              autoFocus
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, code.length !== 6 && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading || code.length !== 6}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Verify Code</Text>
                  <ArrowRight size={16} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendCode}
              disabled={cooldown > 0 || loading}
              activeOpacity={0.7}
            >
              <RefreshCw size={14} color={cooldown > 0 ? colors.textTertiary : palette.teal[400]} />
              <Text
                style={[
                  styles.resendText,
                  { color: cooldown > 0 ? colors.textTertiary : palette.teal[400] },
                ]}
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.iconWrapper}>
              <KeyRound size={32} color={palette.teal[400]} />
            </View>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Create a new password for your account.
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                placeholder="Minimum 8 characters"
                placeholderTextColor={colors.textTertiary}
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setError(''); }}
                secureTextEntry={!showPassword}
                editable={!loading}
                autoFocus
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.textTertiary} />
                ) : (
                  <Eye size={18} color={colors.textTertiary} />
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.text, marginTop: spacing.md }]}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                secureTextEntry={!showConfirm}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirm(!showConfirm)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showConfirm ? (
                  <EyeOff size={18} color={colors.textTertiary} />
                ) : (
                  <Eye size={18} color={colors.textTertiary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Validation hints */}
            <View style={styles.validationHints}>
              <Text style={[styles.hint, hasMinLength && styles.hintValid]}>
                {hasMinLength ? '\u2713' : '\u2022'} At least 8 characters
              </Text>
              <Text style={[styles.hint, hasNumber && styles.hintValid]}>
                {hasNumber ? '\u2713' : '\u2022'} Contains a number
              </Text>
              <Text style={[styles.hint, passwordsMatch && styles.hintValid]}>
                {passwordsMatch ? '\u2713' : '\u2022'} Passwords match
              </Text>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, !passwordValid && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading || !passwordValid}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>
        );

      case 4:
        return (
          <View style={[styles.stepContainer, styles.successContainer]}>
            <CheckCircle2 size={56} color={palette.teal[400]} />
            <Text style={[styles.successTitle, { color: colors.text }]}>
              Password Reset Successfully
            </Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              You can now sign in with your new password.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={STEP_TITLES[step]}
      snapPoint={65}
      showHandle
      showCloseButton
      startExpanded
    >
      {renderStep()}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  stepContainer: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  description: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    fontSize: typography.fontSize.base,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: typography.fontSize.xl,
    fontWeight: '600',
    letterSpacing: 6,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: palette.teal[500],
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: borderRadius.lg,
    marginTop: spacing.lg,
  },
  primaryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: palette.red[400],
    marginTop: spacing.sm,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.base,
    paddingVertical: spacing.sm,
  },
  resendText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  validationHints: {
    marginTop: spacing.md,
    gap: 4,
  },
  hint: {
    fontSize: typography.fontSize.sm,
    color: palette.grey[400],
  },
  hintValid: {
    color: palette.teal[400],
  },
  successContainer: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
  successTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
});
