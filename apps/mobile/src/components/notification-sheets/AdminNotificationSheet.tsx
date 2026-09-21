// apps/mobile/src/components/notification-sheets/AdminNotificationSheet.tsx
// Bottom sheet for admin notifications — shows rich content with optional CTA

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { Megaphone, ExternalLink, AlertCircle, Bell } from 'lucide-react-native';
import { BottomSheet } from '../BottomSheet';
import { CopyButton } from '../ui/CopyButton';
import { FullScreenMediaViewer } from '../ui/FullScreenMediaViewer';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { getApiUrl } from '../../config';
import { storageUtils } from '../../utils/storage';
import type { Notification } from '../../viewModels/NotificationsViewModel';
import type { NotificationRoute } from '../../utils/notificationRouting';
import type { MediaItem } from '@fajr/shared/media';

interface AdminNotificationSheetProps {
  visible: boolean;
  notification: Notification;
  onClose: () => void;
  onNavigate: (route: NotificationRoute) => void;
}

// Map actionUrl to mobile NotificationRoute
function actionUrlToRoute(actionUrl: string): NotificationRoute | null {
  if (actionUrl.startsWith('/profile')) {
    return { tab: 'Profile' };
  }
  if (actionUrl.startsWith('/admin')) {
    return {
      tab: 'Admin',
      screen: 'AdminDashboard',
      params: { initialSection: 'notifications' },
    };
  }
  if (actionUrl.startsWith('/messages')) {
    return { tab: 'Messages' };
  }
  return null;
}

// Get CTA button label based on actionUrl
function getCtaLabel(actionUrl: string): string {
  if (actionUrl.startsWith('/profile')) return 'Go to Profile';
  if (actionUrl.startsWith('/admin')) return 'Open Admin Dashboard';
  if (actionUrl.startsWith('/messages')) return 'Open Messages';
  return 'View Details';
}

