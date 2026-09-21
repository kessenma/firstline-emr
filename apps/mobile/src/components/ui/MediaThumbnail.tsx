// apps/mobile/src/components/ui/MediaThumbnail.tsx
// Reusable media thumbnail component with loading/error states and video overlay

import React, { memo, useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Play, ImageOff, FileText, Music } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { borderRadius, typography } from '../../utils/theme';

import type { MediaType as SharedMediaType, MediaItem } from '@fajr/shared/media';

export type MediaType = SharedMediaType;

/** @deprecated Use MediaItem from '@fajr/shared/media' instead */
export type MediaThumbnailItem = MediaItem;

interface MediaThumbnailProps {
  uri: string;
  type?: MediaType;
  /**
   * A rendered preview for media that is not itself an image — currently page
   * one of a PDF. When present it is shown in place of the type icon.
   */
  thumbnailUri?: string | null;
  size?: number;
  isSelected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
}

const MediaThumbnailComponent: React.FC<MediaThumbnailProps> = ({
  uri,
  type = 'image',
  thumbnailUri,
  size,
  isSelected = false,
  onPress,
  onLongPress,
  style,
}) => {
  const colors = useThemeColors();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset error state when uri changes (e.g., signed URL resolved after initial render)
  useEffect(() => {
    if (uri) {
      setHasError(false);
      setIsLoading(true);
    }
  }, [uri]);

  const containerStyle: ViewStyle = {
    ...(size ? { width: size, height: size } : {}),
    borderWidth: isSelected ? 2 : 0,
    borderColor: isSelected ? colors.primary : 'transparent',
  };

  if (hasError || !uri) {
    return (
      <TouchableOpacity
        style={[styles.container, containerStyle, { backgroundColor: colors.surfaceSecondary }, style]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <ImageOff size={24} color={colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  // A rendered preview stands in for the type icon when one exists.
  const previewUri = type === 'image' ? uri : thumbnailUri;
  const showPreview = Boolean(previewUri) && !hasError;

  if (showPreview && type !== 'image') {
    return (
      <TouchableOpacity
        style={[styles.container, containerStyle, { backgroundColor: colors.surfaceSecondary }, style]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <Image
          source={{ uri: previewUri as string }}
          style={styles.image}
          resizeMode="cover"
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
        {isLoading && (
          <View style={[styles.overlay, { backgroundColor: colors.surfaceSecondary }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
        {type === 'pdf' && !isLoading && (
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>PDF</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // PDF / file: show document icon
  if (type === 'pdf' || type === 'file') {
    return (
      <TouchableOpacity
        style={[styles.container, containerStyle, { backgroundColor: colors.surfaceSecondary }, style]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <FileText size={28} color={colors.primary} />
      </TouchableOpacity>
    );
  }

  // Audio: show music icon
  if (type === 'audio') {
    return (
      <TouchableOpacity
        style={[styles.container, containerStyle, { backgroundColor: colors.surfaceSecondary }, style]}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <Music size={28} color={colors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.container, containerStyle, { backgroundColor: colors.surfaceSecondary }, style]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="cover"
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />

      {/* Loading indicator */}
      {isLoading && (
        <View style={[styles.overlay, { backgroundColor: colors.surfaceSecondary }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}

      {/* Video play icon overlay */}
      {type === 'video' && !isLoading && (
        <View style={styles.videoOverlay}>
          <View style={[styles.playBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <Play size={16} color="#fff" fill="#fff" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const MediaThumbnail = memo(MediaThumbnailComponent);

const styles = StyleSheet.create({
  container: {
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default MediaThumbnail;
