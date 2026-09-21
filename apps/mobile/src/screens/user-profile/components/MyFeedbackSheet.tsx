// apps/mobile/src/screens/user-profile/components/MyFeedbackSheet.tsx
// Bottom sheet listing user's own feedback submissions

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Paperclip, MessageSquare, Smartphone, Monitor } from 'lucide-react-native';
import { BottomSheet, BottomSheetFlatList } from '../../../components/BottomSheet';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { useFeedback, type FeedbackItem } from '../hooks/useFeedback';

interface MyFeedbackSheetProps {
  visible: boolean;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  feature_request: 'Feature Request',
  bug: 'Bug',
  question: 'Question',
  admin_assistance: 'Admin Assist',
  ui_improvement: 'UI Improvement',
  praise: 'Praise',
  other: 'Other',
};

// STATUS_COLORS is computed inside the component to use theme colors

export const MyFeedbackSheet: React.FC<MyFeedbackSheetProps> = ({
  visible,
  onClose,
}) => {
  const colors = useThemeColors();
  const { myFeedback, isLoadingFeedback, fetchMyFeedback } = useFeedback();

  const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    open: { bg: colors.info + '20', text: colors.info },
    in_review: { bg: colors.warning + '20', text: colors.warningDark },
    resolved: { bg: colors.success + '20', text: colors.success },
    closed: { bg: colors.border + '40', text: colors.textSecondary },
  };

  useEffect(() => {
    if (visible) {
      fetchMyFeedback();
    }
  }, [visible, fetchMyFeedback]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderItem = ({ item }: { item: FeedbackItem }) => {
    const statusStyle = STATUS_COLORS[item.status] || STATUS_COLORS.open;
    return (
      <View
        style={[
          styles.feedbackItem,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {/* Header row */}
        <View style={styles.itemHeader}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusStyle.bg },
            ]}
          >
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
          <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
            {CATEGORY_LABELS[item.category] || item.category}
          </Text>
          {item.platform && (
            <View style={styles.platformBadge}>
              {(item.platform === 'mobile' || item.platform === 'both') && (
                <Smartphone size={11} color={colors.textSecondary} />
              )}
              {(item.platform === 'web' || item.platform === 'both') && (
                <Monitor size={11} color={colors.textSecondary} />
              )}
              {item.mobilePlatform && (
                <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                  {item.mobilePlatform === 'ios' ? 'iOS' : 'Android'}
                </Text>
              )}
            </View>
          )}
          {item.attachments?.length > 0 && (
            <Paperclip size={12} color={colors.textSecondary} />
          )}
        </View>

        {/* Title */}
        <Text
          style={[styles.itemTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* Description preview */}
        <Text
          style={[styles.itemDescription, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>

        {/* Admin notes */}
        {item.adminNotes && (
          <View
            style={[
              styles.adminNotesBox,
              { backgroundColor: colors.info + '10', borderColor: colors.info + '30' },
            ]}
          >
            <Text style={[styles.adminNotesLabel, { color: colors.info }]}>Admin Response</Text>
            <Text style={[styles.adminNotesText, { color: colors.primary }]} numberOfLines={3}>
              {item.adminNotes}
            </Text>
          </View>
        )}

        {/* Date + Version */}
        <View style={styles.itemFooter}>
          <Text style={[styles.dateText, { color: colors.textTertiary }]}>
            {formatDate(item.createdAt)}
          </Text>
          {item.appVersion && (
            <Text style={[styles.dateText, { color: colors.textTertiary }]}>
              v{item.appVersion}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="My Feedback"
      snapPoint={80}
      showHandle={true}
      showCloseButton={true}
      rawContent
    >
      {isLoadingFeedback ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : myFeedback.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MessageSquare size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No feedback submitted yet
          </Text>
        </View>
      ) : (
        <BottomSheetFlatList
          data={myFeedback}
          renderItem={renderItem}
          keyExtractor={(item: FeedbackItem) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  feedbackItem: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.pill,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'capitalize',
  },
  categoryText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  platformBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 3,
  },
  itemTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  itemDescription: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.4,
    marginBottom: spacing.sm,
  },
  adminNotesBox: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  adminNotesLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 2,
  },
  adminNotesText: {
    fontSize: typography.fontSize.sm,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: typography.fontSize.xs,
  },
});

export default MyFeedbackSheet;
