// apps/mobile/src/components/admin/sections/existingUsers/UserDetailsModal.tsx
// Modal for viewing and editing user details

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { X, Save, User, Mail, MapPin, Calendar, Briefcase } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '../../../../utils/theme';
import type { ExistingUserSummary } from '../../../../types/admin';

interface UserDetailsModalProps {
  visible: boolean;
  user: ExistingUserSummary;
  onClose: () => void;
  onSave: (userId: string, data: Partial<ExistingUserSummary>) => Promise<void>;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  visible,
  user,
  onClose,
  onSave,
}) => {
  const colors = useThemeColors();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [accountType, setAccountType] = useState(user.accountType);

  // Reset form when user changes
  useEffect(() => {
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setAccountType(user.accountType);
    setIsEditing(false);
  }, [user]);

  const handleSave = async () => {
    // Validate
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSaving(true);
      await onSave(user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        accountType,
      });
      setIsEditing(false);
    } catch {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setAccountType(user.accountType);
    setIsEditing(false);
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modal,
                { backgroundColor: colors.surface },
                shadows.xl,
              ]}
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>
                  User Details
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                    <User size={48} color={colors.primary} />
                  </View>
                </View>

                {/* Form Fields */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Basic Information
                  </Text>

                  {/* First Name */}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      First Name *
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.backgroundSecondary,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      value={firstName}
                      onChangeText={setFirstName}
                      editable={isEditing}
                      placeholder="Enter first name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  {/* Last Name */}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      Last Name *
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.backgroundSecondary,
                          color: colors.text,
                          borderColor: colors.border,
                        },
                      ]}
                      value={lastName}
                      onChangeText={setLastName}
                      editable={isEditing}
                      placeholder="Enter last name"
                      placeholderTextColor={colors.textSecondary}
                    />
                  </View>

                  {/* Email */}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      Email *
                    </Text>
                    <View style={styles.fieldWithIcon}>
                      <Mail size={16} color={colors.textSecondary} />
                      <TextInput
                        style={[
                          styles.inputWithIcon,
                          {
                            backgroundColor: colors.backgroundSecondary,
                            color: colors.text,
                            borderColor: colors.border,
                          },
                        ]}
                        value={email}
                        onChangeText={setEmail}
                        editable={isEditing}
                        placeholder="Enter email"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {/* Account Type */}
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                      Account Type
                    </Text>
                    <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                      <Briefcase size={14} color={colors.primary} />
                      <Text style={[styles.badgeText, { color: colors.primary }]}>
                        {accountType}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Additional Info */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Additional Information
                  </Text>

                  {/* Location */}
                  {user.countries && user.countries.length > 0 && (
                    <View style={styles.infoRow}>
                      <MapPin size={16} color={colors.textSecondary} />
                      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        {user.countries.join(', ')}
                      </Text>
                    </View>
                  )}

                  {/* Specialties */}
                  {user.doctorSpecialty && user.doctorSpecialty.length > 0 && (
                    <View style={styles.field}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>
                        Specialties
                      </Text>
                      <View style={styles.specialtyContainer}>
                        {user.doctorSpecialty.map((specialty, index) => (
                          <View
                            key={index}
                            style={[
                              styles.specialtyBadge,
                              { backgroundColor: colors.backgroundSecondary },
                            ]}
                          >
                            <Text style={[styles.specialtyText, { color: colors.text }]}>
                              {specialty}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Approval Date */}
                  {user.approvalDate && (
                    <View style={styles.infoRow}>
                      <Calendar size={16} color={colors.textSecondary} />
                      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Approved on {formatDate(user.approvalDate)}
                      </Text>
                    </View>
                  )}

                  {/* Authorization Status */}
                  <View style={styles.infoRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: user.authorized
                            ? colors.success + '20'
                            : colors.error + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: user.authorized ? colors.success : colors.error },
                        ]}
                      >
                        {user.authorized ? 'Authorized' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>

              {/* Actions */}
              <View style={[styles.actions, { borderTopColor: colors.border }]}>
                {isEditing ? (
                  <>
                    <TouchableOpacity
                      onPress={handleCancel}
                      disabled={isSaving}
                      style={[
                        styles.button,
                        styles.cancelButton,
                        {
                          backgroundColor: colors.backgroundSecondary,
                          opacity: isSaving ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.buttonText, { color: colors.text }]}>
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleSave}
                      disabled={isSaving}
                      style={[
                        styles.button,
                        styles.saveButton,
                        {
                          backgroundColor: colors.primary,
                          opacity: isSaving ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Save size={16} color={colors.textInverse} />
                      <Text style={[styles.buttonText, styles.saveButtonText, { color: colors.textInverse }]}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    onPress={() => setIsEditing(true)}
                    style={[
                      styles.button,
                      styles.editButton,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.buttonText, styles.editButtonText, { color: colors.textInverse }]}>
                      Edit User
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    maxHeight: '90%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  content: {
    maxHeight: 600,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.xs,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: typography.fontSize.base,
  },
  fieldWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputWithIcon: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    fontSize: typography.fontSize.base,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  badgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: typography.fontSize.base,
  },
  specialtyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  specialtyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  specialtyText: {
    fontSize: typography.fontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  cancelButton: {},
  saveButton: {},
  editButton: {},
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  saveButtonText: {},
  editButtonText: {},
});
