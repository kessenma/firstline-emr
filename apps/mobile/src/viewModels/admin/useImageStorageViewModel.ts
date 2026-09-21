// apps/mobile/src/viewModels/admin/useImageStorageViewModel.ts
// ViewModel for Image Storage section - handles image list, storage stats, and delete operations

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Alert, Linking } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { adminApi } from '../../utils/admin/adminApi';
import { getStorageAdminUrl } from '../../config';
import type { StorageImage, StorageStats } from '../../types/admin';
import type {
  StorageCategoryId,
  StorageCategoryGroup,
} from '@fajr/shared/admin';

interface UseImageStorageViewModelResult {
  // Data
  images: StorageImage[];
  stats: StorageStats | null;
  selectedImages: Set<string>;

  // Pagination
  currentPage: number;
  totalPages: number;
  totalCount: number;

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isDeleting: boolean;
  isBulkDeleting: boolean;
  isLoadingMore: boolean;

  // Error state
  error: string | null;

  // Sort options
  sortBy: 'uploadedAt' | 'fileName' | 'fileSize';
  sortOrder: 'asc' | 'desc';

  // Category filtering
  category: StorageCategoryId | null;
  group: StorageCategoryGroup | null;
  categoryStats: Map<
    StorageCategoryId,
    { fileCount: number; totalBytes: number }
  >;
  setCategory: (id: StorageCategoryId | null) => void;
  setGroup: (group: StorageCategoryGroup | null) => void;

  // Object storage admin console (RustFS)
  storageAdminUrl: string;
  isOpeningConsole: boolean;

  // Actions
  fetchImages: () => Promise<void>;
  fetchStats: () => Promise<void>;
  refreshData: () => Promise<void>;
  loadMore: () => Promise<void>;
  deleteImage: (imageId: string, key: string) => Promise<void>;
  bulkDeleteImages: () => Promise<void>;
  toggleImageSelection: (imageId: string) => void;
  selectAllImages: () => void;
  clearSelection: () => void;
  setSortBy: (sortBy: 'uploadedAt' | 'fileName' | 'fileSize') => void;
  toggleSortOrder: () => void;
  clearError: () => void;
  openStorageConsole: () => Promise<void>;
  copyStorageConsoleUrl: () => void;

  // Computed values
  hasImages: boolean;
  hasSelection: boolean;
  selectedCount: number;
  isAllSelected: boolean;
  formattedStorageUsed: string;
  formattedTotalSize: string;
  /** Null when no quota is configured — render counts instead of a bar. */
  storageUsagePercentage: number | null;
}

const ITEMS_PER_PAGE = 20;

