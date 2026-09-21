import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import {
  Settings,
  Plus,
  Pencil,
  Key,
  ShieldCheck,
  FileText,
  Camera,
  Globe,
  Mic,
  Download,
  MessageSquare,
  RefreshCw,
  CloudCheck,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfileViewModel } from './useProfileViewModel';
import { useAuth } from '../../contexts/AuthContext';
import { useDownloadProgress } from '../../contexts/DownloadProgressContext';
import type { Theme } from '../../utils/theme';
import { spacing, typography } from '../../utils/theme';
import { SettingsSheet } from '../settings/SettingsSheet';
import { DownloadProgressBadge } from '../../components/ui/DownloadProgressBadge';
import { RoleIcon } from '../../components/ui/RoleIcon';

// Import new profile components
import {
  PasskeyManagementSheet,
  TotpManagementSheet,
  MedicalLicenseSheet,
  MedicalLicenseUploadSheet,
  PhotoUploadSheet,
  LanguagePickerSheet,
  CountryPickerSheet,
  SpecialtyPickerSheet,
  ModelDownloadsSheet,
  AudioRecorderTestSheet,
  FeedbackSheet,
  MyFeedbackSheet,
  MissionInfoSheet,
  MissionEnrollmentSheet,
  SyncStatusSheet,
} from './components';
import { useMissions, useMyMissions, type MissionOption } from '../../hooks/useMissions';
import { formatDiagnosticsDescription } from '../../utils/gatherSyncDiagnostics';
import type { FeedbackPrefill } from './components/FeedbackSheet';
import { usePowerSyncQuery, useSyncStatus } from '../../hooks/powersync';
import { TABLES } from '../../db';
import { FeatureFlags } from '../../config/featureFlags';

interface ProfileScreenViewProps {
  onLogout?: () => void;
}

