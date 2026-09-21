// apps/mobile/src/screens/user-profile/components/MedicalLicenseSheet.tsx
// Bottom sheet for viewing medical licenses

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { FileText, Upload, ExternalLink, CheckCircle, Clock, XCircle } from 'lucide-react-native';
import { BottomSheet } from '../../../components/BottomSheet';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { useProfileMedicalLicense } from '../hooks/useProfileMedicalLicense';
import type { MedicalLicense } from '../types';

interface MedicalLicenseSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  onUploadPress: () => void;
}

export const MedicalLicenseSheet: React.FC<MedicalLicenseSheetProps> = ({
  visible,
  onClose,
  userId,
  onUploadPress,
}) => {
  const colors = useThemeColors();
  const { licenses, isLoading, fetchMedicalLicenses } = useProfileMedicalLicense();

  useEffect(() => {
    if (visible && userId) {
      fetchMedicalLicenses(userId);
    }
  }, [visible, userId, fetchMedicalLicenses]);

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: MedicalLicense['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle size={16} color={colors.success} />;
      case 'pending':
        return <Clock size={16} color={colors.warning} />;
      case 'rejected':
        return <XCircle size={16} color={colors.error} />;
    }
  };

  const getStatusColor = (status: MedicalLicense['status']) => {
    switch (status) {
      case 'verified':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'rejected':
        return colors.error;
    }
  };

  const handleViewLicense = (license: MedicalLicense) => {
    if (license.fileUrl) {
      Linking.openURL(license.fileUrl).catch(err => {
        console.error('Failed to open license URL:', err);
      });
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Medical Licenses"
      snapPoint={65}
      showHandle={true}
      showCloseButton={true}
    >
      <View style={styles.content}>
        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadButton, { backgroundColor: colors.primary }]}
          onPress={onUploadPress}
        >
          <Upload size={20} color={colors.surface} />
          <Text style={[styles.uploadButtonText, { color: colors.surface }]}>
            Upload New License
          </Text>
        </TouchableOpacity>

        {/* Licenses List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Your Licenses
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading licenses...
            </Text>
          </View>
        ) : licenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No medical licenses uploaded
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Upload your medical license to verify your credentials
            </Text>
          </View>
        ) : (
          <View style={styles.licensesContainer}>
            {licenses.map(license => (
              <TouchableOpacity
                key={license.id}
                style={[
                  styles.licenseItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleViewLicense(license)}
              >
                <View style={styles.licenseInfo}>
                  <View
                    style={[
                      styles.licenseIcon,
                      { backgroundColor: colors.primary + '20' },
                    ]}
                  >
                    <FileText size={18} color={colors.primary} />
                  </View>
                  <View style={styles.licenseDetails}>
                    <Text style={[styles.licenseSpecialty, { color: colors.text }]}>
                      {license.specialty}
                    </Text>
                    <Text
                      style={[styles.licenseFileName, { color: colors.textSecondary }]}
                      numberOfLines={1}
                    >
                      {license.fileName}
                    </Text>
                    <View style={styles.licenseStatus}>
                      {getStatusIcon(license.status)}
                      <Text
                        style={[
                          styles.licenseStatusText,
                          { color: getStatusColor(license.status) },
                        ]}
                      >
                        {license.status.charAt(0).toUpperCase() + license.status.slice(1)}
                      </Text>
                      <Text
                        style={[styles.licenseDate, { color: colors.textTertiary }]}
                      >
                        {' '}
                        · {formatDate(license.uploadedAt)}
                      </Text>
                    </View>
                  </View>
                </View>
                <ExternalLink size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  uploadButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  licensesContainer: {
    gap: spacing.md,
  },
  licenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  licenseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  licenseIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  licenseDetails: {
    flex: 1,
  },
  licenseSpecialty: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  licenseFileName: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  licenseStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  licenseStatusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  licenseDate: {
    fontSize: typography.fontSize.sm,
  },
});

export default MedicalLicenseSheet;
