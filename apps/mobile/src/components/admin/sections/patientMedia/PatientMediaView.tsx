// apps/mobile/src/components/admin/sections/patientMedia/PatientMediaView.tsx
// Admin gallery of every patient's media, served from PowerSync so it keeps
// working offline. Tiles resolve their own thumbnails as they scroll into view.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Images, ImageIcon, FileText, Search } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../../../utils/theme';
import { MediaGrid } from '../../../ui/MediaGrid';
import { MediaThumbnail } from '../../../ui/MediaThumbnail';
import {
  FullScreenMediaViewer,
  type ViewerMediaItem,
} from '../../../ui/FullScreenMediaViewer';
import { Tabs, TabsList, TabsTrigger } from '../../../ui/Tabs';
import ErrorState from '../../shared/ErrorState';
import { useResolvedMediaUri } from '../../../../hooks/useResolvedMediaUri';
import { getSignedUrl } from '../../../../services/MediaService';
import {
  usePatientMediaViewModel,
  type PatientMediaFilter,
  type PatientMediaListItem,
} from '../../../../viewModels/admin/usePatientMediaViewModel';
import type { MediaItem } from '@fajr/shared/media';

const EMPTY_TEXT: Record<PatientMediaFilter, string> = {
  all: 'No patient media synced yet',
  images: 'No patient images synced yet',
  pdf: 'No patient documents synced yet',
};

const SEARCH_DEBOUNCE_MS = 300;

export function PatientMediaView() {
  const colors = useThemeColors();
  const {
    items,
    totalCount,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    search,
    setSearch,
    filter,
    setFilter,
    refresh,
    loadMore,
    selectedIndex,
    openViewer,
    closeViewer,
  } = usePatientMediaViewModel();

  // The query re-runs on every param change, so the typed value is debounced
  // before it reaches the view model.
  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, setSearch]);

  const gridItems = useMemo<MediaItem[]>(
    () =>
      items.map(item => ({
        id: item.id,
        uri: '', // resolved per tile
        type: item.type,
      })),
    [items],
  );

  const renderThumbnail = useCallback(
    ({ index, size }: { index: number; size: number }) => {
      const item = items[index];
      if (!item) return <View />;
      return (
        <PatientMediaThumb
          item={item}
          size={size}
          onPress={() => openViewer(index)}
        />
      );
    },
    [items, openViewer],
  );

  const listHeader = (
    <View>
      <View
        style={[
          styles.searchBox,
          { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
        ]}
      >
        <Search size={16} color={colors.textSecondary} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by patient name"
          placeholderTextColor={colors.textSecondary}
          style={[styles.searchInput, { color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
      </View>

      <Tabs
        value={filter}
        onValueChange={value => setFilter(value as PatientMediaFilter)}
        variant="chip"
      >
        <TabsList>
          <TabsTrigger value="all" label="All" />
          <TabsTrigger value="images" label="Images" icon={ImageIcon} />
          <TabsTrigger value="pdf" label="Documents" icon={FileText} />
        </TabsList>
      </Tabs>

      <Text style={[styles.countText, { color: colors.textSecondary }]}>
        {totalCount} {totalCount === 1 ? 'item' : 'items'}
      </Text>
    </View>
  );

  if (error && items.length === 0) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  return (
    <View style={styles.container}>
      <MediaGrid
        items={gridItems}
        isLoading={isLoading}
        emptyText={EMPTY_TEXT[filter]}
        emptyIcon={<Images size={48} color={colors.textSecondary} />}
        onRefresh={refresh}
        refreshing={isRefreshing}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
        onEndReached={loadMore}
        renderThumbnail={renderThumbnail}
      />

      {selectedIndex !== null && (
        <PatientMediaViewer
          items={items}
          initialIndex={selectedIndex}
          onClose={closeViewer}
        />
      )}
    </View>
  );
}

// ── Grid tile ──

interface PatientMediaThumbProps {
  item: PatientMediaListItem;
  size: number;
  onPress: () => void;
}

function PatientMediaThumb({ item, size, onPress }: PatientMediaThumbProps) {
  const colors = useThemeColors();
  // Thumbnails keep the grid cheap; the viewer fetches full-size separately.
  // A PDF resolves to a rendered page one, which is a preview rather than the
  // media itself, so it goes in as `thumbnailUri`.
  const { uri, isResolving } = useResolvedMediaUri(item.filePath, {
    preferThumb: true,
    type: item.type,
  });

  if (!uri && isResolving) {
    return (
      <View
        style={[
          styles.thumbPlaceholder,
          { width: size, height: size, backgroundColor: colors.surfaceSecondary },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <MediaThumbnail
      uri={item.type === 'image' ? (uri ?? '') : ''}
      type={item.type}
      thumbnailUri={item.type === 'image' ? undefined : uri}
      size={size}
      onPress={onPress}
    />
  );
}

// ── Full-screen viewer ──

interface PatientMediaViewerProps {
  items: PatientMediaListItem[];
  initialIndex: number;
  onClose: () => void;
}

function PatientMediaViewer({
  items,
  initialIndex,
  onClose,
}: PatientMediaViewerProps) {
  const [fullUris, setFullUris] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Grid tiles hold thumbnails; the viewer needs originals. Only the visible
  // item and its immediate neighbours are fetched, so paging stays instant
  // without signing every URL in the list.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const window = [currentIndex - 1, currentIndex, currentIndex + 1];
      for (const index of window) {
        const item = items[index];
        if (!item || fullUris[item.id]) continue;

        const resolved = await getSignedUrl(item.filePath);
        if (cancelled) return;
        if (resolved) {
          setFullUris(prev => ({ ...prev, [item.id]: resolved }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items, currentIndex, fullUris]);

  const viewerItems = useMemo<ViewerMediaItem[]>(
    () =>
      items.map(item => ({
        id: item.id,
        uri: fullUris[item.id] ?? '',
        type: item.type,
        fileName: item.fileName,
        mimeType: item.contentType ?? undefined,
      })),
    [items, fullUris],
  );

  const handleRequestRefresh = useCallback(
    async (_item: ViewerMediaItem, index: number) => {
      const item = items[index];
      if (!item) return null;
      const resolved = await getSignedUrl(item.filePath);
      if (resolved) {
        setFullUris(prev => ({ ...prev, [item.id]: resolved }));
      }
      return resolved;
    },
    [items],
  );

  return (
    <FullScreenMediaViewer
      visible
      items={viewerItems}
      initialIndex={initialIndex}
      onClose={onClose}
      onIndexChange={setCurrentIndex}
      onRequestRefresh={handleRequestRefresh}
      renderFooter={(_viewerItem, index) => {
        const item = items[index];
        if (!item) return null;
        return (
          <View>
            <Text style={styles.footerPatient}>{item.patientName}</Text>
            <Text style={styles.footerMeta}>
              {new Date(item.uploadedAt).toLocaleString()}
            </Text>
            {item.contentType && (
              <Text style={styles.footerMeta}>{item.contentType}</Text>
            )}
            <Text style={styles.footerPath} numberOfLines={2}>
              {item.filePath}
            </Text>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontSize: typography.fontSize.base,
  },
  countText: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  loadingMore: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  thumbPlaceholder: {
    aspectRatio: 1,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerPatient: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  footerMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.fontSize.sm,
    marginTop: 2,
  },
  footerPath: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: typography.fontSize.xs,
    marginTop: spacing.sm,
  },
});

export default PatientMediaView;
