// apps/mobile/src/screens/user-profile/components/TotpManagementSheet.tsx
// Bottom sheet for managing TOTP authenticator app

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Smartphone, Trash2, Plus, ShieldCheck, Check, ExternalLink, FlaskConical } from 'lucide-react-native';
import { BottomSheet } from '../../../components/BottomSheet';
import { CopyButton } from '../../../components/ui/CopyButton';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { API_CONFIG } from '../../../config';
import { AUTHENTICATOR_APPS, HIPAA_2FA_NOTICE, TOTP_ISSUER, TOTP_MANUAL_SETUP_STEPS } from '@fajr/shared/2fa';

interface TotpManagementSheetProps {
  visible: boolean;
  onClose: () => void;
  userEmail: string;
}

export const TotpManagementSheet: React.FC<TotpManagementSheetProps> = ({
  visible,
  onClose,
  userEmail,
}) => {
  const colors = useThemeColors();

  const [hasTotp, setHasTotp] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Setup state
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);
  const [otpauthUri, setOtpauthUri] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Test state
  const [isTesting, setIsTesting] = useState(false);
  const [testCode, setTestCode] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'fail' | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_CONFIG.PROD.BASE_URL}/api/auth/2fa/status?email=${encodeURIComponent(userEmail)}`,
      );
      const data = await res.json();
      setHasTotp(data.hasTotp ?? false);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    if (visible) {
      setIsLoading(true);
      checkStatus();
    }
  }, [visible, checkStatus]);

  const handleStartSetup = async () => {
    setSetupLoading(true);
    setSetupError(null);

    try {
      const res = await fetch(`${API_CONFIG.PROD.BASE_URL}/api/auth/totp/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSetupError(data.error || 'Failed to start setup');
        return;
      }

      setManualEntryKey(data.manualEntryKey);
      setSetupToken(data.setupToken);
      setOtpauthUri(
        `otpauth://totp/Fajr%20MedFlow%20EMR:${encodeURIComponent(userEmail)}?secret=${data.manualEntryKey}&issuer=Fajr%20MedFlow%20EMR&algorithm=SHA1&digits=6&period=30`,
      );
      setIsSettingUp(true);
    } catch {
      setSetupError('Network error');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!setupToken || totpCode.length !== 6) return;
    setSetupLoading(true);
    setSetupError(null);

    try {
      const res = await fetch(`${API_CONFIG.PROD.BASE_URL}/api/auth/totp/verify-setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode, setupToken }),
      });

      const data = await res.json();
      if (!res.ok || !data.verified) {
        setSetupError(data.error || 'Invalid code');
        setSetupLoading(false);
        return;
      }

      setHasTotp(true);
      setIsSettingUp(false);
      setManualEntryKey(null);
      setSetupToken(null);
      setTotpCode('');
    } catch {
      setSetupError('Network error');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Authenticator',
      'This will remove your authenticator app. Make sure you have another 2FA method before removing this.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            // TODO: Add DELETE /api/auth/totp endpoint
            setHasTotp(false);
          },
        },
      ],
    );
  };

  const handleTestCode = async () => {
    if (testCode.length !== 6) return;
    setTestLoading(true);
    setTestResult(null);

    try {
      const res = await fetch(`${API_CONFIG.PROD.BASE_URL}/api/auth/totp/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, code: testCode }),
      });
      const data = await res.json();
      setTestResult(data.valid ? 'success' : 'fail');
    } catch {
      setTestResult('fail');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={() => {
        setIsSettingUp(false);
        setIsTesting(false);
        setTestCode('');
        setTestResult(null);
        setTotpCode('');
        onClose();
      }}
      title="Authenticator App"
      snapPoint={isSettingUp || isTesting ? 75 : 50}
      showHandle
      showCloseButton
    >
      <View style={styles.content}>
        {/* Description */}
        <View style={[styles.infoBox, { backgroundColor: colors.backgroundSecondary }]}>
          <Smartphone size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Use an authenticator app for two-factor authentication when signing in.
            {'\n\n'}
            {HIPAA_2FA_NOTICE}
          </Text>
        </View>

        {/* Download links */}
        <View style={[styles.downloadSection, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.downloadLabel, { color: colors.textTertiary }]}>
            Get an authenticator app:
          </Text>
          {AUTHENTICATOR_APPS.map((app) => (
            <TouchableOpacity
              key={app.name}
              style={[styles.downloadLink, { borderColor: colors.border }]}
              onPress={() => {
                const url = Platform.OS === 'ios' ? app.ios : app.android;
                Linking.openURL(url);
              }}
            >
              <Text style={[styles.downloadText, { color: colors.primary }]}>{app.name}</Text>
              <ExternalLink size={14} color={colors.primary} />
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : isSettingUp ? (
          <View>
            <Text style={[styles.setupText, { color: colors.textSecondary }]}>
              Add this account to your authenticator app, then enter the 6-digit code.
            </Text>

            {otpauthUri && (
              <TouchableOpacity
                style={[styles.openAppButton, { borderColor: colors.primary + '40' }]}
                onPress={() => {
                  Linking.openURL(otpauthUri).catch(() => {
                    setSetupError('No authenticator app found.');
                  });
                }}
              >
                <Text style={[styles.openAppText, { color: colors.primary }]}>
                  Open in Authenticator App
                </Text>
              </TouchableOpacity>
            )}

            {manualEntryKey && (
              <View style={[styles.keyContainer, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.keyLabel, { color: colors.textTertiary }]}>
                  Or add manually:
                </Text>

                <View style={styles.stepsContainer}>
                  {TOTP_MANUAL_SETUP_STEPS.map((step, i) => (
                    <Text key={i} style={[styles.stepText, { color: colors.textSecondary }]}>
                      {i + 1}. {step}
                    </Text>
                  ))}
                </View>

                <View style={styles.manualEntryRow}>
                  <Text style={[styles.manualEntryLabel, { color: colors.textTertiary }]}>Account name</Text>
                  <View style={styles.manualEntryValueRow}>
                    <Text style={[styles.manualEntryValue, { color: colors.text }]} selectable>{TOTP_ISSUER}</Text>
                    <CopyButton textToCopy={TOTP_ISSUER} label="Account name" iconSize={14} />
                  </View>
                </View>
                <View style={styles.manualEntryRow}>
                  <Text style={[styles.manualEntryLabel, { color: colors.textTertiary }]}>Secret key</Text>
                  <View style={styles.manualEntryValueRow}>
                    <Text style={[styles.keyValue, { color: colors.primary }]} selectable>{manualEntryKey}</Text>
                    <CopyButton textToCopy={manualEntryKey} label="Secret key" iconSize={14} />
                  </View>
                </View>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Verification Code
            </Text>
            <TextInput
              style={[
                styles.codeInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  color: colors.text,
                },
              ]}
              placeholder="000000"
              placeholderTextColor={colors.textTertiary}
              value={totpCode}
              onChangeText={(text) => setTotpCode(text.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              onSubmitEditing={() => {
                if (totpCode.length === 6) handleVerify();
              }}
            />

            {setupError && <Text style={[styles.errorText, { color: colors.error }]}>{setupError}</Text>}

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setIsSettingUp(false);
                  setTotpCode('');
                }}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  {
                    backgroundColor: colors.primary,
                    opacity: totpCode.length !== 6 || setupLoading ? 0.5 : 1,
                  },
                ]}
                onPress={handleVerify}
                disabled={totpCode.length !== 6 || setupLoading}
              >
                {setupLoading ? (
                  <ActivityIndicator color={colors.surface} size="small" />
                ) : (
                  <Text style={[styles.verifyText, { color: colors.surface }]}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : hasTotp ? (
          <>
            <View
              style={[styles.statusItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.statusInfo}>
                <View style={[styles.statusIcon, { backgroundColor: colors.primary + '20' }]}>
                  <ShieldCheck size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.statusName, { color: colors.text }]}>Authenticator App</Text>
                  <Text style={[styles.statusDetail, { color: colors.textSecondary }]}>
                    <Check size={12} color={colors.primary} /> Configured
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.deleteButton, { backgroundColor: colors.error + '15' }]}
                onPress={handleDelete}
              >
                <Trash2 size={18} color={colors.error} />
              </TouchableOpacity>
            </View>

            {/* Test Authenticator */}
            {!isTesting ? (
              <TouchableOpacity
                style={[styles.testButton, { borderColor: colors.border }]}
                onPress={() => { setIsTesting(true); setTestResult(null); setTestCode(''); }}
              >
                <FlaskConical size={16} color={colors.primary} />
                <Text style={[styles.testButtonText, { color: colors.primary }]}>Test Authenticator</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.testSection, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <Text style={[styles.testTitle, { color: colors.text }]}>Test Your Authenticator</Text>
                <Text style={[styles.testDescription, { color: colors.textSecondary }]}>
                  Enter a code from your authenticator app to verify it's working correctly.
                </Text>
                <TextInput
                  style={[
                    styles.codeInput,
                    {
                      borderColor: testResult === 'success' ? colors.primary : testResult === 'fail' ? colors.error : colors.border,
                      backgroundColor: colors.surface,
                      color: colors.text,
                    },
                  ]}
                  placeholder="000000"
                  placeholderTextColor={colors.textTertiary}
                  value={testCode}
                  onChangeText={(text) => { setTestCode(text.replace(/\D/g, '').slice(0, 6)); setTestResult(null); }}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  onSubmitEditing={() => { if (testCode.length === 6) handleTestCode(); }}
                />

                {testResult === 'success' && (
                  <View style={[styles.testResultRow, { backgroundColor: colors.primary + '15' }]}>
                    <Check size={16} color={colors.primary} />
                    <Text style={[styles.testResultText, { color: colors.primary }]}>Code is valid — your authenticator is working.</Text>
                  </View>
                )}
                {testResult === 'fail' && (
                  <View style={[styles.testResultRow, { backgroundColor: colors.error + '15' }]}>
                    <Text style={[styles.testResultText, { color: colors.error }]}>Invalid code. Check your authenticator app and try again.</Text>
                  </View>
                )}

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                    onPress={() => { setIsTesting(false); setTestCode(''); setTestResult(null); }}
                  >
                    <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.verifyButton,
                      {
                        backgroundColor: colors.primary,
                        opacity: testCode.length !== 6 || testLoading ? 0.5 : 1,
                      },
                    ]}
                    onPress={handleTestCode}
                    disabled={testCode.length !== 6 || testLoading}
                  >
                    {testLoading ? (
                      <ActivityIndicator color={colors.surface} size="small" />
                    ) : (
                      <Text style={[styles.verifyText, { color: colors.surface }]}>Test Code</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Smartphone size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No authenticator app configured
            </Text>
            <TouchableOpacity
              style={[
                styles.addButton,
                { backgroundColor: colors.primary, opacity: setupLoading ? 0.7 : 1 },
              ]}
              onPress={handleStartSetup}
              disabled={setupLoading}
            >
              {setupLoading ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <>
                  <Plus size={20} color={colors.surface} />
                  <Text style={[styles.addButtonText, { color: colors.surface }]}>
                    Set Up Authenticator
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  setupText: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  openAppButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  openAppText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  keyContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  keyLabel: {
    fontSize: 11,
    marginBottom: 8,
  },
  keyValue: {
    fontSize: 13,
    fontFamily: 'Courier',
    fontWeight: '600',
    letterSpacing: 1,
  },
  stepsContainer: {
    marginBottom: spacing.md,
  },
  stepText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 22,
  },
  manualEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  manualEntryLabel: {
    fontSize: 11,
    width: 80,
  },
  manualEntryValueRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  manualEntryValue: {
    flex: 1,
    fontSize: 13,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  codeInput: {
    height: 52,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    fontFamily: 'Courier',
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  verifyButton: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  statusName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  statusDetail: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  deleteButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  addButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  testButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  testSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  testTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  testDescription: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  testResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  testResultText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  downloadSection: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  downloadLabel: {
    fontSize: 11,
    marginBottom: spacing.sm,
  },
  downloadLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  downloadText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
});

export default TotpManagementSheet;
