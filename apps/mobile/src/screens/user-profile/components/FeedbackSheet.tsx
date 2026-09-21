// apps/mobile/src/screens/user-profile/components/FeedbackSheet.tsx
// Bottom sheet for submitting user feedback

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Upload,
  X,
  Camera,
  ImageIcon,
  Film,
  ChevronDown,
  ChevronRight,
  Check,
  Smartphone,
  Monitor,
  Info,
} from 'lucide-react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { BottomSheet } from '../../../components/BottomSheet';
import { RadioCardField } from '../../../components/form/RadioCardField';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import {
  useFeedback,
  FEEDBACK_CATEGORIES,
  type FeedbackAttachment,
} from '../hooks/useFeedback';

interface AppSectionGroup {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

const APP_SECTION_GROUPS: AppSectionGroup[] = [
  {
    id: 'patient_chart',
    label: 'Patient Chart',
    children: [
      { id: 'patient_chart.patient_info', label: 'Patient Info' },
      { id: 'patient_chart.media_gallery', label: 'Media Gallery' },
      { id: 'patient_chart.telegram_thread', label: 'Telegram Thread' },
      { id: 'patient_chart.video_calling', label: 'Video Calling' },
      { id: 'patient_chart.medications', label: 'Medications' },
      { id: 'patient_chart.notes', label: 'Clinical Notes' },
      { id: 'patient_chart.rx_orders', label: 'Rx Orders' },
    ],
  },
  {
    id: 'patient_dashboard',
    label: 'Patient Dashboard',
    children: [
      { id: 'patient_dashboard.filtering', label: 'Filtering' },
      { id: 'patient_dashboard.priority_status', label: 'Priority / Status / Specialty' },
    ],
  },
  { id: 'user_profile', label: 'User Profile' },
  { id: 'user_settings', label: 'User Settings' },
  { id: 'staff_messaging', label: 'Internal Staff Messaging' },
  { id: 'admin_dashboard', label: 'Admin Dashboard' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'login_auth', label: 'Login & Authentication' },
  { id: 'general', label: 'General' },
  { id: 'other_section', label: 'Other' },
];

export interface FeedbackPrefill {
  category?: string;
  title?: string;
  description?: string;
  platform?: string;
  mobilePlatform?: string;
  appSections?: string[];
  syncDiagnostics?: object;
}

interface FeedbackSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefill?: FeedbackPrefill;
}

