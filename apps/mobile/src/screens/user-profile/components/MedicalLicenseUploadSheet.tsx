// apps/mobile/src/screens/user-profile/components/MedicalLicenseUploadSheet.tsx
// Bottom sheet for uploading medical license

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { FileText, Upload, Check } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { BottomSheet } from '../../../components/BottomSheet';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { useProfileMedicalLicense } from '../hooks/useProfileMedicalLicense';
import { DoctorSpecialties } from '../../../data';

interface MedicalLicenseUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const MedicalLicenseUploadSheet: React.FC<MedicalLicenseUploadSheetProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const colors = useThemeColors();
  const { isUploading, uploadMedicalLicense } = useProfileMedicalLicense();

  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);

  const handlePickDocument = async () => {
    try {
      const [result] = await pick({
        type: ['application/pdf', 'image/*'],
      });

      if (result) {
        setSelectedFile({
          uri: result.uri,
          name: result.name || 'document',
          type: result.type || 'application/pdf',
        });
      }
    } catch (err) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        console.error('Document picker error:', err);
        Alert.alert('Error', 'Failed to select document');
      }
    }
  };

  const handlePickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
    });

    if (result.assets && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri || '',
        name: asset.fileName || 'license_image.jpg',
        type: asset.type || 'image/jpeg',
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedSpecialty) {
      Alert.alert('Missing Information', 'Please select a file and specialty');
      return;
    }

    const success = await uploadMedicalLicense(
      selectedFile.uri,
      selectedFile.name,
      selectedFile.type,
      selectedSpecialty
    );

    if (success) {
      setSelectedFile(null);
      setSelectedSpecialty(null);
      onSuccess();
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setSelectedSpecialty(null);
    onClose();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title="Upload Medical License"
      snapPoint={80}
      showHandle={true}
      showCloseButton={true}
    >
      <View style={styles.content}>
        {/* File Selection */}
        <Text style={[styles.label, { color: colors.text }]}>
          Select License Document
        </Text>
        <View style={styles.fileButtons}>
          <TouchableOpacity
            style={[
              styles.fileButton,
              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
            ]}
            onPress={handlePickDocument}
          >
            <FileText size={24} color={colors.primary} />
            <Text style={[styles.fileButtonText, { color: colors.text }]}>
              PDF Document
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.fileButton,
              { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
            ]}
            onPress={handlePickImage}
          >
            <Upload size={24} color={colors.primary} />
            <Text style={[styles.fileButtonText, { color: colors.text }]}>
              Image
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selected File */}
        {selectedFile && (
          <View
            style={[
              styles.selectedFile,
              { backgroundColor: colors.success + '15', borderColor: colors.success },
            ]}
          >
            <Check size={20} color={colors.success} />
            <Text
              style={[styles.selectedFileName, { color: colors.text }]}
              numberOfLines={1}
            >
              {selectedFile.name}
            </Text>
          </View>
        )}

        {/* Specialty Selection */}
        <Text style={[styles.label, { color: colors.text, marginTop: spacing.lg }]}>
          Select Specialty
        </Text>
        <View style={styles.specialtiesContainer}>
          {DoctorSpecialties.map(specialty => (
            <TouchableOpacity
              key={specialty}
              style={[
                styles.specialtyChip,
                {
                  backgroundColor:
                    selectedSpecialty === specialty
                      ? colors.primary
                      : colors.backgroundSecondary,
                  borderColor:
                    selectedSpecialty === specialty ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedSpecialty(specialty)}
            >
              <Text
                style={[
                  styles.specialtyChipText,
                  {
                    color:
                      selectedSpecialty === specialty
                        ? colors.surface
                        : colors.text,
                  },
                ]}
              >
                {specialty}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={[
            styles.uploadButton,
            {
              backgroundColor: colors.primary,
              opacity: !selectedFile || !selectedSpecialty || isUploading ? 0.5 : 1,
            },
          ]}
          onPress={handleUpload}
          disabled={!selectedFile || !selectedSpecialty || isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <>
              <Upload size={20} color={colors.surface} />
              <Text style={[styles.uploadButtonText, { color: colors.surface }]}>
                Upload License
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.sm,
  },
  fileButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  fileButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  fileButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  selectedFileName: {
    flex: 1,
    fontSize: typography.fontSize.base,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  specialtyChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
  },
  specialtyChipText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: 'auto',
    gap: spacing.sm,
  },
  uploadButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default MedicalLicenseUploadSheet;
