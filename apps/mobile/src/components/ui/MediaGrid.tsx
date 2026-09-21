// apps/mobile/src/components/ui/MediaGrid.tsx
// Reusable FlatList-based grid for displaying media thumbnails

import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { ImageOff } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, typography } from '../../utils/theme';
import { Skeleton } from './Skeleton';
import { MediaThumbnail, type MediaThumbnailItem } from './MediaThumbnail';

interface MediaGridProps {
  items: MediaThumbnailItem[];
  onItemPress?: (index: number) => void;
  onItemLongPress?: (index: number) => void;
  numColumns?: number;
  isLoading?: boolean;
  emptyText?: string;
  emptyIcon?: React.ReactNode;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  ListHeaderComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
  contentContainerStyle?: object;
  /** Ids of selected items — drives the selection border on each tile. */
  selectedIds?: string[];
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  /**
   * Replaces the default MediaThumbnail, for tiles that resolve their own URI
   * (signed URLs, offline cache lookups) instead of receiving a ready one.
   */
  renderThumbnail?: (args: {
    item: MediaThumbnailItem;
    index: number;
    size: number;
    isSelected: boolean;
  }) => React.ReactElement;
  /** Override the FlatList implementation (e.g. BottomSheetFlatList for use inside a BottomSheet) */
  FlatListComponent?: React.ComponentType<any>;
}

const GRID_GAP = spacing.xs;

export const MediaGrid: React.FC<MediaGridProps> = ({
  items,
  onItemPress,
  onItemLongPress,
  numColumns = 3,
  isLoading = false,
  emptyText = 'No media found',
  emptyIcon,
  onRefresh,
  refreshing = false,
  ListHeaderComponent,
  ListFooterComponent,
  contentContainerStyle,
  selectedIds,
  onEndReached,
  onEndReachedThreshold = 0.5,
  renderThumbnail,
  FlatListComponent,
}) => {
  const ListComponent = FlatListComponent || FlatList;
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();

  const itemSize = (screenWidth - spacing.md * 2 - GRID_GAP * (numColumns - 1)) / numColumns;

  const renderItem = useCallback(
    ({ item, index }: { item: MediaThumbnailItem; index: number }) => {
      const isSelected = selectedIds?.includes(item.id) ?? false;
      return (
        <View style={{ width: itemSize, height: itemSize, marginBottom: GRID_GAP }}>
          {renderThumbnail ? (
            renderThumbnail({ item, index, size: itemSize, isSelected })
          ) : (
            <MediaThumbnail
              uri={item.uri}
              type={item.type}
              isSelected={isSelected}
              onPress={() => onItemPress?.(index)}
              onLongPress={onItemLongPress ? () => onItemLongPress(index) : undefined}
            />
          )}
        </View>
      );
    },
    [itemSize, onItemPress, onItemLongPress, selectedIds, renderThumbnail],
  );

  const keyExtractor = useCallback(
    (item: MediaThumbnailItem) => item.id,
    [],
  );

  // Loading skeleton
  if (isLoading && items.length === 0) {
    return (
      <View style={styles.container}>
        {ListHeaderComponent}
        <View style={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              width={itemSize}
              height={itemSize}
              borderRadius={8}
              style={{ marginBottom: GRID_GAP }}
            />
          ))}
        </View>
      </View>
    );
  }

  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <View style={styles.container}>
        {ListHeaderComponent}
        <View style={styles.emptyContainer}>
          {emptyIcon || <ImageOff size={48} color={colors.textSecondary} />}
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {emptyText}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ListComponent
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      columnWrapperStyle={{ gap: GRID_GAP }}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      extraData={selectedIds}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        ) : undefined
      }
      // Performance
      removeClippedSubviews={true}
      maxToRenderPerBatch={12}
      windowSize={5}
      initialNumToRender={12}
      getItemLayout={(_data: any, index: number) => ({
        length: itemSize + GRID_GAP,
        offset: (itemSize + GRID_GAP) * Math.floor(index / numColumns),
        index,
      })}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.massive,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default MediaGrid;