export const FeedbackSheet: React.FC<FeedbackSheetProps> = ({
  visible,
  onClose,
  onSuccess,
  prefill,
}) => {
  const colors = useThemeColors();
  const { isSubmitting, submitFeedback } = useFeedback();

  const [category, setCategory] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<string | null>(null);
  const [mobilePlatform, setMobilePlatform] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>([]);
  const [appSections, setAppSections] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [syncDiagnostics, setSyncDiagnostics] = useState<object | undefined>();

  // Track the prefill object identity so we only apply it once per open
  const appliedPrefillRef = useRef<FeedbackPrefill | undefined>(undefined);

  // Apply prefill values when the sheet opens with new prefill data
  useEffect(() => {
    if (visible && prefill && prefill !== appliedPrefillRef.current) {
      appliedPrefillRef.current = prefill;
      if (prefill.category) setCategory(prefill.category);
      if (prefill.title) setTitle(prefill.title);
      if (prefill.description) setDescription(prefill.description);
      if (prefill.platform) setPlatform(prefill.platform);
      if (prefill.mobilePlatform) setMobilePlatform(prefill.mobilePlatform);
      if (prefill.appSections) setAppSections(prefill.appSections);
      if (prefill.syncDiagnostics) setSyncDiagnostics(prefill.syncDiagnostics);
    }
  }, [visible, prefill]);

  const toggleSection = (id: string) => {
    setAppSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id],
    );
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handlePickImage = async () => {
    if (attachments.length >= 5) return;
    const result = await launchImageLibrary({
      mediaType: 'mixed',
      selectionLimit: 5 - attachments.length,
    });

    if (result.assets) {
      const newAttachments = result.assets.map(asset => ({
        uri: asset.uri || '',
        name: asset.fileName || `attachment_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
      }));
      setAttachments(prev => [...prev, ...newAttachments].slice(0, 5));
    }
  };

  const handleTakePhoto = async () => {
    if (attachments.length >= 5) return;
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setAttachments(prev => [
        ...prev,
        {
          uri: asset.uri || '',
          name: asset.fileName || `screenshot_${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
        },
      ]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!category || !title.trim() || !description.trim() || !platform) return;

    const includesMobile = platform === 'mobile' || platform === 'both';
    if (includesMobile && !mobilePlatform) return;

    const success = await submitFeedback({
      category,
      title: title.trim(),
      description: description.trim(),
      platform,
      mobilePlatform: includesMobile ? mobilePlatform || undefined : undefined,
      attachments,
      appSections,
      syncDiagnostics,
    });

    if (success) {
      handleReset();
      onSuccess?.();
      onClose();
    }
  };

  const handleReset = () => {
    setCategory('');
    setTitle('');
    setDescription('');
    setPlatform(null);
    setMobilePlatform(null);
    setAttachments([]);
    setAppSections([]);
    setExpandedGroups(new Set());
    setSyncDiagnostics(undefined);
    appliedPrefillRef.current = undefined;
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const includesMobile = platform === 'mobile' || platform === 'both';
  const isValid =
    category &&
    title.trim() &&
    description.trim() &&
    platform &&
    (!includesMobile || mobilePlatform);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Submit Feedback"
      snapPoint={90}
      showHandle={true}
      showCloseButton={true}
    >
      <>
        {/* Category Selection */}
        <Text style={[styles.label, { color: colors.text }]}>Category *</Text>
        <View style={styles.categoryContainer}>
          {FEEDBACK_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    category === cat.value
                      ? colors.primary
                      : colors.backgroundSecondary,
                  borderColor:
                    category === cat.value ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setCategory(cat.value)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color:
                      category === cat.value
                        ? colors.surface
                        : colors.text,
                  },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Platform */}
        <RadioCardField
          label="Platform"
          required
          value={platform}
          onChange={(val) => {
            setPlatform(val);
            if (val === 'web') setMobilePlatform(null);
          }}
          options={[
            {
              label: 'Mobile',
              value: 'mobile',
              icon: <Smartphone size={20} color={colors.primary} />,
            },
            {
              label: 'Web',
              value: 'web',
              icon: <Monitor size={20} color={colors.primary} />,
            },
            {
              label: 'Both',
              value: 'both',
              icon: <Smartphone size={20} color={colors.primary} />,
            },
          ]}
          direction="horizontal"
          size="small"
        />

        {/* Mobile Platform (conditional) */}
        {includesMobile && (
          <RadioCardField
            label="Mobile OS"
            required
            value={mobilePlatform}
            onChange={setMobilePlatform}
            options={[
              { label: 'Android', value: 'android' },
              { label: 'iOS', value: 'ios' },
            ]}
            direction="horizontal"
            size="small"
          />
        )}

        {/* Title */}
        <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
          value={title}
          onChangeText={setTitle}
          placeholder="Brief summary"
          placeholderTextColor={colors.textTertiary}
          maxLength={255}
        />

        {/* Description */}
        <Text style={[styles.label, { color: colors.text }]}>
          Description *
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              color: colors.text,
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the issue, feature, or feedback in detail..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* App Section (multi-select) */}
        <Text style={[styles.label, { color: colors.text }]}>
          Which part of the app? (optional)
        </Text>
        <Text
          style={[styles.sectionHint, { color: colors.textTertiary }]}
        >
          Tap to select all areas your feedback relates to
        </Text>
        <View
          style={[
            styles.sectionList,
            { borderColor: colors.border },
          ]}
        >
          {APP_SECTION_GROUPS.map(group => {
            const hasChildren =
              group.children && group.children.length > 0;
            const isExpanded = expandedGroups.has(group.id);
            const isSelected = appSections.includes(group.id);
            const selectedCount = hasChildren
              ? group.children!.filter(c =>
                  appSections.includes(c.id),
                ).length
              : 0;

            return (
              <View key={group.id}>
                <TouchableOpacity
                  style={[
                    styles.sectionRow,
                    { borderBottomColor: colors.border },
                    (isSelected || selectedCount > 0) && {
                      backgroundColor: colors.primary + '08',
                    },
                  ]}
                  onPress={() => {
                    if (hasChildren) toggleGroup(group.id);
                    else toggleSection(group.id);
                  }}
                  activeOpacity={0.7}
                >
                  {hasChildren ? (
                    isExpanded ? (
                      <ChevronDown
                        size={16}
                        color={colors.textSecondary}
                      />
                    ) : (
                      <ChevronRight
                        size={16}
                        color={colors.textSecondary}
                      />
                    )
                  ) : (
                    <View
                      style={[
                        styles.checkbox,
                        isSelected
                          ? {
                              backgroundColor: colors.primary,
                              borderColor: colors.primary,
                            }
                          : { borderColor: colors.border },
                      ]}
                    >
                      {isSelected && (
                        <Check size={12} color="#fff" />
                      )}
                    </View>
                  )}
                  <Text
                    style={[
                      styles.sectionRowText,
                      { color: colors.text },
                    ]}
                  >
                    {group.label}
                  </Text>
                  {selectedCount > 0 && (
                    <Text
                      style={[
                        styles.selectedBadge,
                        { color: colors.primary },
                      ]}
                    >
                      {selectedCount}
                    </Text>
                  )}
                </TouchableOpacity>
                {hasChildren && isExpanded && (
                  <View
                    style={{
                      backgroundColor: colors.backgroundSecondary,
                    }}
                  >
                    {group.children!.map(child => {
                      const childSelected = appSections.includes(
                        child.id,
                      );
                      return (
                        <TouchableOpacity
                          key={child.id}
                          style={[
                            styles.sectionChildRow,
                            { borderBottomColor: colors.border },
                            childSelected && {
                              backgroundColor: colors.primary + '08',
                            },
                          ]}
                          onPress={() => toggleSection(child.id)}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.checkbox,
                              childSelected
                                ? {
                                    backgroundColor: colors.primary,
                                    borderColor: colors.primary,
                                  }
                                : { borderColor: colors.border },
                            ]}
                          >
                            {childSelected && (
                              <Check size={12} color="#fff" />
                            )}
                          </View>
                          <Text
                            style={[
                              styles.sectionRowText,
                              { color: colors.text },
                            ]}
                          >
                            {child.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Attachments */}
        <Text style={[styles.label, { color: colors.text }]}>
          Attachments ({attachments.length}/5)
        </Text>

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <View style={styles.attachmentList}>
            {attachments.map((att, idx) => (
              <View
                key={idx}
                style={[
                  styles.attachmentItem,
                  { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                ]}
              >
                {att.type.startsWith('image/') ? (
                  <Image
                    source={{ uri: att.uri }}
                    style={styles.attachmentThumb}
                  />
                ) : (
                  <View
                    style={[
                      styles.attachmentThumb,
                      { backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
                    ]}
                  >
                    <Film size={16} color={colors.textSecondary} />
                  </View>
                )}
                <Text
                  style={[styles.attachmentName, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {att.name}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveAttachment(idx)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {attachments.length < 5 && (
          <View style={styles.attachButtons}>
            <TouchableOpacity
              style={[
                styles.attachButton,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
              onPress={handlePickImage}
            >
              <ImageIcon size={20} color={colors.primary} />
              <Text style={[styles.attachButtonText, { color: colors.text }]}>
                Gallery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.attachButton,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleTakePhoto}
            >
              <Camera size={20} color={colors.primary} />
              <Text style={[styles.attachButtonText, { color: colors.text }]}>
                Camera
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sync diagnostics indicator */}
        {syncDiagnostics && (
          <View style={[styles.diagnosticsBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Info size={14} color={colors.primary} />
            <Text style={[styles.diagnosticsBannerText, { color: colors.primary }]}>
              Sync diagnostics will be attached to this report
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.primary,
              opacity: !isValid || isSubmitting ? 0.5 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <>
              <Upload size={20} color={colors.surface} />
              <Text
                style={[styles.submitButtonText, { color: colors.surface }]}
              >
                Submit Feedback
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Bottom padding */}
        <View style={{ height: spacing.xxxl }} />
      </>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  input: {
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  textArea: {
    fontSize: typography.fontSize.base,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    minHeight: 100,
    marginBottom: spacing.sm,
  },
  attachmentList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  attachmentThumb: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
  },
  attachmentName: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  attachButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  attachButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.xs,
  },
  attachButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  sectionHint: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.sm,
  },
  sectionList: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  sectionChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.xl + spacing.sm,
    paddingRight: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  sectionRowText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  selectedBadge: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  diagnosticsBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  diagnosticsBannerText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    gap: spacing.sm,
    marginBottom: 48,
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default FeedbackSheet;
