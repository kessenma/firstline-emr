// apps/mobile/src/components/patient-chart/media-gallery/TelegramMediaGalleryView.tsx
// Gallery for telegram media with filter chip bar (images, videos, audio, files)

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ImageIcon, VideoIcon, Music, FileText, RefreshCw } from 'lucide-react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, typography } from '../../../utils/theme';
import { MediaGrid } from '../../ui/MediaGrid';
import { FullScreenMediaViewer } from '../../ui/FullScreenMediaViewer';
import { Tabs, TabsList, TabsTrigger } from '../../ui/Tabs';
import { useTelegramMediaViewModel, type TelegramMediaFilter } from './hooks/useTelegramMediaViewModel';

const EMPTY_TEXT: Record<TelegramMediaFilter, string> = {
  all: 'No media from Telegram',
  images: 'No images from Telegram',
  videos: 'No videos from Telegram',
  audio: 'No audio from Telegram',
  files: 'No files from Telegram',
};

interface TelegramMediaGalleryViewProps {
  mediaCacheEnabled: boolean;
  insideBottomSheet?: boolean;
}

export const TelegramMediaGalleryView: React.FC<TelegramMediaGalleryViewProps> = ({
  mediaCacheEnabled,
  insideBottomSheet,
}) => {
  const colors = useThemeColors();
  const [refreshing, setRefreshing] = useState(false);

  const {
    mediaFilter,
    setMediaFilter,
    items,
    isLoading,
    error,
    refresh,
    selectedIndex,
    openFullScreen,
    closeFullScreen,
  } = useTelegramMediaViewModel(mediaCacheEnabled);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderListHeader = () => (
    <Tabs value={mediaFilter} onValueChange={(id) => setMediaFilter(id as TelegramMediaFilter)} variant="chip">
      <TabsList>
        <TabsTrigger value="all" label="All" />
        <TabsTrigger value="images" label="Images" icon={ImageIcon} />
        <TabsTrigger value="videos" label="Videos" icon={VideoIcon} />
        <TabsTrigger value="audio" label="Audio" icon={Music} />
        <TabsTrigger value="files" label="Files" icon={FileText} />
      </TabsList>
    </Tabs>
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

      {/* Media grid */}
      <MediaGrid
        items={items}
        onItemPress={openFullScreen}
        isLoading={isLoading}
        emptyText={EMPTY_TEXT[mediaFilter]}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListHeaderComponent={renderListHeader()}
        FlatListComponent={insideBottomSheet ? BottomSheetFlatList : undefined}
      />

      {/* Fullscreen viewer */}
      {selectedIndex !== null && (
        <FullScreenMediaViewer
          visible={true}
          items={items}
          initialIndex={selectedIndex}
          onClose={closeFullScreen}
        />
      )}
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
});

export default TelegramMediaGalleryView;