export function useImageStorageViewModel(): UseImageStorageViewModelResult {
  // State
  const [images, setImages] = useState<StorageImage[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortByState] = useState<
    'uploadedAt' | 'fileName' | 'fileSize'
  >('uploadedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [category, setCategoryState] = useState<StorageCategoryId | null>(null);
  const [group, setGroupState] = useState<StorageCategoryGroup | null>(null);

  // Fetch storage stats from API
  const fetchStats = useCallback(async () => {
    try {
      const response = await adminApi.getImageStorageStats();
      setStats(response.stats);
    } catch (err) {
      // Don't show error for stats, just log it
      console.warn('Failed to fetch storage stats:', err);
    }
  }, []);

  // Fetch images from API
  const fetchImages = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const response = await adminApi.getImageStorageList({
          page,
          limit: ITEMS_PER_PAGE,
          sortBy,
          order: sortOrder,
          category: category ?? undefined,
          group: category ? undefined : group ?? undefined,
        });

        if (append) {
          setImages(prev => [...prev, ...response.images]);
        } else {
          setImages(response.images);
        }

        setTotalPages(response.totalPages);
        setTotalCount(response.totalCount);
        setCurrentPage(page);

        // Update stats if provided
        if (response.stats) {
          setStats(response.stats);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch images';
        setError(errorMessage);
        console.error('Error fetching images:', err);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [sortBy, sortOrder, category, group],
  );

  // Refresh all data (pull-to-refresh)
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    await Promise.all([fetchImages(1, false), fetchStats()]);
  }, [fetchImages, fetchStats]);

  // Load more images (pagination)
  const loadMore = useCallback(async () => {
    if (currentPage < totalPages && !isLoadingMore) {
      await fetchImages(currentPage + 1, true);
    }
  }, [currentPage, totalPages, isLoadingMore, fetchImages]);

  // Delete single image
  const deleteImage = useCallback(
    async (imageId: string, key: string) => {
      try {
        setIsDeleting(true);

        await adminApi.deleteImage({ imageId, key });

        // Remove image from local state
        setImages(prev => prev.filter(img => img.id !== imageId));
        setTotalCount(prev => prev - 1);

        // Clear selection if deleted image was selected
        setSelectedImages(prev => {
          const newSelection = new Set(prev);
          newSelection.delete(imageId);
          return newSelection;
        });

        // Refresh stats
        await fetchStats();

        Alert.alert('Success', 'Image deleted successfully');
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to delete image';
        console.error('Error deleting image:', err);
        Alert.alert('Error', errorMessage);
      } finally {
        setIsDeleting(false);
      }
    },
    [fetchStats],
  );

  // Bulk delete images
  const bulkDeleteImages = useCallback(async () => {
    if (selectedImages.size === 0) {
      Alert.alert('No Selection', 'Please select images to delete');
      return;
    }

    // Confirm bulk delete
    Alert.alert(
      'Confirm Bulk Delete',
      `Are you sure you want to delete ${selectedImages.size} image(s)? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsBulkDeleting(true);

              // Get keys for selected images
              const selectedImagesList = images.filter(img =>
                selectedImages.has(img.id),
              );
              const imageIds = selectedImagesList.map(img => img.id);
              const keys = selectedImagesList.map(img => img.key);

              await adminApi.bulkDeleteImages({ imageIds, keys });

              // Remove deleted images from local state
              setImages(prev =>
                prev.filter(img => !selectedImages.has(img.id)),
              );
              setTotalCount(prev => prev - selectedImages.size);

              // Clear selection
              setSelectedImages(new Set());

              // Refresh stats
              await fetchStats();

              Alert.alert(
                'Success',
                `Successfully deleted ${imageIds.length} image(s)`,
              );
            } catch (err) {
              const errorMessage =
                err instanceof Error ? err.message : 'Failed to delete images';
              console.error('Error deleting images:', err);
              Alert.alert('Error', errorMessage);
            } finally {
              setIsBulkDeleting(false);
            }
          },
        },
      ],
    );
  }, [selectedImages, images, fetchStats]);

  // Toggle image selection
  const toggleImageSelection = useCallback((imageId: string) => {
    setSelectedImages(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(imageId)) {
        newSelection.delete(imageId);
      } else {
        newSelection.add(imageId);
      }
      return newSelection;
    });
  }, []);

  // Select all images
  const selectAllImages = useCallback(() => {
    const allImageIds = new Set(images.map(img => img.id));
    setSelectedImages(allImageIds);
  }, [images]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedImages(new Set());
  }, []);

  // Set sort by
  const setSortBy = useCallback(
    (newSortBy: 'uploadedAt' | 'fileName' | 'fileSize') => {
      setSortByState(newSortBy);
      setCurrentPage(1);
      // Fetch will be triggered by useEffect
    },
    [],
  );

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    setCurrentPage(1);
    // Fetch will be triggered by useEffect
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Object storage admin console — follows the active server (production or a
  // custom one set in Settings), so it stays correct after a server switch.
  const storageAdminUrl = getStorageAdminUrl();
  const [isOpeningConsole, setIsOpeningConsole] = useState(false);

  // Open the console in the system browser. It must NOT be an in-app WebView:
  // in production the console sits behind oauth2-proxy/Zitadel SSO, which needs
  // the browser's shared cookie jar to sign in.
  const openStorageConsole = useCallback(async () => {
    try {
      setIsOpeningConsole(true);
      const supported = await Linking.canOpenURL(storageAdminUrl);
      if (!supported) {
        throw new Error('Cannot open storage console URL');
      }
      await Linking.openURL(storageAdminUrl);
    } catch (err) {
      console.error('Error opening storage console:', err);
      Alert.alert(
        'Error',
        'Failed to open the storage console. You can copy the URL and open it manually.',
      );
    } finally {
      setIsOpeningConsole(false);
    }
  }, [storageAdminUrl]);

  const copyStorageConsoleUrl = useCallback(() => {
    try {
      Clipboard.setString(storageAdminUrl);
      Alert.alert('Copied', 'Storage console URL copied to clipboard');
    } catch (err) {
      console.error('Error copying storage console URL:', err);
      Alert.alert('Error', 'Failed to copy URL to clipboard');
    }
  }, [storageAdminUrl]);

  // Computed: Has images
  const hasImages = images.length > 0;

  // Computed: Has selection
  const hasSelection = selectedImages.size > 0;

  // Computed: Selected count
  const selectedCount = selectedImages.size;

  // Computed: Is all selected
  const isAllSelected = hasImages && selectedImages.size === images.length;

  // Computed: Formatted storage used
  const formattedStorageUsed = stats ? formatBytes(stats.usedSpace) : '0 B';

  // Computed: Formatted quota (the configured budget, not disk capacity)
  const formattedTotalSize = stats ? formatBytes(stats.totalSize) : '0 B';

  // Computed: usage against the configured quota. Null when no quota is set —
  // S3 cannot report disk capacity, so without OBJECT_STORAGE_QUOTA_BYTES there
  // is no honest denominator and the UI shows counts instead of a percentage.
  const storageUsagePercentage =
    stats?.hasQuota && stats.totalSize > 0
      ? Math.min(100, Math.round((stats.usedSpace / stats.totalSize) * 100))
      : null;

  // Per-category counts for the filter chips.
  const categoryStats = useMemo(() => {
    const map = new Map<
      StorageCategoryId,
      { fileCount: number; totalBytes: number }
    >();
    for (const c of stats?.categories ?? []) {
      map.set(c.id, { fileCount: c.fileCount, totalBytes: c.totalBytes });
    }
    return map;
  }, [stats]);

  // Selecting a category clears any group selection and vice versa — they are
  // alternate ways of narrowing the same list, not stackable filters.
  const setCategory = useCallback((id: StorageCategoryId | null) => {
    setCategoryState(id);
    setGroupState(null);
    setSelectedImages(new Set());
  }, []);

  const setGroup = useCallback((g: StorageCategoryGroup | null) => {
    setGroupState(g);
    setCategoryState(null);
    setSelectedImages(new Set());
  }, []);

  // Initial fetch on mount, and again whenever sort or category changes.
  // fetchImages already closes over sort/category, so it is the only dep needed.
  useEffect(() => {
    fetchImages(1, false);
    fetchStats();
  }, [fetchImages, fetchStats]);

  return {
    // Data
    images,
    stats,
    selectedImages,

    // Pagination
    currentPage,
    totalPages,
    totalCount,

    // Loading states
    isLoading,
    isRefreshing,
    isDeleting,
    isBulkDeleting,
    isLoadingMore,

    // Error state
    error,

    // Sort options
    sortBy,
    sortOrder,

    // Category filtering
    category,
    group,
    categoryStats,
    setCategory,
    setGroup,

    // Object storage admin console (RustFS)
    storageAdminUrl,
    isOpeningConsole,

    // Actions
    fetchImages: () => fetchImages(1, false),
    fetchStats,
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
    openStorageConsole,
    copyStorageConsoleUrl,

    // Computed values
    hasImages,
    hasSelection,
    selectedCount,
    isAllSelected,
    formattedStorageUsed,
    formattedTotalSize,
    storageUsagePercentage,
  };
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
