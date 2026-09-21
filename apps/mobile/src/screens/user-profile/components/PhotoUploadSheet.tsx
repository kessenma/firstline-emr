// apps/mobile/src/screens/user-profile/components/PhotoUploadSheet.tsx
// Bottom sheet for uploading profile photo

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Camera, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { BottomSheet } from '../../../components/BottomSheet';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { useProfilePhoto } from '../hooks/useProfilePhoto';

interface PhotoUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  hasExistingPhoto: boolean;
  onPhotoUpdated: (imageUrl?: string) => void;
}

export const PhotoUploadSheet: React.FC<PhotoUploadSheetProps> = ({
  visible,
  onClose,
  hasExistingPhoto,
  onPhotoUpdated,
}) => {
  const colors = useThemeColors();
  const { isUploading, isDeleting, uploadPhoto, deletePhoto } = useProfilePhoto();

  const handleTakePhoto = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      cameraType: 'front',
      saveToPhotos: false,
    });

    if (result.assets && result.assets[0]?.uri) {
      const response = await uploadPhoto(result.assets[0].uri, result.assets[0].fileName);
      if (response.success) {
        onPhotoUpdated(response.imageUrl);
        onClose();
      }
    }
  };

  const handleChooseFromGallery = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });

    if (result.assets && result.assets[0]?.uri) {
      const response = await uploadPhoto(result.assets[0].uri, result.assets[0].fileName);
      if (response.success) {
        onPhotoUpdated(response.imageUrl);
        onClose();
      }
    }
  };

  const handleDeletePhoto = () => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deletePhoto();
            if (success) {
              onPhotoUpdated(undefined);
              onClose();
            }
          },
        },
      ]
    );
  };

  const isLoading = isUploading || isDeleting;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Update Profile Photo"
      snapPoint={40}
      showHandle={true}
      showCloseButton={true}
    >
      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {isUploading ? 'Uploading photo...' : 'Deleting photo...'}
            </Text>
          </View>
        ) : (
          <>
            {/* Take Photo */}
            <TouchableOpacity
              style={[
                styles.option,
                { backgroundColor: colors.backgroundSecondary },
              ]}
              onPress={handleTakePhoto}
            >
              <View
                style={[styles.optionIcon, { backgroundColor: colors.primary + '20' }]}
              >
                <Camera size={24} color={colors.primary} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Take Photo
                </Text>
                <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                  Use your camera to take a new photo
                </Text>
              </View>
            </TouchableOpacity>

            {/* Choose from Gallery */}
            <TouchableOpacity
              style={[
                styles.option,
                { backgroundColor: colors.backgroundSecondary },
              ]}
              onPress={handleChooseFromGallery}
            >
              <View
                style={[styles.optionIcon, { backgroundColor: colors.primary + '20' }]}
              >
                <ImageIcon size={24} color={colors.primary} />
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>
                  Choose from Gallery
                </Text>
                <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                  Select an existing photo
                </Text>
              </View>
            </TouchableOpacity>

            {/* Delete Photo */}
            {hasExistingPhoto && (
              <TouchableOpacity
                style={[
                  styles.option,
                  { backgroundColor: colors.error + '10' },
                ]}
                onPress={handleDeletePhoto}
              >
                <View
                  style={[styles.optionIcon, { backgroundColor: colors.error + '20' }]}
                >
                  <Trash2 size={24} color={colors.error} />
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { color: colors.error }]}>
                    Remove Photo
                  </Text>
                  <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>
                    Delete your current profile photo
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  optionSubtitle: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
});

export default PhotoUploadSheet;
