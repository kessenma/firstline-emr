// components/admin/sections/verifyAuthMigration/VerifyAuthMigrationView.tsx
// Mobile admin card for post-migration auth verification. Shows a read-only
// health snapshot (fetched with the admin JWT) and opens the full interactive
// verifier in the SYSTEM browser — WebAuthn/passkeys don't work in an embedded
// WebView, so we hand off to the browser (same pattern as the analytics card).
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
  StyleSheet,
} from 'react-native';
import { ShieldCheck, ExternalLink, Check, X } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { getApiUrl, getBaseUrl } from '../../../../config';
import { storageUtils } from '../../../../utils/storage';

interface AuthMigrationStatus {
  passkeyCount: number;
  totpCount: number;
  masterkeySet: boolean;
  totpKeySet: boolean;
  webauthnRpId: string;
  zitadelDomain: string;
  zitadelReachable: boolean;
}

export function VerifyAuthMigrationView() {
  const colors = useThemeColors();
  const [status, setStatus] = useState<AuthMigrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await storageUtils.getToken();
      const res = await fetch(
        getApiUrl('/admin/GET/auth-migration/status'),
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`Status ${res.status}`);
      setStatus((await res.json()) as AuthMigrationStatus);
    } catch (e: any) {
      setError(e?.message || 'Failed to load status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const openVerifier = useCallback(() => {
    Linking.openURL(`${getBaseUrl()}/verify-auth`).catch(() => {});
  }, []);

  const Row = ({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) => (
    <View style={styles.row}>
      {ok ? (
        <Check size={16} color={colors.success} />
      ) : (
        <X size={16} color={colors.error} />
      )}
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      {detail ? (
        <Text style={[styles.rowDetail, { color: colors.textSecondary }]}>{detail}</Text>
      ) : null}
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchStatus} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <ShieldCheck size={22} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Verify Auth Migration</Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Confirm passkeys, 2FA, and Zitadel came across after a server move.
      </Text>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {loading && !status ? (
          <ActivityIndicator color={colors.primary} />
        ) : error ? (
          <Text style={{ color: colors.error }}>{error}</Text>
        ) : status ? (
          <>
            <Row label={`Passkeys in database: ${status.passkeyCount}`} ok={status.passkeyCount > 0} />
            <Row label={`2FA (TOTP) secrets: ${status.totpCount}`} ok={status.totpCount > 0} />
            <Row label="Zitadel masterkey set on server" ok={status.masterkeySet} />
            <Row label="TOTP encryption key set on server" ok={status.totpKeySet} />
            <Row
              label="Zitadel reachable"
              ok={status.zitadelReachable}
              detail={status.zitadelDomain}
            />
            <Text style={[styles.note, { color: colors.textSecondary }]}>
              WebAuthn RP-ID: {status.webauthnRpId}
            </Text>
          </>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary }]}
        onPress={openVerifier}
        activeOpacity={0.8}
      >
        <ExternalLink size={18} color={colors.textInverse} />
        <Text style={[styles.buttonText, { color: colors.textInverse }]}>
          Open verification tool in browser
        </Text>
      </TouchableOpacity>
      <Text style={[styles.note, { color: colors.textSecondary }]}>
        The passkey test opens in your system browser, where passkeys work.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { fontSize: 14, flexShrink: 1 },
  rowDetail: { fontSize: 12, marginLeft: 'auto' },
  note: { fontSize: 12 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { fontSize: 15, fontWeight: '600' },
});
