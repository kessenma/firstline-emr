// apps/mobile/src/components/SettingsSheet.tsx
// Settings bottom sheet for profile screen preferences

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Bell, RefreshCw, Download, CircleHelp, Languages, GalleryHorizontalEnd, Rows3, MessageSquare, MessageCircle, UserCog, Moon, Phone, Save, X, FileText } from 'lucide-react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { DataSettingsOnboardingSheet } from '../../components/DataSettingsOnboardingSheet';

import { AccountSwitcher } from '../../components/AccountSwitcher';
import { DeviceRegistration } from '../../components/DeviceRegistration';
import { ServerSwitcher } from '../../components/ServerSwitcher';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePatientDataNetworkMode } from '../../hooks/usePatientDataNetworkMode';
import { useTranslationModelWifiOnly } from '../../hooks/useTranslationModelWifiOnly';
import { NetworkModeSwitch } from '../../components/ui/NetworkModeSwitch';
import { ToggleSwitch } from '../../components/ui/ToggleSwitch';
import { RadioCardField } from '../../components/form/RadioCardField';
import { usePatientChartViewPreference } from '../../hooks/usePatientChartViewPreference';
import { useCallTranscriptionMode } from '../../hooks/useCallTranscriptionMode';
import { CallTranscription } from '../../native/NativeCallTranscription';
import {
  CALL_TRANSCRIPTION_MODE_DESCRIPTIONS,
  CALL_TRANSCRIPTION_MODE_LABELS,
  type CallTranscriptionMode,
} from '@fajr/shared/user';
import { useAppVersion } from '../../hooks/useAppVersion';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface SettingItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onPress?: () => void;
  onInfoPress?: () => void;
  rightElement?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  label,
  description,
  onPress,
  onInfoPress,
  rightElement,
  containerStyle,
}) => {
  const colors = useThemeColors();
  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component
      style={[
        styles.settingItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        containerStyle,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.primary + '15' },
          ]}
        >
          {icon}
        </View>
        <View style={styles.textContainer}>
          <View style={styles.labelRow}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              {label}
            </Text>
            {onInfoPress && (
              <TouchableOpacity
                onPress={onInfoPress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <CircleHelp size={16} color={colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
          {description && (
            <Text
              style={[
                styles.settingDescription,
                { color: colors.textSecondary },
              ]}
            >
              {description}
            </Text>
          )}
        </View>
      </View>
      {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
    </Component>
  );
};

/** Parse "HH:mm" string to a Date for the time picker */
const parseTimeToDate = (time: string): Date => {
  const [h, m] = (time || '00:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  visible,
  onClose,
}) => {
  const colors = useThemeColors();
  const { user, startDataSync } = useAuth();
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showDataOnboarding, setShowDataOnboarding] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [editingQuietHours, setEditingQuietHours] = useState(false);
  const [draftStart, setDraftStart] = useState('22:00');
  const [draftEnd, setDraftEnd] = useState('07:00');

  const isAdmin = user?.isAdmin === true;
  const {
    wifiOnly: patientDataWifiOnly,
    setWifiOnly: setPatientDataWifiOnly,
  } = usePatientDataNetworkMode();
  const {
    wifiOnly: translationModelWifiOnly,
    setWifiOnly: setTranslationModelWifiOnly,
  } = useTranslationModelWifiOnly();
  const {
    chartView,
    setChartView,
  } = usePatientChartViewPreference();

  const { mode: transcriptionMode, setMode: setTranscriptionMode } =
    useCallTranscriptionMode();

  // iOS 26+ only. Rather than hiding the setting on older devices — which just
  // looks like a missing feature — it is shown disabled with the reason.
  const [transcriptionSupport, setTranscriptionSupport] = useState<{
    supported: boolean;
    reason?: string;
  }>({ supported: false });

  useEffect(() => {
    let active = true;
    void CallTranscription.isSupported().then(result => {
      if (active) setTranscriptionSupport(result);
    });
    return () => {
      active = false;
    };
  }, []);
  const { displayVersion } = useAppVersion();
  const {
    prefs: notifPrefs,
    updatePref: updateNotifPref,
  } = useNotificationPreferences();

  const handleAccountSwitcherPress = () => {
    setShowAccountSwitcher(true);
  };

  const handleAccountSwitcherClose = () => {
    setShowAccountSwitcher(false);
  };

  const handleAccountTypeChanged = (newType: string, oldType: string) => {
    console.log(`Account type changed from ${oldType} to ${newType}`);
    setShowAccountSwitcher(false);
  };

  // Show account switcher view instead of settings list
  if (showAccountSwitcher) {
    return (
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title="Switch Account Type"
        snapPoint={70}
        showHandle={true}
        showCloseButton={true}
      >
        <AccountSwitcher
          onClose={handleAccountSwitcherClose}
          onAccountTypeChanged={handleAccountTypeChanged}
        />
      </BottomSheet>
    );
  }

  return (
    <>
      <BottomSheet
        visible={visible}
        onClose={onClose}
        title="Settings"
        snapPoint={70}
        showHandle={true}
        showCloseButton={true}
      >
        <View style={styles.container}>
        {/* Admin Section - Only show for admin users */}
        {isAdmin && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { color: colors.textSecondary }]}
            >
              ADMIN
            </Text>
            <View style={styles.sectionContent}>
              <SettingItem
                icon={
                  <RefreshCw size={20} color={colors.primary} strokeWidth={2} />
                }
                label="Switch Account Type"
                description="Change between Doctor and Triage"
                onPress={handleAccountSwitcherPress}
              />
            </View>
          </View>
        )}

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            APPEARANCE
          </Text>
          <View style={styles.sectionContent}>
            <RadioCardField
              label="Patient Chart Layout"
              value={chartView}
              onChange={(value) => void setChartView(value as 'tabs' | 'dashboard')}
              direction="horizontal"
              size="small"
              options={[
                {
                  label: 'Tabs',
                  value: 'tabs',
                  description: 'Classic tab navigation',
                  icon: <GalleryHorizontalEnd size={20} color={colors.primary} strokeWidth={2} />,
                },
                {
                  label: 'Dashboard',
                  value: 'dashboard',
                  description: 'Summary cards with sheets',
                  icon: <Rows3 size={20} color={colors.primary} strokeWidth={2} />,
                },
              ]}
            />
          </View>
        </View>

        {/* Consultations Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            CONSULTATIONS
          </Text>
          <View style={styles.sectionContent}>
            {transcriptionSupport.supported ? (
              <RadioCardField
                label="Write notes from video calls"
                helperText="Speech is processed on this phone and never sent to a server. The patient is asked separately, before each call — transcription only runs if they agree."
                value={transcriptionMode}
                onChange={value =>
                  void setTranscriptionMode(value as CallTranscriptionMode)
                }
                direction="vertical"
                size="small"
                options={[
                  {
                    label: CALL_TRANSCRIPTION_MODE_LABELS.off,
                    value: 'off',
                    description: CALL_TRANSCRIPTION_MODE_DESCRIPTIONS.off,
                  },
                  {
                    label: CALL_TRANSCRIPTION_MODE_LABELS.post_call,
                    value: 'post_call',
                    description: CALL_TRANSCRIPTION_MODE_DESCRIPTIONS.post_call,
                  },
                  {
                    label: CALL_TRANSCRIPTION_MODE_LABELS.live,
                    value: 'live',
                    description: CALL_TRANSCRIPTION_MODE_DESCRIPTIONS.live,
                  },
                ]}
              />
            ) : (
              <SettingItem
                icon={<FileText size={20} color={colors.textTertiary} />}
                label="Write notes from video calls"
                description={
                  transcriptionSupport.reason ??
                  'Not available on this device.'
                }
                rightElement={null}
              />
            )}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            NOTIFICATIONS
          </Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<Bell size={20} color={colors.primary} strokeWidth={2} />}
              label="Push Notifications"
              description="Receive push notifications on your device"
              rightElement={
                <ToggleSwitch
                  value={notifPrefs.pushEnabled}
                  onValueChange={(v: boolean) => void updateNotifPref('pushNotificationsEnabled', v)}
                />
              }
            />
            <SettingItem
              icon={<MessageSquare size={20} color={notifPrefs.pushEnabled ? colors.primary : colors.textTertiary} strokeWidth={2} />}
              label="Internal Messages"
              description="Messages from your care team in internal threads"
              rightElement={
                <ToggleSwitch
                  value={notifPrefs.pushEnabled && notifPrefs.notifyInternalMessages}
                  onValueChange={(v: boolean) => { if (notifPrefs.pushEnabled) void updateNotifPref('notifyInternalMessages', v); }}
                  disabled={!notifPrefs.pushEnabled}
                />
              }
            />
            <SettingItem
              icon={<MessageCircle size={20} color={notifPrefs.pushEnabled ? colors.primary : colors.textTertiary} strokeWidth={2} />}
              label="Patient Messages"
              description="Messages from patients on Telegram threads you're participating in"
              rightElement={
                <ToggleSwitch
                  value={notifPrefs.pushEnabled && notifPrefs.notifyPatientMessages}
                  onValueChange={(v: boolean) => { if (notifPrefs.pushEnabled) void updateNotifPref('notifyPatientMessages', v); }}
                  disabled={!notifPrefs.pushEnabled}
                />
              }
            />
            <SettingItem
              icon={<UserCog size={20} color={notifPrefs.pushEnabled ? colors.primary : colors.textTertiary} strokeWidth={2} />}
              label="Patient Actions"
              description="New patient registrations, specialty assignments, and care team changes"
              rightElement={
                <ToggleSwitch
                  value={notifPrefs.pushEnabled && notifPrefs.notifyPatientActions}
                  onValueChange={(v: boolean) => { if (notifPrefs.pushEnabled) void updateNotifPref('notifyPatientActions', v); }}
                  disabled={!notifPrefs.pushEnabled}
                />
              }
            />
            <SettingItem
              icon={<Phone size={20} color={notifPrefs.pushEnabled ? colors.primary : colors.textTertiary} strokeWidth={2} />}
              label="Staff Calls"
              description="Incoming audio calls from colleagues"
              onInfoPress={() =>
                Alert.alert(
                  'Staff Calls',
                  'Live calls from colleagues ring your device even during quiet hours — ' +
                    'the caller has to confirm the interruption first.\n\n' +
                    'Turning this off is the only way to be unreachable by call. Colleagues ' +
                    'will see "not reachable" rather than a ring that never lands.',
                )
              }
              rightElement={
                <ToggleSwitch
                  value={notifPrefs.pushEnabled && notifPrefs.notifyCalls}
                  onValueChange={(v: boolean) => { if (notifPrefs.pushEnabled) void updateNotifPref('notifyCalls', v); }}
                  disabled={!notifPrefs.pushEnabled}
                />
              }
            />
            <SettingItem
              icon={<Moon size={20} color={colors.primary} strokeWidth={2} />}
              label="Quiet Hours"
              description="Pause push notifications during set hours"
              onInfoPress={() =>
                Alert.alert(
                  'Quiet Hours',
                  'When enabled, push notifications are paused during the set hours. ' +
                    'Notifications will still appear in-app — only push delivery is paused.\n\n' +
                    'Live calls from staff are the exception: they still ring.',
                )
              }
              rightElement={
                <ToggleSwitch
                  value={notifPrefs.quietHoursEnabled}
                  onValueChange={(v: boolean) => void updateNotifPref('quietHoursEnabled', v)}
                />
              }
            />
            {notifPrefs.quietHoursEnabled && !editingQuietHours && (
              <TouchableOpacity
                style={[styles.quietHoursContainer, { borderColor: colors.border }]}
                onPress={() => {
                  setDraftStart(notifPrefs.quietHoursStart);
                  setDraftEnd(notifPrefs.quietHoursEnd);
                  setEditingQuietHours(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.quietHoursRow}>
                  <Text style={[styles.quietHoursLabel, { color: colors.textSecondary }]}>From</Text>
                  <Text style={[styles.timeDisplay, { color: colors.text }]}>
                    {notifPrefs.quietHoursStart}
                  </Text>
                  <Text style={[styles.quietHoursLabel, { color: colors.textSecondary }]}>to</Text>
                  <Text style={[styles.timeDisplay, { color: colors.text }]}>
                    {notifPrefs.quietHoursEnd}
                  </Text>
                </View>
                <Text style={[styles.quietHoursTimezone, { color: colors.textTertiary }]}>
                  {notifPrefs.quietHoursTimezone} · Tap to edit
                </Text>
              </TouchableOpacity>
            )}
            {notifPrefs.quietHoursEnabled && editingQuietHours && (
              <View style={[styles.quietHoursContainer, { borderColor: colors.primary }]}>
                <View style={styles.quietHoursRow}>
                  <Text style={[styles.quietHoursLabel, { color: colors.text }]}>Start</Text>
                  <TouchableOpacity
                    style={[styles.timeButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text style={[styles.timeButtonText, { color: colors.text }]}>
                      {draftStart}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.quietHoursLabel, { color: colors.text }]}>End</Text>
                  <TouchableOpacity
                    style={[styles.timeButton, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text style={[styles.timeButtonText, { color: colors.text }]}>
                      {draftEnd}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.quietHoursTimezone, { color: colors.textTertiary }]}>
                  Timezone: {notifPrefs.quietHoursTimezone}
                </Text>
                {showStartPicker && (
                  <DateTimePicker
                    mode="time"
                    value={parseTimeToDate(draftStart)}
                    onChange={(_, date) => {
                      setShowStartPicker(Platform.OS === 'ios');
                      if (date) {
                        const h = String(date.getHours()).padStart(2, '0');
                        const m = String(date.getMinutes()).padStart(2, '0');
                        setDraftStart(`${h}:${m}`);
                      }
                    }}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  />
                )}
                {showEndPicker && (
                  <DateTimePicker
                    mode="time"
                    value={parseTimeToDate(draftEnd)}
                    onChange={(_, date) => {
                      setShowEndPicker(Platform.OS === 'ios');
                      if (date) {
                        const h = String(date.getHours()).padStart(2, '0');
                        const m = String(date.getMinutes()).padStart(2, '0');
                        setDraftEnd(`${h}:${m}`);
                      }
                    }}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  />
                )}
                <View style={styles.quietHoursActions}>
                  <TouchableOpacity
                    style={[styles.quietHoursCancelButton, { borderColor: colors.border }]}
                    onPress={() => {
                      setEditingQuietHours(false);
                      setShowStartPicker(false);
                      setShowEndPicker(false);
                    }}
                  >
                    <X size={16} color={colors.textSecondary} strokeWidth={2} />
                    <Text style={{ color: colors.textSecondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.medium }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quietHoursSaveButton, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      void updateNotifPref('quietHoursStart', draftStart);
                      void updateNotifPref('quietHoursEnd', draftEnd);
                      setEditingQuietHours(false);
                      setShowStartPicker(false);
                      setShowEndPicker(false);
                    }}
                  >
                    <Save size={16} color={colors.background} strokeWidth={2} />
                    <Text style={{ color: colors.background, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold }}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Data & Storage Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DATA & STORAGE
          </Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<Download size={20} color={colors.primary} strokeWidth={2} />}
              label="Download Data on WiFi Only"
              description="Patient records, messages, notes, and photos"
              onInfoPress={() =>
                Alert.alert(
                  'Patient Data Sync',
                  'Controls downloading of all patient data for offline access:\n\n' +
                    '\u2022 Patient records & demographics\n' +
                    '\u2022 Clinical notes & visit history\n' +
                    '\u2022 Internal team messages\n' +
                    '\u2022 Telegram patient messages\n' +
                    '\u2022 Prescriptions & medication orders\n' +
                    '\u2022 Patient photos & media\n' +
                    '\u2022 Notifications\n\n' +
                    'When enabled, all data syncs only over WiFi to save cellular data. ' +
                    'You can still read and write offline \u2014 changes sync when WiFi is available.',
                )
              }
              rightElement={
                <NetworkModeSwitch
                  value={patientDataWifiOnly}
                  onValueChange={setPatientDataWifiOnly}
                />
              }
            />
            <SettingItem
              icon={<Languages size={20} color={colors.primary} strokeWidth={2} />}
              label="Download AI Models on WiFi Only"
              description="Control cellular usage for translation and voice dictation models"
              rightElement={
                <NetworkModeSwitch
                  value={translationModelWifiOnly}
                  onValueChange={setTranslationModelWifiOnly}
                />
              }
            />
          </View>
        </View>

        {/* Server Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            SERVER
          </Text>
          <View style={styles.sectionContent}>
            <ServerSwitcher onClose={onClose} />
          </View>
        </View>

        {/* Debug Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DEBUG
          </Text>
          <View style={styles.sectionContent}>
            <SettingItem
              icon={<RefreshCw size={20} color={colors.primary} strokeWidth={2} />}
              label="Open Data Onboarding"
              description="Re-open first-login data settings sheet"
              onPress={() => setShowDataOnboarding(true)}
            />
            <DeviceRegistration />
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Fajr Mission EMR {displayVersion}
          </Text>
        </View>
        </View>
      </BottomSheet>
      <DataSettingsOnboardingSheet
        visible={showDataOnboarding}
        onClose={() => setShowDataOnboarding(false)}
        onComplete={(payload) => {
          void startDataSync({
            queuedModelDownloads: payload.queuedModelDownloads,
            translationModelWifiOnly: payload.translationModelWifiOnly,
          });
        }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    gap: spacing.sm,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: typography.fontSize.xs,
  },
  rightElement: {
    marginLeft: spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  footerText: {
    fontSize: typography.fontSize.xs,
  },
  quietHoursContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  quietHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quietHoursLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  timeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  timeButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  quietHoursTimezone: {
    fontSize: typography.fontSize.xs,
  },
  timeDisplay: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  quietHoursActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  quietHoursCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  quietHoursSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
});
