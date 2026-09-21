// apps/mobile/src/components/patient-chart/media-gallery/PatientPhotosGalleryView.tsx
// Grid view for patient photos with expandable FAB, filter chips, and progress tracking

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import {
  ImageIcon,
  FileText,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { MediaGrid } from '../../ui/MediaGrid';
import { FullScreenMediaViewer } from '../../ui/FullScreenMediaViewer';
import { Tabs, TabsList, TabsTrigger } from '../../ui/Tabs';
import { ExpandableFAB } from './ExpandableFAB';
import { usePatientPhotosViewModel } from './hooks/usePatientPhotosViewModel';
import { useMediaUpload, type UploadingItem } from './hooks/useMediaUpload';

type PatientMediaFilter = 'all' | 'images' | 'documents';

interface PatientPhotosGalleryViewProps {
  mediaCacheEnabled: boolean;
  insideBottomSheet?: boolean;
}

export const PatientPhotosGalleryView: React.FC<PatientPhotosGalleryViewProps> = ({
  mediaCacheEnabled,
  insideBottomSheet,
}) => {
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<PatientMediaFilter>('all');

  const {
    photos,
    isLoading,
    error,
    refresh,
    selectedIndex,
    openFullScreen,
    closeFullScreen,
  } = usePatientPhotosViewModel(mediaCacheEnabled);

  const {
    pickFromCamera,
    pickFromGallery,
    pickDocument,
    uploadingItems,
    isUploading,
    cancelUpload,
    retryUpload,
  } = useMediaUpload();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const filteredPhotos = useMemo(() => {
    if (filterType === 'all') return photos;
    if (filterType === 'images') return photos.filter(p => p.type !== 'pdf');
    if (filterType === 'documents') return photos.filter(p => p.type === 'pdf');
    return photos;
  }, [photos, filterType]);

  const emptyText = filterType === 'all'
    ? 'No files uploaded yet'
    : filterType === 'images'
      ? 'No images uploaded yet'
      : 'No documents uploaded yet';

  // Upload progress header
  const renderUploadHeader = () => {
    if (uploadingItems.length === 0) return null;

    return (
      <View style={[styles.uploadSection, { borderColor: colors.border }]}>
        <Text style={[styles.uploadTitle, { color: colors.text }]}>
          Uploads ({uploadingItems.length})
        </Text>
        {uploadingItems.map(item => (
          <UploadItemRow
            key={item.id}
            item={item}
            onCancel={cancelUpload}
            onRetry={retryUpload}
          />
        ))}
      </View>
    );
  };

  const renderListHeader = () => (
    <>
      <Tabs value={filterType} onValueChange={(v) => setFilterType(v as PatientMediaFilter)} variant="chip">
        <TabsList>
          <TabsTrigger value="all" label="All" />
          <TabsTrigger value="images" label="Images" icon={ImageIcon} />
          <TabsTrigger value="documents" label="Documents" icon={FileText} />
        </TabsList>
      </Tabs>
      {renderUploadHeader()}
    </>
  );

  return (
    <View style={styles.container}>
      {/* Error banner */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error }]}>
          <Text style={[styles.errorText, { color: colors.textInverse }]}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <RefreshCw size={16} color={colors.textInverse} />
          </TouchableOpacity>
        </View>
      )}

      {/* Photo grid */}
      <MediaGrid
        items={filteredPhotos}
        onItemPress={openFullScreen}
        isLoading={isLoading}
        emptyText={emptyText}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListHeaderComponent={renderListHeader()}
        FlatListComponent={insideBottomSheet ? BottomSheetFlatList : undefined}
      />

      {/* Expandable Upload FAB */}
      <ExpandableFAB
        onCamera={pickFromCamera}
        onGallery={pickFromGallery}
        onDocument={pickDocument}
        disabled={isUploading}
      />

      {/* Fullscreen viewer */}
      {selectedIndex !== null && (
        <FullScreenMediaViewer
          visible={true}
          items={filteredPhotos}
          initialIndex={selectedIndex}
          onClose={closeFullScreen}
        />
      )}
    </View>
  );
};

/** Single upload progress row */
const UploadItemRow: React.FC<{
  item: UploadingItem;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}> = ({ item, onCancel, onRetry }) => {
  const colors = useThemeColors();

  const isPdf = item.fileName.toLowerCase().endsWith('.pdf');

  return (
    <View style={styles.uploadRow}>
      {isPdf ? (
        <View style={[styles.uploadThumb, styles.uploadThumbPdf]}>
          <FileText size={20} color={colors.textSecondary} />
        </View>
      ) : (
        <Image
          source={{ uri: item.localUri }}
          style={styles.uploadThumb}
          resizeMode="cover"
        />
      )}
      <View style={styles.uploadInfo}>
        <Text style={[styles.uploadFileName, { color: colors.text }]} numberOfLines={1}>
          {item.fileName}
        </Text>
        {item.status === 'error' ? (
          <View style={styles.uploadErrorRow}>
            <AlertCircle size={12} color={colors.error} />
            <Text style={[styles.uploadErrorText, { color: colors.error }]}>
              {item.error || 'Failed'}
            </Text>
          </View>
        ) : (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${item.progress}%`,
                  backgroundColor: item.status === 'complete' ? colors.success : colors.primary,
                },
              ]}
            />
          </View>
        )}
      </View>
      {item.status === 'error' ? (
        <TouchableOpacity onPress={() => onRetry(item.id)} style={styles.uploadAction}>
          <RefreshCw size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : item.status === 'pending' ? (
        <TouchableOpacity onPress={() => onCancel(item.id)} style={styles.uploadAction}>
          <X size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  uploadSection: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  uploadTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  uploadThumb: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
  },
  uploadThumbPdf: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadInfo: {
    flex: 1,
  },
  uploadFileName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  uploadErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  uploadErrorText: {
    fontSize: typography.fontSize.xs,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  uploadAction: {
    padding: spacing.xs,
  },
});

export default PatientPhotosGalleryView;