export default function ProfileScreenView({
  onLogout,
}: ProfileScreenViewProps) {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { downloads, isAnyDownloading, totalProgress, downloadCount } = useDownloadProgress();
  const styles = createStyles(theme);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sheet visibility states
  const [isPasskeySheetOpen, setIsPasskeySheetOpen] = useState(false);
  const [isTotpSheetOpen, setIsTotpSheetOpen] = useState(false);
  const [isMedicalLicenseSheetOpen, setIsMedicalLicenseSheetOpen] = useState(false);
  const [isMedicalLicenseUploadSheetOpen, setIsMedicalLicenseUploadSheetOpen] = useState(false);
  const [isPhotoUploadSheetOpen, setIsPhotoUploadSheetOpen] = useState(false);
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = useState(false);
  const [isCountryPickerOpen, setIsCountryPickerOpen] = useState(false);
  const [isSpecialtyPickerOpen, setIsSpecialtyPickerOpen] = useState(false);
  const [isModelDownloadsSheetOpen, setIsModelDownloadsSheetOpen] = useState(false);
  const [isAudioRecorderTestSheetOpen, setIsAudioRecorderTestSheetOpen] = useState(false);
  const [isFeedbackSheetOpen, setIsFeedbackSheetOpen] = useState(false);
  const [isMyFeedbackSheetOpen, setIsMyFeedbackSheetOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<MissionOption | null>(null);
  const [isMissionEnrollmentOpen, setIsMissionEnrollmentOpen] = useState(false);
  const [isSyncSheetOpen, setIsSyncSheetOpen] = useState(false);
  const [is2faExpanded, setIs2faExpanded] = useState(false);
  const [feedbackPrefill, setFeedbackPrefill] = useState<FeedbackPrefill | undefined>();

  const {
    profile,
    formData,
    isLoading,
    isEditing,
    isSaving,
    error,
    setIsEditing,
    updateFormData,
    handleSave,
    handleCancel,
    refreshProfile,
    removeSpecialty,
    removeLanguage,
    removeCountry,
  } = useProfileViewModel(user?.id || '');

  // Missions data from PowerSync (offline) — query user's missions column directly
  const userMissionsQuery = usePowerSyncQuery<{ missions: string | null }>(
    `SELECT missions FROM ${TABLES.USERS} WHERE id = ? LIMIT 1`,
    [user?.id || ''],
  );
  const rawUserMissions = userMissionsQuery.data?.[0]?.missions;
  const userMissionIds: string[] | null = (() => {
    if (!rawUserMissions) return null;
    try { return JSON.parse(rawUserMissions); } catch { return null; }
  })();
  const { missions: myMissions, loading: myMissionsLoading } = useMyMissions(userMissionIds);
  const { missions: allMissions, loading: allMissionsLoading } = useMissions();
  const { isDownloading: isSyncDownloading, isConnecting: isSyncConnecting } = useSyncStatus({
    pollInterval: 2500,
    enableDetailedLogging: false,
  });

  // Spinning animation for sync icon
  const isSyncActive = isSyncDownloading || isSyncConnecting;
  const syncRotation = useSharedValue(0);
  React.useEffect(() => {
    if (isSyncActive) {
      syncRotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(syncRotation);
      syncRotation.value = withTiming(0, { duration: 300 });
    }
  }, [isSyncActive]);
  const syncIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${syncRotation.value}deg` }],
  }));

  const shouldUseMissionFallback = !userMissionIds &&
    (userMissionsQuery.isLoading || isSyncDownloading || isSyncConnecting);
  const missionsToRender: MissionOption[] = userMissionIds
    ? myMissions
    : shouldUseMissionFallback
      ? allMissions
      : [];
  const missionSectionLoading = userMissionsQuery.isLoading || myMissionsLoading || allMissionsLoading;
  // Always show the section — zero-mission users need the edit affordance to enroll
  const shouldShowMissionsSection = true;

  // Define handleLogout BEFORE the conditional returns so it's always available
  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('🚪 Logging out...');
            await logout();
            console.log('✅ Logout successful from AuthContext');
            // Call the optional onLogout prop if provided
            onLogout?.();
          } catch (err) {
            console.error('❌ Logout error:', err);
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  // Handle language selection
  const handleLanguageSelectionChange = (languages: string[]) => {
    updateFormData('languages', languages);
  };

  // Handle country selection
  const handleCountrySelectionChange = (countries: string[]) => {
    updateFormData('countries', countries);
  };

  // Handle specialty selection
  const handleSpecialtySelectionChange = (specialties: string[]) => {
    updateFormData('doctorSpecialty', specialties);
  };

  // Handle photo update
  const handlePhotoUpdated = (imageUrl?: string) => {
    if (formData) {
      updateFormData('image', imageUrl);
    }
    refreshProfile();
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity
              onPress={() => setIsSettingsOpen(true)}
              style={styles.settingsButton}
            >
              <Settings size={24} color={theme.colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {/* Logout Button in Loading State */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity
              style={styles.logoutButtonTop}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonTopText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
            <TouchableOpacity
              onPress={() => setIsSettingsOpen(true)}
              style={styles.settingsButton}
            >
              <Settings size={24} color={theme.colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {/* Logout Button in Error State */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity
              style={styles.logoutButtonTop}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonTopText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={[styles.actionButton, { marginTop: spacing.md }]}
              onPress={refreshProfile}
            >
              <Text style={styles.actionButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Check for profile/formData after defining handleLogout
  if (!profile || !formData) {
    return null;
  }

  // Move these inside the main render after the checks
  const handleSavePress = async () => {
    await handleSave();
  };

  const handleEditPress = () => {
    setIsEditing(true);
  };

  const handleCancelPress = () => {
    handleCancel();
  };

  const renderReadOnlyField = (label: string, value: string) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  );

  const renderEditableField = (
    label: string,
    field: keyof typeof formData,
    placeholder: string,
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={formData[field] as string}
        onChangeText={value => updateFormData(field, value)}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
      />
    </View>
  );

  const renderGenderPicker = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Gender</Text>
      {isEditing ? (
        <View style={styles.pickerContainer}>
          <TouchableOpacity
            style={[
              styles.pickerOption,
              formData.gender === 'Male' && styles.pickerOptionSelected,
            ]}
            onPress={() => updateFormData('gender', 'Male')}
          >
            <Text
              style={[
                styles.pickerOptionText,
                formData.gender === 'Male' && styles.pickerOptionTextSelected,
              ]}
            >
              Male
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.pickerOption,
              formData.gender === 'Female' && styles.pickerOptionSelected,
            ]}
            onPress={() => updateFormData('gender', 'Female')}
          >
            <Text
              style={[
                styles.pickerOptionText,
                formData.gender === 'Female' && styles.pickerOptionTextSelected,
              ]}
            >
              Female
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.fieldValue}>
          {formData.gender || 'Not specified'}
        </Text>
      )}
    </View>
  );

  const renderAccountTypePicker = () => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>Account Type</Text>
      {isEditing && user.isAdmin ? (
        <View style={styles.pickerContainer}>
          {(['Doctor', 'Triage'] as const).map(type => {
            const isSelected = formData.accountType === type;

            return (
              <TouchableOpacity
                key={type}
                style={[
                  styles.pickerOption,
                  isSelected && styles.pickerOptionSelected,
                ]}
                onPress={() => updateFormData('accountType', type)}
              >
                <RoleIcon
                  accountType={type}
                  size={16}
                  {...(isSelected ? { color: theme.colors.textInverse } : {})}
                />
                <Text
                  style={[
                    styles.pickerOptionText,
                    isSelected && styles.pickerOptionTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.fieldValueRow}>
          <RoleIcon accountType={formData.accountType} size={16} />
          <Text style={styles.fieldValue}>{formData.accountType}</Text>
        </View>
      )}
    </View>
  );

  const renderChipListWithAdd = (
    label: string,
    items: string[],
    onRemove?: (item: string) => void,
    onAdd?: () => void,
  ) => (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {isEditing && onAdd && (
          <TouchableOpacity
            style={styles.addChipButton}
            onPress={onAdd}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Plus size={18} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.chipContainer}>
        {items.map((item, index) => (
          <View key={index} style={styles.chip}>
            <Text style={styles.chipText}>{item}</Text>
            {isEditing && onRemove && (
              <TouchableOpacity
                onPress={() => onRemove(item)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.chipRemove}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {items.length === 0 && (
          <Text style={styles.emptyChipText}>None selected</Text>
        )}
      </View>
    </View>
  );

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'Not specified';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isDoctor = formData.accountType === 'Doctor';
  const hasProfileImage = !!formData.image;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.headerRight}>
            {!isEditing && (
              <TouchableOpacity onPress={handleEditPress}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            )}
            {(FeatureFlags.OFFLINE_TRANSLATION || FeatureFlags.VOICE_DICTATION) && (
              <View>
                <TouchableOpacity
                  onPress={() => setIsModelDownloadsSheetOpen(true)}
                  style={styles.settingsButton}
                >
                  <Download size={22} color={theme.colors.text} strokeWidth={2} />
                </TouchableOpacity>
                {isAnyDownloading && (
                  <View style={styles.headerDownloadBadge}>
                    <DownloadProgressBadge
                      progress={totalProgress}
                      count={downloadCount}
                      size={20}
                      color={theme.colors.primary}
                      onPress={() => setIsModelDownloadsSheetOpen(true)}
                    />
                  </View>
                )}
              </View>
            )}
            <TouchableOpacity
              onPress={() => setIsSyncSheetOpen(true)}
              style={styles.settingsButton}
            >
              {isSyncActive ? (
                <Animated.View style={syncIconStyle}>
                  <RefreshCw size={22} color={theme.colors.primary} strokeWidth={2} />
                </Animated.View>
              ) : (
                <CloudCheck size={22} color={theme.colors.success} strokeWidth={2} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsSettingsOpen(true)}
              style={styles.settingsButton}
            >
              <Settings size={24} color={theme.colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <TouchableOpacity
              style={styles.logoutButtonTop}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonTopText}>Logout</Text>
            </TouchableOpacity>
          </View>

          {/* Active Downloads Section */}
          {isAnyDownloading && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Active Downloads</Text>
              <View style={styles.sectionContent}>
                {downloads.map(dl => {
                  const pctText = `${Math.round(dl.progress * 100)}%`;
                  const icon =
                    dl.type === 'voice' ? (
                      <Mic size={18} color={theme.colors.primary} />
                    ) : dl.type === 'translation' ? (
                      <Globe size={18} color={theme.colors.primary} />
                    ) : (
                      <Download size={18} color={theme.colors.primary} />
                    );
                  return (
                    <View key={dl.id} style={styles.downloadRow}>
                      <View style={styles.downloadRowLeft}>
                        <View style={styles.downloadRowIcon}>{icon}</View>
                        <Text style={styles.downloadRowLabel} numberOfLines={1}>
                          {dl.label}
                        </Text>
                      </View>
                      <View style={styles.downloadRowRight}>
                        <View style={styles.downloadProgressBarBg}>
                          <View
                            style={[
                              styles.downloadProgressBarFill,
                              {
                                width: `${Math.round(dl.progress * 100)}%`,
                                backgroundColor: theme.colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.downloadRowPct}>{pctText}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Profile Avatar - Now tappable */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarTouchable}
              onPress={() => setIsPhotoUploadSheetOpen(true)}
              activeOpacity={0.8}
            >
              {hasProfileImage ? (
                <Image
                  source={{ uri: formData.image ?? undefined }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarContainer}>
                  <Text style={styles.avatarText}>
                    {formData.firstName.charAt(0)}
                    {formData.lastName.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={styles.avatarCameraOverlay}>
                <Camera size={16} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>
              {formData.accountType === 'Doctor' ? 'Dr. ' : ''}
              {formData.firstName} {formData.lastName}
            </Text>
            <Text style={styles.userEmail}>{formData.email}</Text>
            {user.isAdmin && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>

          {/* Personal Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.sectionContent}>
              {isEditing ? (
                <>
                  {renderEditableField(
                    'First Name',
                    'firstName',
                    'Enter first name',
                  )}
                  {renderEditableField(
                    'Last Name',
                    'lastName',
                    'Enter last name',
                  )}
                </>
              ) : (
                <>
                  {renderReadOnlyField(
                    'Name',
                    `${formData.firstName} ${formData.lastName}`,
                  )}
                </>
              )}

              {renderGenderPicker()}

              {renderReadOnlyField('Date of Birth', formatDate(formData.dob))}

              {isEditing
                ? renderEditableField('City', 'city', 'Enter city')
                : renderReadOnlyField('City', formData.city || 'Not specified')}
            </View>
          </View>

          {/* Professional Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Details</Text>
            <View style={styles.sectionContent}>
              {renderAccountTypePicker()}

              {renderChipListWithAdd(
                'Languages',
                formData.languages || [],
                isEditing ? removeLanguage : undefined,
                isEditing ? () => setIsLanguagePickerOpen(true) : undefined,
              )}

              {renderChipListWithAdd(
                'Countries',
                formData.countries || [],
                isEditing ? removeCountry : undefined,
                isEditing ? () => setIsCountryPickerOpen(true) : undefined,
              )}

              {isDoctor &&
                renderChipListWithAdd(
                  'Specialties',
                  formData.doctorSpecialty || [],
                  isEditing ? removeSpecialty : undefined,
                  isEditing ? () => setIsSpecialtyPickerOpen(true) : undefined,
                )}
            </View>
          </View>

          {/* My Missions */}
          {shouldShowMissionsSection && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>My Missions</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  {shouldUseMissionFallback && (
                    <View style={styles.syncBadge}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                      <Text style={styles.syncBadgeText}>Syncing assignments…</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={() => setIsMissionEnrollmentOpen(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Edit missions"
                  >
                    <Pencil size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.sectionContent}>
                {missionSectionLoading && missionsToRender.length === 0 ? (
                  <Text style={styles.menuItemSubtitle}>
                    Loading missions from offline sync...
                  </Text>
                ) : missionsToRender.length === 0 ? (
                  <Text style={styles.menuItemSubtitle}>
                    You're not enrolled in any missions yet. Tap the pencil to request to join one.
                  </Text>
                ) : missionsToRender.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.menuItem}
                    onPress={() => setSelectedMission(m)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View
                        style={[
                          styles.menuItemIcon,
                          { backgroundColor: theme.colors.primary + '15' },
                        ]}
                      >
                        <Globe size={20} color={theme.colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.menuItemTitle}>{m.name}</Text>
                        <Text style={styles.menuItemSubtitle}>
                          {m.country}{m.city ? `, ${m.city}` : ''}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Security Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Security</Text>
            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setIs2faExpanded(prev => !prev)}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <View
                    style={[
                      styles.menuItemIcon,
                      { backgroundColor: theme.colors.primary + '15' },
                    ]}
                  >
                    <ShieldCheck size={20} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.menuItemTitle}>Manage 2FA</Text>
                    <Text style={styles.menuItemSubtitle}>
                      Passkeys & authenticator app
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>
                  {is2faExpanded ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {is2faExpanded && (
                <>
                  <TouchableOpacity
                    style={[styles.menuItem, { paddingLeft: spacing.xl }]}
                    onPress={() => setIsPasskeySheetOpen(true)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View
                        style={[
                          styles.menuItemIcon,
                          { backgroundColor: theme.colors.primary + '15' },
                        ]}
                      >
                        <Key size={20} color={theme.colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.menuItemTitle}>Passkey Management</Text>
                        <Text style={styles.menuItemSubtitle}>
                          Manage your secure sign-in methods
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuItem, { paddingLeft: spacing.xl }]}
                    onPress={() => setIsTotpSheetOpen(true)}
                  >
                    <View style={styles.menuItemLeft}>
                      <View
                        style={[
                          styles.menuItemIcon,
                          { backgroundColor: theme.colors.primary + '15' },
                        ]}
                      >
                        <ShieldCheck size={20} color={theme.colors.primary} />
                      </View>
                      <View>
                        <Text style={styles.menuItemTitle}>Authenticator App</Text>
                        <Text style={styles.menuItemSubtitle}>
                          Manage two-factor authentication
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* AI Model Downloads Section */}
          {(FeatureFlags.OFFLINE_TRANSLATION || FeatureFlags.VOICE_DICTATION) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Models</Text>
              <View style={styles.sectionContent}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setIsModelDownloadsSheetOpen(true)}
                >
                  <View style={styles.menuItemLeft}>
                    <View
                      style={[
                        styles.menuItemIcon,
                        { backgroundColor: theme.colors.primary + '15' },
                      ]}
                    >
                      <Download size={20} color={theme.colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.menuItemTitle}>
                        AI Model Downloads
                      </Text>
                      <Text style={styles.menuItemSubtitle}>
                        Translation & voice dictation models
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Medical License Section (Doctors only) */}
          {isDoctor && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Medical License</Text>
              <View style={styles.sectionContent}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setIsMedicalLicenseSheetOpen(true)}
                >
                  <View style={styles.menuItemLeft}>
                    <View
                      style={[
                        styles.menuItemIcon,
                        { backgroundColor: theme.colors.success + '15' },
                      ]}
                    >
                      <FileText size={20} color={theme.colors.success} />
                    </View>
                    <View>
                      <Text style={styles.menuItemTitle}>
                        View & Upload Licenses
                      </Text>
                      <Text style={styles.menuItemSubtitle}>
                        Manage your medical credentials
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Feedback & Support */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Feedback & Support</Text>
            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setIsFeedbackSheetOpen(true)}
              >
                <View style={styles.menuItemLeft}>
                  <View
                    style={[
                      styles.menuItemIcon,
                      { backgroundColor: theme.colors.primary + '15' },
                    ]}
                  >
                    <MessageSquare size={20} color={theme.colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.menuItemTitle}>Submit Feedback</Text>
                    <Text style={styles.menuItemSubtitle}>
                      Report bugs, request features, or ask questions
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setIsMyFeedbackSheetOpen(true)}
              >
                <View style={styles.menuItemLeft}>
                  <View
                    style={[
                      styles.menuItemIcon,
                      { backgroundColor: theme.colors.info + '15' },
                    ]}
                  >
                    <MessageSquare size={20} color={theme.colors.info} />
                  </View>
                  <View>
                    <Text style={styles.menuItemTitle}>My Submissions</Text>
                    <Text style={styles.menuItemSubtitle}>
                      View your feedback history and responses
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Developer Tools */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Developer Tools</Text>
            <View style={styles.sectionContent}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setIsAudioRecorderTestSheetOpen(true)}
              >
                <View style={styles.menuItemLeft}>
                  <View
                    style={[
                      styles.menuItemIcon,
                      { backgroundColor: theme.colors.textSecondary + '15' },
                    ]}
                  >
                    <Mic size={20} color={theme.colors.textSecondary} />
                  </View>
                  <View>
                    <Text style={styles.menuItemTitle}>Audio Recorder Test</Text>
                    <Text style={styles.menuItemSubtitle}>
                      Test microphone recording and playback
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            {isEditing ? (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.saveButton]}
                  onPress={handleSavePress}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color={theme.colors.textInverse} />
                  ) : (
                    <Text
                      style={[styles.actionButtonText, styles.saveButtonText]}
                    >
                      Save Changes
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleCancelPress}
                  disabled={isSaving}
                >
                  <Text style={styles.actionButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </ScrollView>

        {/* Settings Sheet */}
        <SettingsSheet
          visible={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Passkey Management Sheet */}
        <PasskeyManagementSheet
          visible={isPasskeySheetOpen}
          onClose={() => setIsPasskeySheetOpen(false)}
          userEmail={formData.email}
        />

        {/* TOTP Authenticator Management Sheet */}
        <TotpManagementSheet
          visible={isTotpSheetOpen}
          onClose={() => setIsTotpSheetOpen(false)}
          userEmail={formData.email}
        />

        {/* Medical License Sheet */}
        <MedicalLicenseSheet
          visible={isMedicalLicenseSheetOpen}
          onClose={() => setIsMedicalLicenseSheetOpen(false)}
          userId={user?.id || ''}
          onUploadPress={() => {
            setIsMedicalLicenseSheetOpen(false);
            setIsMedicalLicenseUploadSheetOpen(true);
          }}
        />

        {/* Medical License Upload Sheet */}
        <MedicalLicenseUploadSheet
          visible={isMedicalLicenseUploadSheetOpen}
          onClose={() => setIsMedicalLicenseUploadSheetOpen(false)}
          onSuccess={() => {
            setIsMedicalLicenseUploadSheetOpen(false);
            setIsMedicalLicenseSheetOpen(true);
          }}
        />

        {/* Photo Upload Sheet */}
        <PhotoUploadSheet
          visible={isPhotoUploadSheetOpen}
          onClose={() => setIsPhotoUploadSheetOpen(false)}
          hasExistingPhoto={hasProfileImage}
          onPhotoUpdated={handlePhotoUpdated}
        />

        {/* Language Picker Sheet */}
        <LanguagePickerSheet
          visible={isLanguagePickerOpen}
          onClose={() => setIsLanguagePickerOpen(false)}
          selectedLanguages={formData.languages || []}
          onSelectionChange={handleLanguageSelectionChange}
        />

        {/* Country Picker Sheet */}
        <CountryPickerSheet
          visible={isCountryPickerOpen}
          onClose={() => setIsCountryPickerOpen(false)}
          selectedCountries={formData.countries || []}
          onSelectionChange={handleCountrySelectionChange}
        />

        {/* Specialty Picker Sheet */}
        <SpecialtyPickerSheet
          visible={isSpecialtyPickerOpen}
          onClose={() => setIsSpecialtyPickerOpen(false)}
          selectedSpecialties={formData.doctorSpecialty || []}
          onSelectionChange={handleSpecialtySelectionChange}
        />

        {/* AI Model Downloads Sheet */}
        <ModelDownloadsSheet
          visible={isModelDownloadsSheetOpen}
          onClose={() => setIsModelDownloadsSheetOpen(false)}
        />

        {/* Audio Recorder Test Sheet */}
        <AudioRecorderTestSheet
          visible={isAudioRecorderTestSheetOpen}
          onClose={() => setIsAudioRecorderTestSheetOpen(false)}
        />

        {/* Feedback Sheet */}
        <FeedbackSheet
          visible={isFeedbackSheetOpen}
          onClose={() => {
            setIsFeedbackSheetOpen(false);
            setFeedbackPrefill(undefined);
          }}
          prefill={feedbackPrefill}
        />

        {/* My Feedback Sheet */}
        <MyFeedbackSheet
          visible={isMyFeedbackSheetOpen}
          onClose={() => setIsMyFeedbackSheetOpen(false)}
        />

        {/* Mission Info Sheet */}
        <MissionInfoSheet
          visible={!!selectedMission}
          onClose={() => setSelectedMission(null)}
          mission={selectedMission}
        />

        {/* Mission Enrollment Sheet (join requests + self-serve leave) */}
        <MissionEnrollmentSheet
          visible={isMissionEnrollmentOpen}
          onClose={() => setIsMissionEnrollmentOpen(false)}
          myMissions={userMissionIds ? myMissions : []}
          allMissions={allMissions}
        />

        {/* Sync Status Sheet */}
        <SyncStatusSheet
          visible={isSyncSheetOpen}
          onClose={() => setIsSyncSheetOpen(false)}
          onReportIssue={(diagnostics) => {
            setIsSyncSheetOpen(false);
            setFeedbackPrefill({
              category: 'offline_access',
              title: 'Sync Connection Failed',
              description: formatDiagnosticsDescription(diagnostics),
              platform: 'mobile',
              mobilePlatform: Platform.OS,
              appSections: ['user_profile'],
              syncDiagnostics: diagnostics,
            });
            setTimeout(() => setIsFeedbackSheetOpen(true), 300);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.base,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: typography.fontSize.xxl,
      fontWeight: typography.fontWeight.bold,
      color: theme.colors.text,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    editButton: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      color: theme.colors.primary,
    },
    settingsButton: {
      padding: spacing.xs,
    },
    headerDownloadBadge: {
      position: 'absolute',
      top: -6,
      right: -6,
    },
    scrollView: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: theme.spacing.massive,
    },
    loadingText: {
      marginTop: theme.spacing.base,
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.xxxl,
      paddingVertical: theme.spacing.massive,
    },
    errorIcon: {
      fontSize: theme.typography.fontSize.huge,
      marginBottom: theme.spacing.base,
    },
    errorText: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    avatarSection: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xxl,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
      marginBottom: theme.spacing.base,
    },
    avatarTouchable: {
      position: 'relative',
      marginBottom: theme.spacing.base,
    },
    avatarContainer: {
      width: theme.sizes.avatar.xxl,
      height: theme.sizes.avatar.xxl,
      borderRadius: theme.sizes.avatar.xxl / 2,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      ...theme.shadows.md,
    },
    avatarImage: {
      width: theme.sizes.avatar.xxl,
      height: theme.sizes.avatar.xxl,
      borderRadius: theme.sizes.avatar.xxl / 2,
      ...theme.shadows.md,
    },
    avatarCameraOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    avatarText: {
      fontSize: theme.typography.fontSize.massive,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textInverse,
    },
    userName: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    userEmail: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    adminBadge: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.palette.yellow[500],
      marginTop: theme.spacing.sm,
    },
    adminBadgeText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.palette.grey[900],
    },
    section: {
      marginBottom: theme.spacing.base,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.textSecondary,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: theme.spacing.lg,
    },
    syncBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.primary + '10',
      borderRadius: theme.borderRadius.pill,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    syncBadgeText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sectionContent: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.lg,
    },
    fieldContainer: {
      paddingVertical: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    fieldLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    fieldLabel: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      fontWeight: theme.typography.fontWeight.medium,
    },
    fieldValue: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text,
    },
    fieldValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    input: {
      fontSize: theme.typography.fontSize.md,
      color: theme.colors.text,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.backgroundSecondary,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pickerContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    pickerOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    pickerOptionSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    pickerOptionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      fontWeight: theme.typography.fontWeight.medium,
    },
    pickerOptionTextSelected: {
      color: theme.colors.textInverse,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.palette.cello[100],
      paddingVertical: theme.spacing.xs + 2,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.pill,
      gap: theme.spacing.xs + 2,
    },
    chipText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.palette.cello[700],
      fontWeight: theme.typography.fontWeight.medium,
    },
    chipRemove: {
      fontSize: theme.typography.fontSize.lg,
      color: theme.palette.cello[700],
      fontWeight: theme.typography.fontWeight.semibold,
      lineHeight: theme.typography.fontSize.lg,
    },
    emptyChipText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textTertiary,
      fontStyle: 'italic',
    },
    addChipButton: {
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.colors.primary + '15',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.base,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuItemIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },
    menuItemTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text,
    },
    menuItemSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      marginTop: theme.spacing.xs,
    },
    actionsSection: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    actionButton: {
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.base,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    actionButtonText: {
      fontSize: theme.typography.fontSize.md,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.primary,
      textAlign: 'center',
    },
    saveButton: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    saveButtonText: {
      color: theme.colors.textInverse,
    },
    logoutButton: {
      backgroundColor: theme.colors.error,
      borderColor: theme.colors.error,
      marginTop: theme.spacing.sm,
    },
    logoutButtonText: {
      color: theme.colors.textInverse,
    },
    logoutContainer: {
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.base,
    },
    logoutButtonTop: {
      backgroundColor: theme.colors.error,
      paddingVertical: spacing.base,
      paddingHorizontal: spacing.lg,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      ...theme.shadows.sm,
    },
    logoutButtonTopText: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.semibold,
      color: theme.colors.textInverse,
    },
    downloadRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingVertical: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    downloadRowLeft: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      flex: 1,
      marginRight: theme.spacing.md,
    },
    downloadRowIcon: {
      width: 28,
      height: 28,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: theme.spacing.sm,
    },
    downloadRowLabel: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text,
      fontWeight: theme.typography.fontWeight.medium,
      flex: 1,
    },
    downloadRowRight: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      width: 120,
    },
    downloadProgressBarBg: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.border,
      overflow: 'hidden' as const,
    },
    downloadProgressBarFill: {
      height: 6,
      borderRadius: 3,
    },
    downloadRowPct: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.textSecondary,
      fontWeight: theme.typography.fontWeight.medium,
      marginLeft: theme.spacing.sm,
      width: 36,
      textAlign: 'right' as const,
    },
  });
