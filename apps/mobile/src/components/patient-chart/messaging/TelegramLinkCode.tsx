// apps/mobile/src/components/patient-chart/messaging/TelegramLinkCode.tsx
// Component for generating and displaying a Telegram link code
// Supports QR codes, multi-language instructions, and language override

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Link2, Copy, Check, RefreshCw, Globe, ChevronDown } from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, typography } from '../../../utils/theme';
import { getApiUrl } from '../../../config';
import { getStoredToken } from '../../../utils/storage';
import { usePowerSync, useSyncConnection } from '../../../hooks/powersync';
import { TABLES } from '../../../db';
import {
  Languages,
  LanguagesList,
  isRtlLanguage,
  normalizeLanguage,
} from '../../../data/languages';

// Localized patient-facing instructions (same as web linkCodeMessages.ts)
const patientInstructions: Record<Languages, (code: string, botUsername: string) => string> = {
  [Languages.ENGLISH]: (code, bot) =>
    `To connect your Telegram to your medical record:\n1. Open Telegram\n2. Search for @${bot}\n3. Send this code: ${code}`,
  [Languages.ARABIC]: (code, bot) =>
    `لربط حساب تيليجرام بسجلك الطبي:\n1. افتح تيليجرام\n2. ابحث عن @${bot}\n3. أرسل هذا الرمز: ${code}`,
  [Languages.FARSI]: (code, bot) =>
    `برای اتصال تلگرام به پرونده پزشکی:\n1. تلگرام را باز کنید\n2. @${bot} را جستجو کنید\n3. این کد را ارسال کنید: ${code}`,
  [Languages.PASHTO]: (code, bot) =>
    `د خپل تلیګرام د طبي ریکارډ سره وصلولو لپاره:\n1. تلیګرام خلاص کړئ\n2. @${bot} وپلټئ\n3. دا کوډ واستوئ: ${code}`,
  [Languages.TURKISH]: (code, bot) =>
    `Telegram'ınızı tıbbi kaydınıza bağlamak için:\n1. Telegram'ı açın\n2. @${bot} arayın\n3. Bu kodu gönderin: ${code}`,
  [Languages.URDU]: (code, bot) =>
    `اپنے ٹیلیگرام کو طبی ریکارڈ سے جوڑنے کے لیے:\n1. ٹیلیگرام کھولیں\n2. @${bot} تلاش کریں\n3. یہ کوڈ بھیجیں: ${code}`,
  [Languages.SPANISH]: (code, bot) =>
    `Para conectar tu Telegram a tu registro médico:\n1. Abre Telegram\n2. Busca @${bot}\n3. Envía este código: ${code}`,
  [Languages.FRENCH]: (code, bot) =>
    `Pour connecter votre Telegram à votre dossier médical :\n1. Ouvrez Telegram\n2. Recherchez @${bot}\n3. Envoyez ce code : ${code}`,
};

// Native language labels for the selector
const nativeLabels: Record<Languages, string> = {
  [Languages.ENGLISH]: 'English',
  [Languages.ARABIC]: 'العربية',
  [Languages.FARSI]: 'فارسی',
  [Languages.PASHTO]: 'پښتو',
  [Languages.TURKISH]: 'Türkçe',
  [Languages.URDU]: 'اردو',
  [Languages.SPANISH]: 'Español',
  [Languages.FRENCH]: 'Français',
};



// Latin alphabet: A-Z minus O/I, digits 2-9
const LATIN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Arabic-script alphabet: distinct isolated letters + Arabic-Indic digits
const ARABIC_ALPHABET = 'بتجدرسعفكلمنه٢٣٤٥٦٧٨٩';

// Arabic-script languages use Arabic alphabet for codes
const ARABIC_SCRIPT_LANGUAGES = new Set([Languages.ARABIC, Languages.FARSI, Languages.PASHTO, Languages.URDU]);

