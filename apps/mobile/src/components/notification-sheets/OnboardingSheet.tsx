// apps/mobile/src/components/notification-sheets/OnboardingSheet.tsx
// Welcome sheet shown when a user taps a profile_update_approved notification.
// Offers a "Contact Admin" button that creates a group thread with all admins.

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MessageCircle, CheckCircle } from 'lucide-react-native';
import axios from 'axios';
import { BottomSheet } from '../BottomSheet';
import { useThemeColors } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { getApiUrl } from '../../config';
import { storageUtils } from '../../utils/storage';
import { useNavigation, CommonActions } from '@react-navigation/native';

interface OnboardingSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function OnboardingSheet({ visible, onClose }: OnboardingSheetProps) {
  const colors = useThemeColors();
  const { user } = useAuth();
  const navigation = useNavigation();
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  const handleContactAdmin = async () => {
    setIsCreatingThread(true);
    try {
      const token = storageUtils.getToken();
      const res = await axios.post(
        getApiUrl('/internal-messages/contact-admin'),
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        },
      );

      const threadId = res.data.threadId;
      onClose();

      // Navigate to Messages tab with the thread open
      navigation.dispatch(
        CommonActions.navigate({
          name: 'Messages',
          params: { openThreadId: threadId },
        }),
      );
    } catch {
      Alert.alert(
        'Unable to reach admin',
        'Please try again later or check your connection.',
      );
    } finally {
      setIsCreatingThread(false);
    }
  };

  const firstName = user?.firstName || 'there';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Welcome!"
      snapPoint={70}
      showHandle
      showCloseButton
    >
      <View style={styles.container}>
        {/* Hero section */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.success + '15' },
            ]}
          >
            <CheckCircle size={40} color={colors.success} />
          </View>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            Welcome, {firstName}!
          </Text>
          <Text style={[styles.welcomeBody, { color: colors.textSecondary }]}>
            Your account has been approved. You now have full access to Fajr
            Mission EMR. If you have any questions, feel free to reach out to
            the admin team below.
          </Text>
        </View>

        {/* Contact Admin button */}
        <TouchableOpacity
          style={[styles.contactButton, { backgroundColor: colors.primary }]}
          onPress={handleContactAdmin}
          disabled={isCreatingThread}
        >
          {isCreatingThread ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <MessageCircle size={18} color={colors.textInverse} />
              <Text style={[styles.contactButtonText, { color: colors.textInverse }]}>Contact Admin</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Dismiss */}
        <TouchableOpacity style={styles.dismissButton} onPress={onClose}>
          <Text style={[styles.dismissText, { color: colors.textSecondary }]}>
            Maybe later
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.md,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  welcomeTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  welcomeBody: {
    fontSize: typography.fontSize.base,
    lineHeight: 22,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  contactButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  dismissText: {
    fontSize: typography.fontSize.sm,
  },
});
