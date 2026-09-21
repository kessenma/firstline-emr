// apps/mobile/src/components/admin/sections/imageStorage/ImageStorageView.tsx
// Image Storage view component with stats, grid, preview, and delete functionality

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  Image as ImageIcon,
  Trash2,
  CheckSquare,
  Square,
  HardDrive,
  File,
  Calendar,
  Download,
  ChevronDown,
  Info,
  ExternalLink,
  Copy,
  FileText,
  Music,
  Video,
} from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { useImageStorageViewModel } from '../../../../viewModels/admin/useImageStorageViewModel';
import ErrorState from '../../shared/ErrorState';
import { LoadingState } from '../../shared/LoadingState';
import { EmptyState } from '../../shared/EmptyState';
import {
  FullScreenMediaViewer,
  type ViewerMediaItem,
} from '../../../ui/FullScreenMediaViewer';
import { adminApi } from '../../../../utils/admin/adminApi';
import { resolveMediaType } from '@fajr/shared/media';
import type { StorageImage } from '../../../../types/admin';
import {
  STORAGE_CATEGORIES,
  STORAGE_GROUP_LABELS,
  STORAGE_GROUP_ORDER,
  type StorageCategoryId,
  type StorageCategoryGroup,
} from '@fajr/shared/admin';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_COLUMNS = 3;
const GRID_SPACING = spacing.sm;
const IMAGE_SIZE =
  (SCREEN_WIDTH - spacing.base * 2 - GRID_SPACING * (GRID_COLUMNS + 1)) /
  GRID_COLUMNS;

