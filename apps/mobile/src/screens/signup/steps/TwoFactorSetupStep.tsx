import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { ShieldCheck, Fingerprint, Check, Smartphone, ExternalLink } from 'lucide-react-native';
import { useSignupContext } from '../SignupContext';
import { usePasskey } from '../../../hooks/usePasskey';
import { CopyButton } from '../../../components/ui/CopyButton';
import { API_CONFIG } from '../../../config';
import { palette } from '../../../utils/colors';
import { AUTHENTICATOR_APPS, HIPAA_2FA_NOTICE, TOTP_ISSUER, TOTP_MANUAL_SETUP_STEPS } from '@fajr/shared/2fa';

export const TwoFactorSetupStep: React.FC = () => {
  const { formData, updateFormData } = useSignupContext();
  const { isSupported: passkeySupported, register: registerPasskey } = usePasskey();

  // TOTP state
  const [totpLoading, setTotpLoading] = useState(false);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpVerified, setTotpVerified] = useState(formData.totpVerified);
  const [totpError, setTotpError] = useState<string | null>(null);

  // Passkey state
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(formData.passkeyEnabled);

  const handleStartTotpSetup = useCallback(async () => {
    if (!formData.email) return;
    setTotpLoading(true);
    setTotpError(null);

    try {
      const res = await fetch(`${API_CONFIG.PROD.BASE_URL}/api/auth/totp/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTotpError(data.error || 'Failed to start setup');
        return;
      }

      setManualEntryKey(data.manualEntryKey);
      setSetupToken(data.setupToken);
      // Extract otpauth URI from the QR data (the setup endpoint returns it encoded in QR)
      // For mobile, we primarily use manual key + deep link
      setOtpauthUri(`otpauth://totp/Fajr%20MedFlow%20EMR:${encodeURIComponent(formData.email)}?secret=${data.manualEntryKey}&issuer=Fajr%20MedFlow%20EMR&algorithm=SHA1&digits=6&period=30`);
    } catch {
      setTotpError('Network error. Please try again.');
    } finally {
      setTotpLoading(false);
    }
  }, [formData.email]);

  const handleVerifyTotp = useCallback(async () => {
    if (!setupToken || totpCode.length !== 6) return;
    setTotpLoading(true);
    setTotpError(null);

    try {
      const res = await fetch(`${API_CONFIG.PROD.BASE_URL}/api/auth/totp/verify-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode, setupToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.verified) {
        setTotpError(data.error || 'Invalid code. Please try again.');
        setTotpLoading(false);
        return;
      }

      setTotpVerified(true);
      updateFormData({
        totpVerified: true,
        totpSetupToken: setupToken,
        totpCredentialData: data.totpCredentialData,
        twoFactorSetupCompleted: true,
      });
    } catch {
      setTotpError('Network error. Please try again.');
    } finally {
      setTotpLoading(false);
    }
  }, [setupToken, totpCode, updateFormData]);

  const handleOpenAuthenticator = useCallback(() => {
    if (otpauthUri) {
      Linking.openURL(otpauthUri).catch(() => {
        setTotpError('No authenticator app found. Please install one first.');
      });
    }
  }, [otpauthUri]);

  const handlePasskeySetup = useCallback(async () => {
    if (!formData.email) return;
    setPasskeyLoading(true);

    try {
      const result = await registerPasskey(formData.email);
      if (result?.verified) {
        setPasskeyRegistered(true);
        updateFormData({ passkeyEnabled: true });
      }
    } catch {
      // User cancelled or not supported - ignore
    } finally {
      setPasskeyLoading(false);
    }
  }, [formData.email, registerPasskey, updateFormData]);

  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', marginBottom: 20 }}>
        <ShieldCheck size={32} color={palette.teal[400]} />
        <Text style={styles.title}>Two-Factor Authentication</Text>
        <Text style={styles.subtitle}>
          Set up an authenticator app to secure your account.{'\n'}
          {HIPAA_2FA_NOTICE}
        </Text>
      </View>

      {/* TOTP Setup (Required) */}
      <View style={[styles.card, totpVerified && styles.cardComplete]}>
        <View style={styles.cardHeader}>
          <Smartphone size={20} color="rgba(255,255,255,0.85)" />
          <Text style={styles.cardTitle}>Authenticator App</Text>
          {totpVerified && <Check size={20} color={palette.teal[400]} />}
        </View>

        {totpVerified ? (
          <Text style={styles.successText}>
            Authenticator app configured successfully.
          </Text>
        ) : !manualEntryKey ? (
          <View>
            <Text style={styles.description}>
              Use an authenticator app like Microsoft Authenticator, Google Authenticator, or Authy.
            </Text>
            <View style={styles.downloadSection}>
              <Text style={styles.downloadLabel}>Don't have one? Download here:</Text>
              {AUTHENTICATOR_APPS.map((app) => (
                <TouchableOpacity
                  key={app.name}
                  style={styles.downloadLink}
                  onPress={() => {
                    const url = Platform.OS === 'ios' ? app.ios : app.android;
                    Linking.openURL(url);
                  }}
                >
                  <Text style={styles.downloadText}>{app.name}</Text>
                  <ExternalLink size={14} color={palette.teal[400]} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.button, totpLoading && { opacity: 0.7 }]}
              onPress={handleStartTotpSetup}
              disabled={totpLoading}
            >
              {totpLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Set Up Authenticator</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.description}>
              Add this account to your authenticator app, then enter the 6-digit code.
            </Text>

            {/* Open in app button */}
            {otpauthUri && (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 12 }]}
                onPress={handleOpenAuthenticator}
              >
                <Text style={[styles.buttonText, { color: palette.teal[400] }]}>
                  Open in Authenticator App
                </Text>
              </TouchableOpacity>
            )}

            {/* Manual entry details */}
            <View style={styles.keyContainer}>
              <Text style={styles.keyLabel}>Or add manually:</Text>

              <View style={styles.stepsContainer}>
                {TOTP_MANUAL_SETUP_STEPS.map((step, i) => (
                  <Text key={i} style={styles.stepText}>
                    {i + 1}. {step}
                  </Text>
                ))}
              </View>

              <View style={styles.manualEntryRow}>
                <Text style={styles.manualEntryLabel}>Account name</Text>
                <View style={styles.manualEntryValueRow}>
                  <Text style={styles.manualEntryValue} selectable>{TOTP_ISSUER}</Text>
                  <CopyButton textToCopy={TOTP_ISSUER} label="Account name" iconSize={14} />
                </View>
              </View>
              <View style={styles.manualEntryRow}>
                <Text style={styles.manualEntryLabel}>Secret key</Text>
                <View style={styles.manualEntryValueRow}>
                  <Text style={styles.keyValue} selectable>{manualEntryKey}</Text>
                  <CopyButton textToCopy={manualEntryKey} label="Secret key" iconSize={14} />
                </View>
              </View>
            </View>

            {/* Code input */}
            <Text style={styles.inputLabel}>Verification Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={totpCode}
              onChangeText={(text) => setTotpCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              onSubmitEditing={() => { if (totpCode.length === 6) handleVerifyTotp(); }}
            />

            {totpError && <Text style={styles.errorText}>{totpError}</Text>}

            <TouchableOpacity
              style={[styles.button, (totpCode.length !== 6 || totpLoading) && { opacity: 0.5 }]}
              onPress={handleVerifyTotp}
              disabled={totpCode.length !== 6 || totpLoading}
            >
              {totpLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Verify Code</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Passkey Setup (Optional) */}
      {passkeySupported && totpVerified && (
        <View style={[styles.card, passkeyRegistered && styles.cardComplete]}>
          <View style={styles.cardHeader}>
            <Fingerprint size={20} color="rgba(255,255,255,0.85)" />
            <Text style={styles.cardTitle}>Passkey (Optional)</Text>
            {passkeyRegistered && <Check size={20} color={palette.teal[400]} />}
          </View>

          {passkeyRegistered ? (
            <Text style={styles.successText}>
              Passkey registered for faster sign-in.
            </Text>
          ) : (
            <View>
              <Text style={styles.description}>
                Add a passkey for faster sign-in using Face ID, Touch ID, or fingerprint.
              </Text>
              <TouchableOpacity
                style={[styles.outlineButton, passkeyLoading && { opacity: 0.7 }]}
                onPress={handlePasskeySetup}
                disabled={passkeyLoading}
              >
                {passkeyLoading ? (
                  <ActivityIndicator color={palette.teal[400]} size="small" />
                ) : (
                  <>
                    <Fingerprint size={16} color={palette.teal[400]} style={{ marginRight: 8 }} />
                    <Text style={styles.outlineButtonText}>Add Passkey</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
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
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    marginBottom: 16,
  },
  cardComplete: {
    borderColor: palette.teal[500] + '40',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },
  description: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
    lineHeight: 18,
  },
  successText: {
    fontSize: 13,
    color: palette.teal[400],
  },
  button: {
    height: 44,
    borderRadius: 10,
    backgroundColor: palette.teal[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  outlineButton: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.teal[500] + '60',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  outlineButtonText: {
    color: palette.teal[400],
    fontSize: 14,
    fontWeight: '600',
  },
  keyContainer: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  keyLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  keyValue: {
    fontSize: 13,
    color: palette.teal[400],
    fontFamily: 'Courier',
    fontWeight: '600',
    letterSpacing: 1,
  },
  stepsContainer: {
    marginBottom: 12,
  },
  stepText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 22,
  },
  manualEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  manualEntryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    width: 80,
  },
  manualEntryValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manualEntryValue: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  codeInput: {
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontFamily: 'Courier',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 8,
  },
  downloadSection: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  downloadLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  downloadLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  downloadText: {
    fontSize: 13,
    color: palette.teal[400],
    fontWeight: '500',
  },
});
