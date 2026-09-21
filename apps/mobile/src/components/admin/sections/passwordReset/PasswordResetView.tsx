// apps/mobile/src/components/admin/sections/passwordReset/PasswordResetView.tsx
// View for password reset functionality

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard,
  StyleSheet,
} from 'react-native';
import {
  Search,
  Key,
  Mail,
  Trash2,
  Copy,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  MapPin,
  Briefcase,
  X,
} from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import {
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../../../../utils/theme';
import { usePasswordResetViewModel } from '../../../../viewModels/admin/usePasswordResetViewModel';
import { LoadingState, EmptyState } from '../../shared';

export const PasswordResetView: React.FC = () => {
  const colors = useThemeColors();
  const {
    searchQuery,
    setSearchQuery,
    selectedUser,
    isSearching,
    isGeneratingLink,
    isSendingEmail,
    isClearingLinks,
    error,
    searchUser,
    generateResetLink,
    sendResetEmail,
    clearExpiredLinks,
    clearSelectedUser,
    isLinkExpired,
  } = usePasswordResetViewModel();

  const [linkCopied, setLinkCopied] = useState(false);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      Alert.alert('Validation Error', 'Please enter an email address');
      return;
    }
    searchUser();
  };

  const handleGenerateLink = async () => {
    try {
      await generateResetLink();
      Alert.alert('Success', 'Password reset link generated successfully');
    } catch {
      Alert.alert('Error', 'Failed to generate reset link');
    }
  };

  const handleSendEmail = async () => {
    Alert.alert('Send Reset Email', 'Send password reset email to this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          try {
            await sendResetEmail();
            Alert.alert('Success', 'Password reset email sent successfully');
          } catch {
            Alert.alert('Error', 'Failed to send reset email');
          }
        },
      },
    ]);
  };

  const handleClearExpiredLinks = async () => {
    Alert.alert(
      'Clear Expired Links',
      'Clear all expired password reset links from the system?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              const count = await clearExpiredLinks();
              Alert.alert('Success', `Cleared ${count} expired link(s)`);
            } catch {
              Alert.alert('Error', 'Failed to clear expired links');
            }
          },
        },
      ],
    );
  };

  const handleCopyLink = () => {
    if (selectedUser?.resetLink) {
      Clipboard.setString(selectedUser.resetLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Search Section */}
      <View
        style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Search User
        </Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.backgroundSecondary,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Enter user email..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            keyboardType="email-address"
            autoCapitalize="none"
            onSubmitEditing={handleSearch}
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                clearSelectedUser();
              }}
              style={styles.clearButton}
            >
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          style={[
            styles.button,
            styles.primaryButton,
            {
              backgroundColor: colors.primary,
              opacity: isSearching || !searchQuery.trim() ? 0.5 : 1,
            },
          ]}
        >
          <Search size={18} color={colors.textInverse} />
          <Text style={[styles.buttonText, styles.primaryButtonText, { color: colors.textInverse }]}>
            {isSearching ? 'Searching...' : 'Search'}
          </Text>
        </TouchableOpacity>

        {error && !selectedUser && (
          <View
            style={[
              styles.errorBanner,
              { backgroundColor: colors.error + '15' },
            ]}
          >
            <AlertCircle size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>
              {error.message}
            </Text>
          </View>
        )}
      </View>

      {/* Loading State */}
      {isSearching && <LoadingState message="Searching for user..." />}

      {/* User Details Section */}
      {selectedUser && !isSearching && (
        <View
          style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              User Details
            </Text>
            <TouchableOpacity onPress={clearSelectedUser}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary + '20' },
              ]}
            >
              <User size={32} color={colors.primary} />
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>
              {selectedUser.firstName} {selectedUser.lastName}
            </Text>
          </View>

          {/* User Info */}
          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Mail size={16} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Email
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {selectedUser.email}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Briefcase size={16} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Account Type
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {selectedUser.accountType}
                </Text>
              </View>
            </View>

            {selectedUser.country && (
              <View style={styles.infoRow}>
                <MapPin size={16} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text
                    style={[styles.infoLabel, { color: colors.textSecondary }]}
                  >
                    Country
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {selectedUser.country}
                  </Text>
                </View>
              </View>
            )}

            {selectedUser.doctorSpecialty &&
              selectedUser.doctorSpecialty.length > 0 && (
                <View style={styles.infoRow}>
                  <Briefcase size={16} color={colors.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text
                      style={[
                        styles.infoLabel,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Specialty
                    </Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>
                      {selectedUser.doctorSpecialty.join(', ')}
                    </Text>
                  </View>
                </View>
              )}

            {selectedUser.approvalDate && (
              <View style={styles.infoRow}>
                <Calendar size={16} color={colors.textSecondary} />
                <View style={styles.infoContent}>
                  <Text
                    style={[styles.infoLabel, { color: colors.textSecondary }]}
                  >
                    Approval Date
                  </Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {formatDate(selectedUser.approvalDate)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <Key size={16} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Password Resets
                </Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {selectedUser.passwordResetCount || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Reset Link Section */}
          {selectedUser.resetLink ? (
            <View style={styles.resetLinkSection}>
              <View
                style={[
                  styles.linkContainer,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Text
                  style={[styles.linkLabel, { color: colors.textSecondary }]}
                >
                  Reset Link:
                </Text>
                <Text
                  style={[styles.linkText, { color: colors.primary }]}
                  numberOfLines={2}
                  ellipsizeMode="middle"
                >
                  {selectedUser.resetLink}
                </Text>
                <TouchableOpacity
                  onPress={handleCopyLink}
                  style={[
                    styles.copyButton,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  {linkCopied ? (
                    <CheckCircle size={16} color={colors.textInverse} />
                  ) : (
                    <Copy size={16} color={colors.textInverse} />
                  )}
                  <Text style={[styles.copyButtonText, { color: colors.textInverse }]}>
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text
                style={[styles.expiryText, { color: colors.textSecondary }]}
              >
                Expires: {formatDateTime(selectedUser.resetLinkExpiration)}
              </Text>

              {isLinkExpired && (
                <View
                  style={[
                    styles.warningBanner,
                    { backgroundColor: colors.error + '15' },
                  ]}
                >
                  <AlertCircle size={16} color={colors.error} />
                  <Text style={[styles.warningText, { color: colors.error }]}>
                    This link has expired. Please generate a new one.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleGenerateLink}
              disabled={isGeneratingLink}
              style={[
                styles.button,
                styles.primaryButton,
                {
                  backgroundColor: colors.primary,
                  opacity: isGeneratingLink ? 0.5 : 1,
                },
              ]}
            >
              <Key size={18} color={colors.textInverse} />
              <Text style={[styles.buttonText, styles.primaryButtonText, { color: colors.textInverse }]}>
                {isGeneratingLink ? 'Generating...' : 'Generate Reset Link'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Send Email Button */}
          <TouchableOpacity
            onPress={handleSendEmail}
            disabled={isSendingEmail}
            style={[
              styles.button,
              styles.secondaryButton,
              {
                backgroundColor: colors.backgroundSecondary,
                opacity: isSendingEmail ? 0.5 : 1,
              },
            ]}
          >
            <Mail size={18} color={colors.primary} />
            <Text style={[styles.buttonText, { color: colors.primary }]}>
              {isSendingEmail ? 'Sending...' : 'Send Password Reset Email'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Maintenance Section */}
      <View
        style={[styles.card, { backgroundColor: colors.surface }, shadows.sm]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>
          Maintenance
        </Text>

        <TouchableOpacity
          onPress={handleClearExpiredLinks}
          disabled={isClearingLinks}
          style={[
            styles.button,
            styles.dangerButton,
            {
              backgroundColor: colors.error + '15',
              opacity: isClearingLinks ? 0.5 : 1,
            },
          ]}
        >
          <Trash2 size={18} color={colors.error} />
          <Text style={[styles.buttonText, { color: colors.error }]}>
            {isClearingLinks ? 'Clearing...' : 'Clear Expired Links'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Empty State */}
      {!selectedUser && !isSearching && !error && searchQuery.length === 0 && (
        <EmptyState
          icon={Key}
          title="Password Reset"
          message="Search for a user by email to generate a password reset link or send a reset email"
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  searchInput: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingRight: spacing.xxxl,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: typography.fontSize.base,
  },
  clearButton: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryButton: {},
  secondaryButton: {},
  dangerButton: {},
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  primaryButtonText: {},
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  infoGrid: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
  },
  resetLinkSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  linkContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  linkLabel: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  linkText: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.md,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  copyButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  expiryText: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
});