export function AdminNotificationSheet({
  visible,
  notification,
  onClose,
  onNavigate,
}: AdminNotificationSheetProps) {
  const colors = useThemeColors();
  const [signedImageUrls, setSignedImageUrls] = useState<Record<string, string>>({});
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  // Resolve signed URLs for images
  useEffect(() => {
    if (!notification.images?.length) return;

    const resolveUrls = async () => {
      const token = storageUtils.getToken();
      const resolved: Record<string, string> = {};

      for (const img of notification.images!) {
        try {
          const url = getApiUrl(
            `/media/get-signed-url?filePath=${encodeURIComponent(img.filePath)}`,
          );
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            resolved[img.filePath] = data.signedUrl;
          }
        } catch {
          // Skip failed image resolutions
        }
      }

      setSignedImageUrls(resolved);
    };

    resolveUrls();
  }, [notification.images]);

  const getTypeIcon = () => {
    switch (notification.type) {
      case 'alert':
        return <AlertCircle size={28} color={colors.warning} />;
      case 'reminder':
        return <Bell size={28} color={colors.warning} />;
      case 'announcement':
      default:
        return <Megaphone size={28} color={colors.warning} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Simple markdown line rendering (bullets, numbers, plain text)
  const renderDescriptionLines = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <View key={i} style={{ height: 8 }} />;

      const bulletMatch = trimmed.match(/^[-*]\s+(.*)/);
      if (bulletMatch) {
        return (
          <View key={i} style={styles.listItem}>
            <Text style={[styles.bullet, { color: colors.warning }]}>{'\u2022'}</Text>
            <Text style={[styles.descriptionText, { color: colors.text }]}>
              {bulletMatch[1]}
            </Text>
          </View>
        );
      }

      const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numberMatch) {
        return (
          <View key={i} style={styles.listItem}>
            <Text style={[styles.bullet, { color: colors.warning }]}>{numberMatch[1]}.</Text>
            <Text style={[styles.descriptionText, { color: colors.text }]}>
              {numberMatch[2]}
            </Text>
          </View>
        );
      }

      return (
        <Text key={i} style={[styles.descriptionText, { color: colors.text }]}>
          {trimmed}
        </Text>
      );
    });
  };

  // Build MediaItem[] for the full-screen viewer from resolved signed URLs
  const mediaItems: MediaItem[] = useMemo(() => {
    if (!notification.images?.length) return [];
    return notification.images
      .filter((img) => signedImageUrls[img.filePath])
      .map((img, i) => ({
        id: `admin-notif-img-${i}`,
        uri: signedImageUrls[img.filePath],
        type: 'image' as const,
        caption: img.fileName,
      }));
  }, [notification.images, signedImageUrls]);

  const handleCtaPress = () => {
    if (!notification.actionUrl) return;
    const route = actionUrlToRoute(notification.actionUrl);
    if (route) {
      onNavigate(route);
    }
  };

  return (
    <>
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Admin Notification"
      snapPoint={75}
      showHandle
      showCloseButton
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: colors.warning + '20' },
            ]}
          >
            {getTypeIcon()}
          </View>
          <View style={styles.headerText}>
            <View style={styles.typeBadgeRow}>
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: colors.warning + '20' },
                ]}
              >
                <Text style={[styles.typeBadgeText, { color: colors.warning }]}>
                  {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
              {formatDate(notification.createdAt)}
            </Text>
          </View>
        </View>

        {/* Message */}
        <Text style={[styles.message, { color: colors.text }]}>
          {notification.message}
        </Text>

        {/* Description */}
        {notification.description && (
          <View
            style={[
              styles.descriptionContainer,
              { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            {renderDescriptionLines(notification.description)}
          </View>
        )}

        {/* Images */}
        {notification.images && notification.images.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesScroll}
            contentContainerStyle={styles.imagesContent}
          >
            {notification.images.map((img, index) => {
              const signedUrl = signedImageUrls[img.filePath];
              // Find the matching index in mediaItems (which only contains resolved images)
              const mediaIndex = signedUrl
                ? mediaItems.findIndex((m) => m.uri === signedUrl)
                : -1;
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  disabled={!signedUrl}
                  onPress={() => {
                    if (mediaIndex >= 0) setGalleryIndex(mediaIndex);
                  }}
                  style={[
                    styles.imageContainer,
                    { borderColor: colors.border },
                  ]}
                >
                  {signedUrl ? (
                    <Image
                      source={{ uri: signedUrl }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[
                        styles.imagePlaceholder,
                        { backgroundColor: colors.surfaceSecondary },
                      ]}
                    >
                      <Megaphone size={20} color={colors.textSecondary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Links */}
        {notification.links && notification.links.length > 0 && (
          <View style={styles.linksSection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Links
            </Text>
            {notification.links.map((link, index) => (
              <View
                key={index}
                style={[
                  styles.linkItem,
                  { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <TouchableOpacity
                  style={styles.linkContent}
                  onPress={() => Linking.openURL(link.url)}
                >
                  <ExternalLink size={16} color={colors.primary} />
                  <Text
                    style={[styles.linkText, { color: colors.primary }]}
                    numberOfLines={1}
                  >
                    {link.displayName || link.url}
                  </Text>
                </TouchableOpacity>
                <CopyButton textToCopy={link.url} variant="ghost" iconSize={16} />
              </View>
            ))}
          </View>
        )}

        {/* CTA Button */}
        {notification.actionUrl && (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: colors.warning }]}
            onPress={handleCtaPress}
            activeOpacity={0.7}
          >
            <Text style={[styles.ctaText, { color: colors.textInverse }]}>
              {getCtaLabel(notification.actionUrl)}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </BottomSheet>

      {/* Full-screen image gallery */}
      {galleryIndex !== null && mediaItems.length > 0 && (
        <FullScreenMediaViewer
          visible
          items={mediaItems}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
    gap: spacing.md,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  typeBadgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  typeBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: typography.fontSize.sm,
  },
  message: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
    marginBottom: spacing.base,
  },
  descriptionContainer: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.base,
  },
  descriptionText: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * typography.lineHeight.normal,
    flex: 1,
  },
  listItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  bullet: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    width: 20,
  },
  imagesScroll: {
    marginBottom: spacing.base,
  },
  imagesContent: {
    gap: spacing.sm,
  },
  imageContainer: {
    width: 120,
    height: 90,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linksSection: {
    marginBottom: spacing.base,
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  linkContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linkText: {
    fontSize: typography.fontSize.base,
    flex: 1,
  },
  ctaButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  ctaText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});