export function ImageStorageView() {
  const colors = useThemeColors();
  const {
    images,
    stats,
    selectedImages,
    totalCount,
    isLoading,
    isRefreshing,
    isDeleting,
    isBulkDeleting,
    isLoadingMore,
    error,
    sortBy,
    sortOrder,
    refreshData,
    loadMore,
    deleteImage,
    bulkDeleteImages,
    toggleImageSelection,
    selectAllImages,
    clearSelection,
    setSortBy,
    toggleSortOrder,
    clearError,
    hasImages,
    hasSelection,
    selectedCount,
    isAllSelected,
    formattedStorageUsed,
    formattedTotalSize,
    storageUsagePercentage,
    storageAdminUrl,
    isOpeningConsole,
    openStorageConsole,
    copyStorageConsoleUrl,
    category,
    group,
    categoryStats,
    setCategory,
    setGroup,
  } = useImageStorageViewModel();

  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  // The viewer pages through whatever is currently loaded, so prev/next spans
  // the full list rather than one item.
  const viewerItems = useMemo<ViewerMediaItem[]>(
    () =>
      images.map(image => ({
        id: image.id,
        uri: image.url || image.thumbnail || '',
        type: resolveMediaType({
          mimeType: image.mimeType,
          fileName: image.fileName,
        }),
        fileName: image.fileName,
        mimeType: image.mimeType,
        fileSize: image.fileSize,
      })),
    [images],
  );

  const handleRequestRefresh = useCallback(
    async (_item: ViewerMediaItem, index: number) => {
      const image = images[index];
      if (!image) return null;
      const { url } = await adminApi.getImageSignedUrl(image.key);
      return url ?? null;
    },
    [images],
  );

  // Handle delete with confirmation
  const handleDelete = (image: StorageImage) => {
    Alert.alert(
      'Delete Image',
      `Are you sure you want to delete "${image.fileName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteImage(image.id, image.key),
        },
      ],
    );
  };

  // Handle image preview
  const handleImagePress = (image: StorageImage, index: number) => {
    if (hasSelection) {
      // If in selection mode, toggle selection
      toggleImageSelection(image.id);
    } else {
      // Otherwise, preview image
      setPreviewIndex(index);
    }
  };

  // Loading state
  if (isLoading && !hasImages) {
    return <LoadingState message="Loading image storage..." />;
  }

  const consoleCard = (
    <StorageConsoleCard
      url={storageAdminUrl}
      isOpening={isOpeningConsole}
      onOpen={openStorageConsole}
      onCopy={copyStorageConsoleUrl}
      colors={colors}
    />
  );

  // Error state (only show if no images and not a "not implemented" error).
  // The console link stays visible here — a failing images API is exactly when
  // an admin wants to go poke at the bucket directly.
  if (error && !hasImages && !error.includes('not yet implemented')) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {consoleCard}
        <ErrorState
          message={error}
          onRetry={() => {
            clearError();
            refreshData();
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {consoleCard}

      {/* Header with storage stats */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <HardDrive size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formattedStorageUsed}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Used
            </Text>
          </View>
          <View style={styles.statItem}>
            <File size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {stats?.totalFiles || totalCount || 0}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              Files
            </Text>
          </View>
          <View style={styles.statItem}>
            <Download size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>
              {storageUsagePercentage !== null
                ? `${storageUsagePercentage}%`
                : formattedStorageUsed}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {storageUsagePercentage !== null ? 'Of Budget' : 'Stored'}
            </Text>
          </View>
        </View>

        {/* Only shown when a quota is configured. Object storage cannot report
            real disk capacity, so without one there is no honest denominator. */}
        {stats && storageUsagePercentage !== null && (
          <View style={styles.progressContainer}>
            <View
              style={[styles.progressBar, { backgroundColor: colors.border }]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${storageUsagePercentage}%`,
                  },
                  storageUsagePercentage > 90
                    ? { backgroundColor: colors.error }
                    : storageUsagePercentage > 70
                    ? { backgroundColor: colors.warning }
                    : { backgroundColor: colors.primary },
                ]}
              />
            </View>
            <Text
              style={[styles.progressText, { color: colors.textSecondary }]}
            >
              {formattedStorageUsed} of {formattedTotalSize} budget
            </Text>
          </View>
        )}
      </View>

      {/* Category filter — clinical vs operational, then individual categories */}
      <CategoryFilter
        category={category}
        group={group}
        categoryStats={categoryStats}
        onSelectCategory={setCategory}
        onSelectGroup={setGroup}
        colors={colors}
      />

      {/* Warning banner for not implemented */}
      {error && error.includes('not yet implemented') && (
        <View style={[styles.warningBanner, { backgroundColor: colors.warning + '15' }]}>
          <Info size={20} color={colors.warning} />
          <Text style={[styles.warningText, { color: colors.warningDark }]}>
            {error}
          </Text>
        </View>
      )}

      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface }]}>
        <View style={styles.toolbarLeft}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={isAllSelected ? clearSelection : selectAllImages}
            disabled={!hasImages}
          >
            {isAllSelected ? (
              <CheckSquare size={20} color={colors.primary} />
            ) : (
              <Square size={20} color={colors.text} />
            )}
            <Text style={[styles.toolbarButtonText, { color: colors.text }]}>
              {hasSelection ? `${selectedCount} selected` : 'Select All'}
            </Text>
          </TouchableOpacity>

          {hasSelection && (
            <TouchableOpacity
              style={[
                styles.deleteButton,
                { backgroundColor: colors.error + '15' },
                isBulkDeleting && styles.deleteButtonDisabled,
              ]}
              onPress={bulkDeleteImages}
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? (
                <ActivityIndicator size="small" color={colors.error} />
              ) : (
                <>
                  <Trash2 size={18} color={colors.error} />
                  <Text
                    style={[
                      styles.deleteButtonText,
                      { color: colors.error },
                    ]}
                  >
                    Delete
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setShowSortMenu(true)}
        >
          <Text style={[styles.sortButtonText, { color: colors.text }]}>
            Sort:{' '}
            {sortBy === 'uploadedAt'
              ? 'Date'
              : sortBy === 'fileName'
              ? 'Name'
              : 'Size'}
          </Text>
          <ChevronDown size={16} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Image Grid */}
      {hasImages ? (
        <FlatList
          data={images}
          keyExtractor={item => item.id}
          numColumns={GRID_COLUMNS}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item, index }) => (
            <ImageGridItem
              image={item}
              isSelected={selectedImages.has(item.id)}
              onPress={() => handleImagePress(item, index)}
              onLongPress={() => toggleImageSelection(item.id)}
              onDelete={() => handleDelete(item)}
              colors={colors}
              isDeleting={isDeleting}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshData}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text
                  style={[
                    styles.loadingMoreText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Loading more...
                </Text>
              </View>
            ) : null
          }
        />
      ) : (
        <EmptyState
          icon={ImageIcon}
          title="No images in storage"
          message={
            error
              ? 'API not yet implemented. Check documentation for setup.'
              : 'Upload some images to get started'
          }
        />
      )}

      {/* Image Preview */}
      <FullScreenMediaViewer
        visible={previewIndex !== null}
        items={viewerItems}
        initialIndex={previewIndex ?? 0}
        onClose={() => setPreviewIndex(null)}
        onRequestRefresh={handleRequestRefresh}
        renderFooter={(_item, index) => {
          const image = images[index];
          if (!image) return null;
          return (
            <StoragePreviewDetails
              image={image}
              onDelete={() => {
                setPreviewIndex(null);
                handleDelete(image);
              }}
            />
          );
        }}
      />

      {/* Sort Menu Modal */}
      {showSortMenu && (
        <Modal
          visible={true}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSortMenu(false)}
        >
          <TouchableOpacity
            style={styles.sortMenuOverlay}
            activeOpacity={1}
            onPress={() => setShowSortMenu(false)}
          >
            <View
              style={[
                styles.sortMenuContent,
                { backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.sortMenuTitle, { color: colors.text }]}>
                Sort By
              </Text>
              <TouchableOpacity
                style={styles.sortMenuItem}
                onPress={() => {
                  setSortBy('uploadedAt');
                  setShowSortMenu(false);
                }}
              >
                <Text style={[styles.sortMenuItemText, { color: colors.text }]}>
                  Date Uploaded
                </Text>
                {sortBy === 'uploadedAt' && (
                  <CheckSquare size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortMenuItem}
                onPress={() => {
                  setSortBy('fileName');
                  setShowSortMenu(false);
                }}
              >
                <Text style={[styles.sortMenuItemText, { color: colors.text }]}>
                  File Name
                </Text>
                {sortBy === 'fileName' && (
                  <CheckSquare size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortMenuItem}
                onPress={() => {
                  setSortBy('fileSize');
                  setShowSortMenu(false);
                }}
              >
                <Text style={[styles.sortMenuItemText, { color: colors.text }]}>
                  File Size
                </Text>
                {sortBy === 'fileSize' && (
                  <CheckSquare size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
              <View
                style={[
                  styles.sortMenuDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <TouchableOpacity
                style={styles.sortMenuItem}
                onPress={() => {
                  toggleSortOrder();
                  setShowSortMenu(false);
                }}
              >
                <Text style={[styles.sortMenuItemText, { color: colors.text }]}>
                  Order: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}

// Category Filter — horizontal chips. Group chips ("Clinical", "Operational")
// come first as coarse filters, then the individual categories, each showing its
// file count from the same scan that produced the stats header.
interface CategoryFilterProps {
  category: StorageCategoryId | null;
  group: StorageCategoryGroup | null;
  categoryStats: Map<
    StorageCategoryId,
    { fileCount: number; totalBytes: number }
  >;
  onSelectCategory: (id: StorageCategoryId | null) => void;
  onSelectGroup: (group: StorageCategoryGroup | null) => void;
  colors: any;
}

function CategoryFilter({
  category,
  group,
  categoryStats,
  onSelectCategory,
  onSelectGroup,
  colors,
}: CategoryFilterProps) {
  const chip = (
    key: string,
    label: string,
    isActive: boolean,
    onPress: () => void,
    count?: number,
  ) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.filterChip,
        { borderColor: colors.border },
        isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <Text
        style={[
          styles.filterChipText,
          { color: isActive ? colors.textInverse : colors.text },
        ]}
      >
        {label}
        {count !== undefined ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContent}
    >
      {chip('all', 'All', !category && !group, () => onSelectCategory(null))}

      {STORAGE_GROUP_ORDER.map(g =>
        chip(g, STORAGE_GROUP_LABELS[g], group === g, () =>
          onSelectGroup(group === g ? null : g),
        ),
      )}

      <View style={[styles.filterDivider, { backgroundColor: colors.border }]} />

      {STORAGE_CATEGORIES.map(c =>
        chip(
          c.id,
          c.label,
          category === c.id,
          () => onSelectCategory(category === c.id ? null : c.id),
          categoryStats.get(c.id)?.fileCount,
        ),
      )}
    </ScrollView>
  );
}

// Storage Console Card — link out to the RustFS admin console (a different host
// than the S3 API endpoint the app uploads through). Opens in the system browser
// so the SSO proxy in front of the console can authenticate the session.
interface StorageConsoleCardProps {
  url: string;
  isOpening: boolean;
  onOpen: () => void;
  onCopy: () => void;
  colors: any;
}

function StorageConsoleCard({
  url,
  isOpening,
  onOpen,
  onCopy,
  colors,
}: StorageConsoleCardProps) {
  return (
    <View style={[styles.consoleCard, { backgroundColor: colors.surface }]}>
      <View style={styles.consoleHeader}>
        <HardDrive size={18} color={colors.primary} />
        <View style={styles.consoleHeaderText}>
          <Text style={[styles.consoleTitle, { color: colors.text }]}>
            Object Storage Console
          </Text>
          <Text
            style={[styles.consoleUrl, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {url}
          </Text>
        </View>
      </View>

      <View style={styles.consoleActions}>
        <TouchableOpacity
          style={[styles.consoleOpenButton, { backgroundColor: colors.primary }]}
          onPress={onOpen}
          disabled={isOpening}
          accessibilityRole="button"
          accessibilityLabel="Open storage console in browser"
        >
          {isOpening ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <>
              <ExternalLink size={16} color={colors.textInverse} />
              <Text
                style={[
                  styles.consoleOpenButtonText,
                  { color: colors.textInverse },
                ]}
              >
                Open Console
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.consoleCopyButton, { borderColor: colors.border }]}
          onPress={onCopy}
          accessibilityRole="button"
          accessibilityLabel="Copy storage console URL"
        >
          <Copy size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Image Grid Item Component
interface ImageGridItemProps {
  image: StorageImage;
  isSelected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDelete: () => void;
  colors: any;
  isDeleting: boolean;
}

function ImageGridItem({
  image,
  isSelected,
  onPress,
  onLongPress,
  colors,
}: ImageGridItemProps) {
  const mediaType = resolveMediaType({
    mimeType: image.mimeType,
    fileName: image.fileName,
  });
  const isImage = mediaType === 'image';
  const isPdf = mediaType === 'pdf';
  // PDFs are previewable too — the server rasterizes page one.
  const canThumbnail = isImage || isPdf;

  const [lazyThumb, setLazyThumb] = useState<string | null | undefined>(
    undefined,
  );
  const [thumbFailed, setThumbFailed] = useState(false);

  // Thumbnails may not exist yet for objects uploaded before they were
  // generated, and the listing only signs ones already in the bucket. Ask the
  // server to make one; "unavailable" is a normal answer.
  const needsLazyThumb =
    canThumbnail && !image.isThumb && !image.thumbnail && !image.url;
  useEffect(() => {
    if (!needsLazyThumb) return;
    let cancelled = false;
    adminApi
      .getImageSignedUrl(image.key, { variant: 'thumb' })
      .then(({ url }) => {
        if (!cancelled) setLazyThumb(url);
      })
      .catch(() => {
        if (!cancelled) setLazyThumb(null);
      });
    return () => {
      cancelled = true;
    };
  }, [needsLazyThumb, image.key]);

  const source = image.isThumb
    ? image.url
    : image.thumbnail || image.url || lazyThumb || null;
  const showImage = canThumbnail && !!source && !thumbFailed;

  return (
    <TouchableOpacity
      style={[
        styles.gridItem,
        { backgroundColor: colors.surface },
        isSelected && styles.gridItemSelected,
        isSelected && { borderColor: colors.primary },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {showImage ? (
        <>
          <Image
            source={{ uri: source as string }}
            style={styles.gridImage}
            resizeMode="cover"
            onError={() => setThumbFailed(true)}
          />
          {/* A rendered page one looks like any other image — mark it. */}
          {isPdf && (
            <View style={styles.pdfBadge}>
              <Text style={styles.pdfBadgeText}>PDF</Text>
            </View>
          )}
        </>
      ) : (
        // Everything without a preview — documents, audio, video, or an image
        // whose thumbnail could not be made — reads as its type icon rather
        // than the blank square a failed <Image> leaves behind.
        <View style={styles.gridIconFallback}>
          <MediaTypeIcon type={mediaType} color={colors.textSecondary} />
        </View>
      )}
      {isSelected && (
        <View style={styles.selectionOverlay}>
          <View
            style={[styles.selectionBadge, { backgroundColor: colors.primary }]}
          >
            <CheckSquare size={20} color={colors.textInverse} />
          </View>
        </View>
      )}
      <View style={styles.gridItemFooter}>
        <Text
          style={[styles.gridItemText, { color: colors.text }]}
          numberOfLines={1}
        >
          {image.fileName}
        </Text>
        <Text style={[styles.gridItemSize, { color: colors.textSecondary }]}>
          {formatBytes(image.fileSize)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Stand-in for objects with no usable preview: documents, media the device
// cannot decode, and images whose thumbnail could not be generated.
function MediaTypeIcon({
  type,
  color,
}: {
  type: ReturnType<typeof resolveMediaType>;
  color: string;
}) {
  const Icon =
    type === 'audio' ? Music : type === 'video' ? Video : type === 'image' ? ImageIcon : FileText;
  return <Icon size={28} color={color} />;
}

// Metadata panel shown inside the full-screen viewer. It sits over a dark
// backdrop, so it uses fixed light-on-dark colors rather than theme colors.
interface StoragePreviewDetailsProps {
  image: StorageImage;
  onDelete: () => void;
}

function StoragePreviewDetails({ image, onDelete }: StoragePreviewDetailsProps) {
  const rows: Array<{ icon: React.ComponentType<any>; label: string; value: string }> = [
    { icon: File, label: 'File Size', value: formatBytes(image.fileSize) },
    {
      icon: Calendar,
      label: 'Uploaded',
      value: new Date(image.uploadedAt).toLocaleDateString(),
    },
  ];

  if (image.mimeType) {
    rows.push({ icon: ImageIcon, label: 'Type', value: image.mimeType });
  }
  if (image.uploadedBy) {
    rows.push({ icon: ImageIcon, label: 'Uploaded By', value: image.uploadedBy.name });
  }

  return (
    <View>
      {rows.map(row => (
        <View key={row.label} style={styles.previewDetailRow}>
          <View style={styles.detailLeft}>
            <row.icon size={16} color="rgba(255,255,255,0.6)" />
            <Text style={styles.previewDetailLabel}>{row.label}</Text>
          </View>
          <Text style={styles.previewDetailValue} numberOfLines={1}>
            {row.value}
          </Text>
        </View>
      ))}

      <Text style={styles.previewKey} numberOfLines={2}>
        {image.key}
      </Text>

      <TouchableOpacity style={styles.previewDeleteButton} onPress={onDelete}>
        <Trash2 size={18} color="#fff" />
        <Text style={styles.previewDeleteText}>Delete Image</Text>
      </TouchableOpacity>
    </View>
  );
}

// Helper function
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.base,
  },
  consoleCard: {
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  consoleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  consoleHeaderText: {
    flex: 1,
  },
  consoleTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  consoleUrl: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  consoleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  consoleOpenButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  consoleOpenButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  consoleCopyButton: {
    padding: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  filterScroll: {
    flexGrow: 0,
    marginTop: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.full,
  },
  filterChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  filterDivider: {
    width: 1,
    height: 20,
    marginHorizontal: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.base,
  },
  statItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
  },
  progressContainer: {
    gap: spacing.xs,
  },
  progressBar: {
    height: 8,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.base,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
  },
  warningBannerColor: {},
  warningTextColor: {},
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.base,
    marginTop: spacing.sm,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toolbarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  toolbarButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonColor: {},
  deleteButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  deleteButtonTextColor: {},
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sortButtonText: {
    fontSize: typography.fontSize.sm,
  },
  gridContainer: {
    padding: spacing.sm,
  },
  gridRow: {
    justifyContent: 'flex-start',
    gap: GRID_SPACING,
    marginBottom: GRID_SPACING,
  },
  gridItem: {
    width: IMAGE_SIZE,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  gridItemSelected: {
    borderWidth: 2,
  },
  gridImage: {
    width: '100%',
    height: IMAGE_SIZE,
  },
  selectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionBadge: {
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  gridItemFooter: {
    padding: spacing.xs,
  },
  gridItemText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  gridItemSize: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingMoreText: {
    fontSize: typography.fontSize.sm,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  gridIconFallback: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pdfBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: typography.fontWeight.semibold,
  },
  previewDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  previewDetailLabel: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
  },
  previewDetailValue: {
    flexShrink: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: '#fff',
  },
  previewKey: {
    fontSize: typography.fontSize.xs,
    color: 'rgba(255,255,255,0.5)',
    marginTop: spacing.sm,
  },
  previewDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(239, 68, 68, 0.35)',
  },
  previewDeleteText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#fff',
  },
  progressDanger: {},
  progressWarning: {},
  sortMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.base,
  },
  sortMenuContent: {
    width: '80%',
    maxWidth: 300,
    borderRadius: borderRadius.xl,
    padding: spacing.base,
  },
  sortMenuTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.md,
  },
  sortMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  sortMenuItemText: {
    fontSize: typography.fontSize.base,
  },
  sortMenuDivider: {
    height: 1,
    marginVertical: spacing.sm,
  },
});
