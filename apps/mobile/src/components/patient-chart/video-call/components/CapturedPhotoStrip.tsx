// apps/mobile/src/components/patient-chart/video-call/components/CapturedPhotoStrip.tsx
//
// Thumbnails of what has been captured on this call, overlaid on the stage.
//
// Review matters while the patient is still connected: a still of a wound is
// either usable or it isn't, and discovering it is blurred after the call ends
// means it cannot be retaken. Tapping a thumbnail offers to delete it so the
// clinician can ask for another.

import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useVideoCallSession } from '../VideoCallSessionProvider';

// Matches CallStage: the strip sits over letterboxed video, which is black in
// every theme, so its own colours are fixed rather than themed.
const OVERLAY_BACKGROUND = 'rgba(0,0,0,0.6)';
const OVERLAY_FOREGROUND = '#FFFFFF';

export const CapturedPhotoStrip: React.FC = () => {
  const { photos } = useVideoCallSession();

  if (photos.photos.length === 0) return null;

  const confirmRemove = (mediaId: string) => {
    Alert.alert(
      'Delete this photo?',
      'It will be permanently removed from the patient chart.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void photos.remove(mediaId),
        },
      ],
    );
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.strip}>
        <Text style={styles.count}>
          {photos.photos.length}{' '}
          {photos.photos.length === 1 ? 'photo' : 'photos'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {photos.photos.map((photo, index) => (
            <TouchableOpacity
              key={photo.mediaId}
              onPress={() => confirmRemove(photo.mediaId)}
              style={styles.thumbWrap}
              accessibilityLabel={`Photo ${index + 1}, tap to delete`}
            >
              <Image source={{ uri: photo.url }} style={styles.thumb} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.sm,
    // Clear of the local picture-in-picture tile, which is bottom-right.
    bottom: spacing.sm,
    right: 112,
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: OVERLAY_BACKGROUND,
    borderRadius: borderRadius.sm,
    padding: spacing.xs,
  },
  count: {
    color: OVERLAY_FOREGROUND,
    fontSize: typography.fontSize.xs,
    paddingHorizontal: 2,
  },
  thumbWrap: {
    marginRight: spacing.xs,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});

export default CapturedPhotoStrip;
