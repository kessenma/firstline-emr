// apps/mobile/src/components/ServerSwitcher.tsx
// Lets a user point the app at a different backend server — e.g. a new server's
// IP during a migration, or a QA environment. Switching signs the user out so
// the new server is used cleanly on next login (fresh auth token + PowerSync).

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Globe, Server } from 'lucide-react-native';
import { useThemeColors } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { RadioCardField } from './form/RadioCardField';
import { TextInputField } from './form/TextInputField';
import { spacing, borderRadius, typography } from '../utils/theme';
import {
  deriveServerUrls,
  getActiveServerInfo,
  getCustomServer,
  setActiveServer,
  setCustomServer,
  type ServerId,
} from '../config';

interface ServerSwitcherProps {
  /** Called after a server change triggers sign-out (to dismiss the sheet). */
  onClose?: () => void;
}

const isValidHttpUrl = (url: string): boolean =>
  /^https?:\/\/[^\s]+$/i.test(url.trim());

export const ServerSwitcher: React.FC<ServerSwitcherProps> = ({ onClose }) => {
  const colors = useThemeColors();
  const { logout } = useAuth();

  // Snapshot the current state once — the component unmounts on a switch.
  const active = useMemo(() => getActiveServerInfo(), []);
  const savedCustom = useMemo(() => getCustomServer(), []);

  const [selected, setSelected] = useState<ServerId>(active.id);
  const [baseUrl, setBaseUrl] = useState(savedCustom?.baseUrl ?? '');
  const [powersyncUrl, setPowersyncUrl] = useState(
    savedCustom?.powersyncUrl ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => {
    if (selected !== 'custom' || !isValidHttpUrl(baseUrl)) return null;
    return deriveServerUrls(baseUrl, powersyncUrl || undefined);
  }, [selected, baseUrl, powersyncUrl]);

  const handleSave = () => {
    setError(null);

    if (selected === 'custom') {
      if (!isValidHttpUrl(baseUrl)) {
        setError('Enter a valid URL starting with http:// or https://');
        return;
      }
      if (powersyncUrl.trim() && !isValidHttpUrl(powersyncUrl)) {
        setError('PowerSync URL must start with http:// or https://');
        return;
      }
      // Remember the custom config even if the user stays on production.
      setCustomServer({ baseUrl, powersyncUrl: powersyncUrl || undefined });
    }

    // Did the effective server actually change?
    const nextBase =
      selected === 'custom'
        ? deriveServerUrls(baseUrl, powersyncUrl || undefined).BASE_URL
        : null;
    const changed =
      selected !== active.id ||
      (selected === 'custom' && nextBase !== active.urls.BASE_URL);

    if (!changed) {
      setActiveServer(selected);
      Alert.alert('Saved', 'Server settings updated.');
      return;
    }

    const targetLabel =
      selected === 'custom'
        ? baseUrl.trim()
        : 'Production (fajrmission.org)';

    Alert.alert(
      'Switch server?',
      `The app will connect to:\n\n${targetLabel}\n\n` +
        "You'll be signed out and need to log in again against the new server.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Switch & Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            setActiveServer(selected);
            try {
              await logout();
            } finally {
              setSaving(false);
              onClose?.();
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {/* Currently connected indicator */}
      <View
        style={[
          styles.currentBanner,
          { backgroundColor: colors.primary + '12', borderColor: colors.border },
        ]}
      >
        <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>
          CONNECTED TO
        </Text>
        <Text style={[styles.currentValue, { color: colors.text }]}>
          {active.urls.BASE_URL}
        </Text>
        <Text style={[styles.currentSub, { color: colors.textTertiary }]}>
          {active.label} · sync {active.urls.POWERSYNC_URL}
        </Text>
      </View>

      <RadioCardField
        value={selected}
        onChange={(v) => {
          setSelected(v as ServerId);
          setError(null);
        }}
        direction="vertical"
        size="small"
        options={[
          {
            label: 'Production',
            value: 'production',
            description: 'fajrmission.org',
            icon: <Globe size={20} color={colors.primary} strokeWidth={2} />,
          },
          {
            label: 'Custom',
            value: 'custom',
            description: 'Point at a custom host or IP',
            icon: <Server size={20} color={colors.primary} strokeWidth={2} />,
          },
        ]}
      />

      {selected === 'custom' && (
        <View style={styles.customFields}>
          <TextInputField
            label="Base URL"
            required
            variant="outlined"
            placeholder="http://5.161.10.20:3000"
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TextInputField
            label="PowerSync URL (optional)"
            variant="outlined"
            placeholder="http://5.161.10.20:6061"
            helperText="Leave blank to auto-derive from the base URL"
            value={powersyncUrl}
            onChangeText={setPowersyncUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {preview && (
            <View
              style={[
                styles.preview,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.previewTitle, { color: colors.textSecondary }]}>
                RESOLVED
              </Text>
              <Text style={[styles.previewLine, { color: colors.textTertiary }]}>
                API   {preview.API_URL}
              </Text>
              <Text style={[styles.previewLine, { color: colors.textTertiary }]}>
                WS    {preview.WS_URL}
              </Text>
              <Text style={[styles.previewLine, { color: colors.textTertiary }]}>
                Sync  {preview.POWERSYNC_URL}
              </Text>
            </View>
          )}
        </View>
      )}

      {error && (
        <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
      )}

      <TouchableOpacity
        style={[
          styles.saveButton,
          { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 },
        ]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.8}
      >
        <Text style={[styles.saveButtonText, { color: colors.background }]}>
          {selected !== active.id ? 'Switch & Sign Out' : 'Save'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  currentBanner: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: 2,
  },
  currentLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.5,
  },
  currentValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  currentSub: {
    fontSize: typography.fontSize.xs,
  },
  customFields: {
    gap: spacing.sm,
  },
  preview: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: 2,
  },
  previewTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  previewLine: {
    fontSize: typography.fontSize.xs,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  error: {
    fontSize: typography.fontSize.sm,
  },
  saveButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
