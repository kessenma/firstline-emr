import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native';
import { Eye, EyeOff, Fingerprint } from 'lucide-react-native';
import { useSignupContext } from '../SignupContext';
import { palette } from '../../../utils/colors';
import { usePasskey } from '../../../hooks/usePasskey';

interface CredentialsStepProps {
  onOpenTerms: () => void;
}

export const CredentialsStep: React.FC<CredentialsStepProps> = ({ onOpenTerms }) => {
  const { formData, updateFormData, emailExists } = useSignupContext();
  const { isSupported: passkeySupported } = usePasskey();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = formData.email.length === 0 || emailRegex.test(formData.email);
  const passwordTooShort = formData.password.length > 0 && formData.password.length < 8;
  const passwordsMismatch =
    formData.confirmPassword.length > 0 &&
    formData.password !== formData.confirmPassword;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Account</Text>

      {/* Email */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[
            styles.input,
            (!isEmailValid || emailExists) && styles.inputError,
          ]}
          placeholder="doctor@example.com"
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={formData.email}
          onChangeText={(text) => updateFormData({ email: text.toLowerCase() })}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        {!isEmailValid && (
          <Text style={styles.errorText}>Please enter a valid email</Text>
        )}
        {emailExists && (
          <Text style={styles.errorText}>
            This email already has an account. Please sign in instead.
          </Text>
        )}
      </View>

      {/* Password */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput, passwordTooShort && styles.inputError]}
            placeholder="At least 8 characters"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={formData.password}
            onChangeText={(text) => updateFormData({ password: text })}
            secureTextEntry={!showPassword}
            autoComplete="new-password"
          />
          <TouchableOpacity
            style={styles.eyeButton}
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
        {passwordTooShort && (
          <Text style={styles.errorText}>Password must be at least 8 characters</Text>
        )}
      </View>

      {/* Confirm Password */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, styles.passwordInput, passwordsMismatch && styles.inputError]}
            placeholder="Re-enter your password"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={formData.confirmPassword}
            onChangeText={(text) => updateFormData({ confirmPassword: text })}
            secureTextEntry={!showConfirm}
            autoComplete="new-password"
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirm(!showConfirm)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showConfirm ? (
              <EyeOff size={20} color={palette.teal[400]} />
            ) : (
              <Eye size={20} color={palette.teal[400]} />
            )}
          </TouchableOpacity>
        </View>
        {passwordsMismatch && (
          <Text style={styles.errorText}>Passwords do not match</Text>
        )}
      </View>

      {/* Terms Agreement */}
      <TouchableOpacity
        style={styles.termsRow}
        onPress={() => updateFormData({ agreedToTerms: !formData.agreedToTerms })}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.checkbox,
            formData.agreedToTerms && styles.checkboxChecked,
          ]}
        >
          {formData.agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
        </View>
        <Text style={styles.termsText}>
          I agree to the{' '}
          <Text style={styles.termsLink} onPress={onOpenTerms}>
            Terms of Service and Privacy Policy
          </Text>
        </Text>
      </TouchableOpacity>

      {/* Passkey Toggle */}
      {passkeySupported && (
        <View style={[styles.passkeyContainer, formData.passkeyEnabled && styles.passkeyContainerActive]}>
          <View style={styles.passkeyRow}>
            <View style={styles.passkeyInfo}>
              <Fingerprint
                size={20}
                color={formData.passkeyEnabled ? palette.teal[400] : 'rgba(255,255,255,0.5)'}
              />
              <View style={styles.passkeyTextContainer}>
                <Text style={styles.passkeyLabel}>Enable Passkey Login</Text>
                <Text style={styles.passkeyDescription}>
                  Use Face ID, Touch ID, or fingerprint
                </Text>
              </View>
            </View>
            <Switch
              value={formData.passkeyEnabled}
              onValueChange={(val) => updateFormData({ passkeyEnabled: val })}
              trackColor={{
                false: 'rgba(255,255,255,0.15)',
                true: palette.teal[500],
              }}
              thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
            />
          </View>
          {formData.passkeyEnabled && (
            <Text style={styles.passkeyNote}>
              You'll be prompted to set up your passkey after your account is created.
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
  },
  inputError: {
    borderColor: palette.red[400],
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 52,
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
  errorText: {
    color: palette.red[400],
    fontSize: 12,
    marginTop: 4,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingRight: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: palette.teal[500],
    borderColor: palette.teal[500],
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  termsLink: {
    color: palette.teal[400],
    fontWeight: '600',
  },
  passkeyContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
  },
  passkeyContainerActive: {
    borderColor: palette.teal[500] + '50',
    backgroundColor: 'rgba(53,157,152,0.08)',
  },
  passkeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  passkeyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  passkeyTextContainer: {
    flex: 1,
  },
  passkeyLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  passkeyDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  passkeyNote: {
    fontSize: 12,
    color: palette.teal[400],
    marginTop: 10,
    paddingLeft: 30,
  },
});