function getAlphabetForLanguage(language: Languages): string[] {
  return [...(ARABIC_SCRIPT_LANGUAGES.has(language) ? ARABIC_ALPHABET : LATIN_ALPHABET)];
}

function generateLocalCode(language: Languages): string {
  const chars = getAlphabetForLanguage(language);
  const array = new Uint8Array(6);
  for (let i = 0; i < 6; i++) {
    array[i] = Math.floor(Math.random() * 256);
  }
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

// Bot username — the live production bot (@fajr_mission_bot).
// Mobile has no env layer for this, so it is pinned here; keep it in sync with
// NEXT_PUBLIC_TELEGRAM_BOT_NAME on the web app.
const BOT_USERNAME = 'fajr_mission_bot';

interface TelegramLinkCodeProps {
  patientId: string;
  patientName: string;
  patientLanguage?: string | null;
}

export const TelegramLinkCode: React.FC<TelegramLinkCodeProps> = ({
  patientId,
  patientName,
  patientLanguage,
}) => {
  const colors = useThemeColors();
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Languages>(
    normalizeLanguage(patientLanguage),
  );
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const { isConnected } = useSyncConnection();
  const { service } = usePowerSync();

  const isRtl = isRtlLanguage(selectedLanguage);

  const generateCode = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (isConnected) {
        const token = await getStoredToken();
        if (!token) {
          setError('Not authenticated');
          return;
        }

        const response = await fetch(
          getApiUrl(`/patient/${patientId}/generate-telegram-link-code`),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ language: selectedLanguage }),
          },
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.error || 'Failed to generate code');
          return;
        }

        const data = await response.json();
        setCode(data.code);
        setExpiresAt(data.expiresAt);
      } else {
        const localCode = generateLocalCode(selectedLanguage);
        const id = `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const expires = new Date();
        expires.setDate(expires.getDate() + 7);
        const expiresIso = expires.toISOString();

        await service.execute(
          `INSERT INTO ${TABLES.TELEGRAM_LINK_CODES} (id, code, patient_id, created_by_id, is_used, expires_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, localCode, patientId, '', 0, expiresIso, new Date().toISOString()],
        );

        setCode(localCode);
        setExpiresAt(expiresIso);
        Alert.alert(
          'Code Generated Offline',
          'This code will sync when you reconnect. If the patient sends it before you reconnect, they\'ll be asked to try again shortly.',
        );
      }
    } catch (err: any) {
      console.error('[TelegramLinkCode] Error:', err);
      setError(err.message || 'Failed to generate code');
    } finally {
      setIsGenerating(false);
    }
  }, [patientId, isConnected, service, selectedLanguage]);

  const copyCode = useCallback(() => {
    if (!code) return;
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const copyInstructions = useCallback(() => {
    if (!code) return;
    const instructions = patientInstructions[selectedLanguage](code, BOT_USERNAME);
    Clipboard.setString(instructions);
    Alert.alert('Copied', 'Patient instructions copied to clipboard');
  }, [code, selectedLanguage]);

  const formatExpiry = (iso: string) => {
    const date = new Date(iso);
    const days = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'Expired';
    if (days === 1) return 'Expires tomorrow';
    return `Expires in ${days} days`;
  };

  const deepLink = code ? `https://t.me/${BOT_USERNAME}?start=${code}` : '';

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
    >
      <Link2 size={40} color={colors.textSecondary} />

      <Text style={[styles.title, { color: colors.text }]}>
        Connect to Telegram
      </Text>

      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Generate a code for {patientName} to send to the Telegram bot.
      </Text>

      {!code ? (
        <>
          <TouchableOpacity
            style={[styles.generateButton, { backgroundColor: colors.primary }]}
            onPress={generateCode}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Link2 size={18} color="#fff" />
                <Text style={styles.generateButtonText}>Generate Link Code</Text>
              </>
            )}
          </TouchableOpacity>

          {!isConnected && (
            <Text style={[styles.offlineHint, { color: (colors as any).warning || colors.textSecondary }]}>
              You are offline. Code will sync when you reconnect.
            </Text>
          )}
        </>
      ) : (
        <View style={styles.codeSection}>
          {/* Code display */}
          <View style={[styles.codeBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.codeText, { color: colors.text }]}>
              {code}
            </Text>
          </View>

          {/* Copy button */}
          <TouchableOpacity
            style={[styles.copyButton, { backgroundColor: copied ? colors.success || '#22c55e' : colors.primary }]}
            onPress={copyCode}
          >
            {copied ? (
              <>
                <Check size={16} color="#fff" />
                <Text style={styles.copyButtonText}>Copied!</Text>
              </>
            ) : (
              <>
                <Copy size={16} color="#fff" />
                <Text style={styles.copyButtonText}>Copy Code</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Expiry info */}
          {expiresAt && (
            <Text style={[styles.expiryText, { color: colors.textSecondary }]}>
              {formatExpiry(expiresAt)}
            </Text>
          )}

          {/* QR Code */}
          <View style={[styles.qrContainer, { backgroundColor: '#fff', borderColor: colors.border }]}>
            <Text style={[styles.qrLabel, { color: colors.textSecondary }]}>
              Or scan to open in Telegram:
            </Text>
            <QRCode
              value={deepLink}
              size={180}
              backgroundColor="#fff"
              color="#000"
            />
          </View>

          {/* Language override */}
          <View style={styles.languageSection}>
            <TouchableOpacity
              style={[styles.languageSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowLanguagePicker(!showLanguagePicker)}
            >
              <Globe size={16} color={colors.textSecondary} />
              <Text style={[styles.languageSelectorText, { color: colors.text }]}>
                Patient instructions: {nativeLabels[selectedLanguage]}
              </Text>
              <ChevronDown size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {showLanguagePicker && (
              <View style={[styles.languageList, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {LanguagesList.map((lang: string) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.languageOption,
                      selectedLanguage === lang && { backgroundColor: colors.primary + '20' },
                    ]}
                    onPress={() => {
                      setSelectedLanguage(lang as Languages);
                      setShowLanguagePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.languageOptionText,
                      { color: selectedLanguage === lang ? colors.primary : colors.text },
                    ]}>
                      {nativeLabels[lang as Languages]} ({lang})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Patient instructions in selected language */}
          <View style={[styles.instructionBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.instructionHeader}>
              <Text style={[styles.instructionTitle, { color: colors.text }]}>
                Patient Instructions ({nativeLabels[selectedLanguage]})
              </Text>
              <TouchableOpacity onPress={copyInstructions}>
                <Copy size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text
              style={[
                styles.instructionText,
                { color: colors.textSecondary },
                isRtl && { textAlign: 'right', writingDirection: 'rtl' },
              ]}
            >
              {patientInstructions[selectedLanguage](code, BOT_USERNAME)}
            </Text>
          </View>

          {/* Regenerate */}
          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={() => {
              setCode(null);
              setExpiresAt(null);
            }}
          >
            <RefreshCw size={14} color={colors.textSecondary} />
            <Text style={[styles.regenerateText, { color: colors.textSecondary }]}>
              Generate new code
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <Text style={[styles.errorText, { color: colors.error || '#ef4444' }]}>
          {error}
        </Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.5,
    marginBottom: spacing.lg,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  offlineHint: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  codeSection: {
    alignItems: 'center',
    width: '100%',
  },
  codeBox: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  codeText: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  copyButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  expiryText: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.md,
  },
  qrContainer: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  qrLabel: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  languageSection: {
    width: '100%',
    marginBottom: spacing.md,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  languageSelectorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  languageList: {
    marginTop: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  languageOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  languageOptionText: {
    fontSize: typography.fontSize.sm,
  },
  instructionBox: {
    width: '100%',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  instructionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  instructionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  instructionText: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.6,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  regenerateText: {
    fontSize: typography.fontSize.sm,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default TelegramLinkCode;
