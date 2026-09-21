// apps/mobile/src/components/ui/FullScreenMediaViewer.tsx
// Full-screen media viewer: swipe between items, pinch/double-tap to zoom,
// inline video, audio and PDF playback, and an optional details panel.
//
// Gestures use react-native-gesture-handler + react-native-reanimated. Zooming
// and horizontal paging both want the same drag, so paging is enabled only at
// scale 1 — once an image is zoomed the pan gesture owns the touch.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Modal,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  StatusBar,
  Dimensions,
  Linking,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Share,
} from 'react-native';
import {
  X,
  Share2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Music,
  FileQuestion,
  AlertTriangle,
  Info,
  ExternalLink,
  RefreshCw,
} from 'lucide-react-native';
import Pdf from 'react-native-pdf';
import Video from 'react-native-video';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  withTiming,
} from 'react-native-reanimated';
import { getFileExtension, type MediaItem } from '@fajr/shared/media';
import { spacing, typography, borderRadius } from '../../utils/theme';
import {
  isDataUri,
  isDisplayableOnDevice,
  resolveItemMediaType,
} from '../../utils/mediaDisplayability';

/**
 * A media item plus the optional metadata the viewer can act on: `fileName` and
 * `mimeType` sharpen type detection, `originalUrl` is a shareable https URL for
 * items whose `uri` is a cached base64 data URI.
 */
export interface ViewerMediaItem extends MediaItem {
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  originalUrl?: string;
}

interface FullScreenMediaViewerProps {
  visible: boolean;
  items: ViewerMediaItem[];
  initialIndex?: number;
  onClose: () => void;
  /** Overrides the built-in share sheet. */
  onShare?: (item: ViewerMediaItem) => void;
  /** Collapsible details panel rendered over the bottom of the media. */
  renderFooter?: (item: ViewerMediaItem, index: number) => React.ReactNode;
  /** Fires as the user pages, for callers that resolve URLs on demand. */
  onIndexChange?: (index: number) => void;
  /**
   * Called when the user retries a failed item — signed URLs expire after an
   * hour. Return a fresh URI, or null to simply re-attempt the current one.
   */
  onRequestRefresh?: (
    item: ViewerMediaItem,
    index: number,
  ) => Promise<string | null>;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MEDIA_HEIGHT = SCREEN_HEIGHT * 0.75;

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

function clampWorklet(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

async function openExternally(uri: string): Promise<void> {
  try {
    if (await Linking.canOpenURL(uri)) {
      await Linking.openURL(uri);
    }
  } catch (err) {
    console.warn('[FullScreenMediaViewer] cannot open URL:', err);
  }
}

export const FullScreenMediaViewer: React.FC<FullScreenMediaViewerProps> = ({
  visible,
  items,
  initialIndex = 0,
  onClose,
  onShare,
  renderFooter,
  onIndexChange,
  onRequestRefresh,
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [footerOpen, setFooterOpen] = useState(true);

  // Reopening at a different item must not keep the previous position.
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
    }
  }, [visible, initialIndex]);

  // onViewableItemsChanged must keep a stable identity for FlatList's lifetime,
  // so the latest callback is read through a ref.
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const nextIndex = viewableItems[0].index;
        setCurrentIndex(nextIndex);
        onIndexChangeRef.current?.(nextIndex);
      }
    },
    [],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  }, [currentIndex, items.length]);

  const handleShare = useCallback(
    async (item: ViewerMediaItem) => {
      if (onShare) {
        onShare(item);
        return;
      }
      const url = isDataUri(item.uri) ? item.originalUrl : item.uri;
      if (!url) return;
      try {
        await Share.share({ url, message: item.fileName ?? url });
      } catch (err) {
        console.warn('[FullScreenMediaViewer] share failed:', err);
      }
    },
    [onShare],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ViewerMediaItem; index: number }) => (
      <MediaPage
        item={item}
        index={index}
        isActive={index === currentIndex}
        onZoomChange={setIsZoomed}
        onRequestRefresh={onRequestRefresh}
        onShare={handleShare}
      />
    ),
    [currentIndex, onRequestRefresh, handleShare],
  );

  const keyExtractor = useCallback((item: ViewerMediaItem) => item.id, []);

  const currentItem = items[currentIndex];
  const canShare = currentItem
    ? Boolean(isDataUri(currentItem.uri) ? currentItem.originalUrl : currentItem.uri)
    : false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.95)" />
      {/* The modal is its own native subtree, outside the app's root handler. */}
      <GestureHandlerRootView style={styles.root}>
        <ViewerErrorBoundary onClose={onClose}>
          <View style={styles.container}>
            <FlatList
              ref={flatListRef}
              data={items}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              horizontal
              pagingEnabled
              scrollEnabled={!isZoomed}
              showsHorizontalScrollIndicator={false}
              initialScrollIndex={initialIndex}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={(_data, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
            />

            {/* Top bar */}
            <SafeAreaView style={styles.topBar}>
              <TouchableOpacity onPress={onClose} style={styles.iconButton} hitSlop={12}>
                <X size={24} color="#fff" />
              </TouchableOpacity>

              <View style={styles.topBarCenter}>
                {items.length > 1 && (
                  <Text style={styles.counter}>
                    {currentIndex + 1} / {items.length}
                  </Text>
                )}
                {currentItem?.fileName && (
                  <Text style={styles.fileName} numberOfLines={1}>
                    {currentItem.fileName}
                  </Text>
                )}
              </View>

              {currentItem && canShare ? (
                <TouchableOpacity
                  onPress={() => handleShare(currentItem)}
                  style={styles.iconButton}
                  hitSlop={12}
                >
                  <Share2 size={22} color="#fff" />
                </TouchableOpacity>
              ) : (
                <View style={styles.iconButton} />
              )}
            </SafeAreaView>

            {/* Navigation arrows (only if multiple items) */}
            {items.length > 1 && !isZoomed && (
              <>
                {currentIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.navButtonLeft]}
                    onPress={goToPrev}
                    hitSlop={12}
                  >
                    <ChevronLeft size={28} color="#fff" />
                  </TouchableOpacity>
                )}
                {currentIndex < items.length - 1 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.navButtonRight]}
                    onPress={goToNext}
                    hitSlop={12}
                  >
                    <ChevronRight size={28} color="#fff" />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Details panel */}
            {renderFooter && currentItem && (
              footerOpen ? (
                <View style={styles.footerPanel}>
                  <TouchableOpacity
                    style={styles.footerCollapse}
                    onPress={() => setFooterOpen(false)}
                    hitSlop={8}
                  >
                    <ChevronDown size={18} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                  <ScrollView
                    style={styles.footerScroll}
                    contentContainerStyle={styles.footerContent}
                  >
                    {renderFooter(currentItem, currentIndex)}
                  </ScrollView>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.footerPill}
                  onPress={() => setFooterOpen(true)}
                >
                  <Info size={16} color="#fff" />
                  <Text style={styles.footerPillText}>Details</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </ViewerErrorBoundary>
      </GestureHandlerRootView>
    </Modal>
  );
};

// ── One page of the pager ──

interface MediaPageProps {
  item: ViewerMediaItem;
  index: number;
  isActive: boolean;
  onZoomChange: (zoomed: boolean) => void;
  onRequestRefresh?: (
    item: ViewerMediaItem,
    index: number,
  ) => Promise<string | null>;
  onShare: (item: ViewerMediaItem) => void;
}

const MediaPage: React.FC<MediaPageProps> = ({
  item,
  index,
  isActive,
  onZoomChange,
  onRequestRefresh,
  onShare,
}) => {
  const [failed, setFailed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [overrideUri, setOverrideUri] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const uri = overrideUri ?? item.uri;

  // A new URL for this slot is a new attempt — one bad item must not poison
  // the rest of the gallery.
  useEffect(() => {
    setFailed(false);
    setOverrideUri(null);
  }, [item.uri]);

  const type = useMemo(
    () =>
      resolveItemMediaType({
        type: item.type,
        mimeType: item.mimeType,
        uri,
        fileName: item.fileName,
      }),
    [item.type, item.mimeType, item.fileName, uri],
  );

  const nameForFormat = item.fileName ?? item.originalUrl ?? uri;
  const displayable = isDisplayableOnDevice(type, nameForFormat);
  const externalUri = isDataUri(uri) ? item.originalUrl ?? null : uri;

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      if (onRequestRefresh) {
        const fresh = await onRequestRefresh(item, index);
        if (fresh) setOverrideUri(fresh);
      }
      setFailed(false);
      setRetryToken(token => token + 1);
    } catch (err) {
      console.warn('[FullScreenMediaViewer] refresh failed:', err);
    } finally {
      setIsRetrying(false);
    }
  }, [onRequestRefresh, item, index]);

  const handleFailure = useCallback(() => setFailed(true), []);

  const body = () => {
    if (!uri || failed) {
      return (
        <FallbackPanel
          reason="failed"
          item={item}
          externalUri={externalUri}
          isRetrying={isRetrying}
          onRetry={handleRetry}
          onShare={onShare}
        />
      );
    }

    if (!displayable || type === 'file') {
      return (
        <FallbackPanel
          reason="unsupported"
          item={item}
          externalUri={externalUri}
          nameForFormat={nameForFormat}
          onShare={onShare}
        />
      );
    }

    switch (type) {
      case 'pdf':
        return (
          <Pdf
            key={retryToken}
            source={{ uri }}
            style={styles.pdfViewer}
            trustAllCerts={false}
            onError={handleFailure}
          />
        );
      case 'video':
        return (
          <Video
            key={retryToken}
            source={{ uri }}
            style={styles.videoPlayer}
            controls
            paused={!isActive}
            resizeMode="contain"
            onError={handleFailure}
          />
        );
      case 'audio':
        return (
          <View style={styles.audioContainer}>
            <View style={styles.playCircle}>
              <Music size={32} color="#fff" />
            </View>
            <Text style={styles.audioName} numberOfLines={2}>
              {item.fileName ?? 'Audio'}
            </Text>
            <Video
              key={retryToken}
              source={{ uri }}
              style={styles.audioPlayer}
              controls
              paused={!isActive}
              onError={handleFailure}
            />
          </View>
        );
      default:
        return (
          <ZoomableImage
            key={retryToken}
            uri={uri}
            isActive={isActive}
            onZoomChange={onZoomChange}
            onError={handleFailure}
          />
        );
    }
  };

  return (
    <View style={styles.page}>
      {body()}
      {item.caption && (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>{item.caption}</Text>
        </View>
      )}
    </View>
  );
};

// ── Fallback states ──

interface FallbackPanelProps {
  reason: 'failed' | 'unsupported';
  item: ViewerMediaItem;
  externalUri: string | null;
  nameForFormat?: string;
  isRetrying?: boolean;
  onRetry?: () => void;
  onShare: (item: ViewerMediaItem) => void;
}

const FallbackPanel: React.FC<FallbackPanelProps> = ({
  reason,
  item,
  externalUri,
  nameForFormat,
  isRetrying,
  onRetry,
  onShare,
}) => {
  const ext = nameForFormat ? getFileExtension(nameForFormat).toUpperCase() : '';

  return (
    <View style={styles.fallbackContainer}>
      {reason === 'failed' ? (
        <AlertTriangle size={40} color="rgba(255,255,255,0.8)" />
      ) : (
        <FileQuestion size={40} color="rgba(255,255,255,0.8)" />
      )}

      <Text style={styles.fallbackTitle} numberOfLines={2}>
        {item.fileName ?? (reason === 'failed' ? 'Could not load' : 'No preview')}
      </Text>

      <Text style={styles.fallbackBody}>
        {reason === 'failed'
          ? "This file couldn't be loaded. Its link may have expired — trying again usually fixes that."
          : `${ext ? `${ext} files` : 'These files'} can't be previewed on this device. Open it in another app instead.`}
      </Text>

      <View style={styles.fallbackActions}>
        {reason === 'failed' && onRetry && (
          <TouchableOpacity
            style={styles.fallbackButton}
            onPress={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <RefreshCw size={16} color="#fff" />
            )}
            <Text style={styles.fallbackButtonText}>Try again</Text>
          </TouchableOpacity>
        )}

        {externalUri && (
          <>
            <TouchableOpacity
              style={styles.fallbackButton}
              onPress={() => openExternally(externalUri)}
            >
              <ExternalLink size={16} color="#fff" />
              <Text style={styles.fallbackButtonText}>Open</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fallbackButton}
              onPress={() => onShare(item)}
            >
              <Share2 size={16} color="#fff" />
              <Text style={styles.fallbackButtonText}>Share</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

// ── Zoomable image ──

interface ZoomableImageProps {
  uri: string;
  isActive: boolean;
  onZoomChange: (zoomed: boolean) => void;
  onError: () => void;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({
  uri,
  isActive,
  onZoomChange,
  onError,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [zoomed, setZoomed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const handleZoomChange = useCallback(
    (next: boolean) => {
      setZoomed(next);
      onZoomChange(next);
    },
    [onZoomChange],
  );

  // Paging and panning compete for the same drag, so the parent needs to know
  // the moment we leave scale 1.
  useAnimatedReaction(
    () => scale.value > 1.01,
    (next, previous) => {
      if (previous !== null && next !== previous) {
        runOnJS(handleZoomChange)(next);
      }
    },
    [handleZoomChange],
  );

  // Swiping away from a zoomed image should not leave it zoomed on return.
  useEffect(() => {
    if (!isActive) {
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [isActive, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const gesture = useMemo(() => {
    const resetZoom = () => {
      'worklet';
      scale.value = withTiming(1);
      savedScale.value = 1;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    };

    const pinch = Gesture.Pinch()
      .onUpdate(event => {
        scale.value = clampWorklet(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
      })
      .onEnd(() => {
        if (scale.value <= MIN_SCALE) {
          resetZoom();
          return;
        }
        savedScale.value = scale.value;
        const maxX = ((scale.value - 1) * SCREEN_WIDTH) / 2;
        const maxY = ((scale.value - 1) * MEDIA_HEIGHT) / 2;
        const nextX = clampWorklet(translateX.value, -maxX, maxX);
        const nextY = clampWorklet(translateY.value, -maxY, maxY);
        translateX.value = withTiming(nextX);
        translateY.value = withTiming(nextY);
        savedTranslateX.value = nextX;
        savedTranslateY.value = nextY;
      });

    const pan = Gesture.Pan()
      .enabled(zoomed)
      .onUpdate(event => {
        const maxX = ((scale.value - 1) * SCREEN_WIDTH) / 2;
        const maxY = ((scale.value - 1) * MEDIA_HEIGHT) / 2;
        translateX.value = clampWorklet(
          savedTranslateX.value + event.translationX,
          -maxX,
          maxX,
        );
        translateY.value = clampWorklet(
          savedTranslateY.value + event.translationY,
          -maxY,
          maxY,
        );
      })
      .onEnd(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(event => {
        if (scale.value > 1.01) {
          resetZoom();
          return;
        }
        // Zoom toward the tapped point rather than the image centre.
        const focalX = event.x - SCREEN_WIDTH / 2;
        const focalY = event.y - MEDIA_HEIGHT / 2;
        const maxX = ((DOUBLE_TAP_SCALE - 1) * SCREEN_WIDTH) / 2;
        const maxY = ((DOUBLE_TAP_SCALE - 1) * MEDIA_HEIGHT) / 2;
        const nextX = clampWorklet(-focalX * (DOUBLE_TAP_SCALE - 1), -maxX, maxX);
        const nextY = clampWorklet(-focalY * (DOUBLE_TAP_SCALE - 1), -maxY, maxY);

        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        translateX.value = withTiming(nextX);
        translateY.value = withTiming(nextY);
        savedTranslateX.value = nextX;
        savedTranslateY.value = nextY;
      });

    return Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));
  }, [zoomed, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.zoomContainer}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.zoomContainer, animatedStyle]}>
          <Image
            source={{ uri }}
            style={styles.mediaImage}
            resizeMode="contain"
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              onError();
            }}
          />
        </Animated.View>
      </GestureDetector>
      {isLoading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
};

// ── Error boundary ──

interface ErrorBoundaryProps {
  onClose: () => void;
  children: React.ReactNode;
}

class ViewerErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[FullScreenMediaViewer] render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={[styles.container, styles.fallbackContainer]}>
          <AlertTriangle size={40} color="rgba(255,255,255,0.8)" />
          <Text style={styles.fallbackTitle}>Something went wrong</Text>
          <Text style={styles.fallbackBody}>This item could not be displayed.</Text>
          <TouchableOpacity style={styles.fallbackButton} onPress={this.props.onClose}>
            <Text style={styles.fallbackButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  fileName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  page: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomContainer: {
    width: SCREEN_WIDTH,
    height: MEDIA_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaImage: {
    width: SCREEN_WIDTH,
    height: MEDIA_HEIGHT,
  },
  pdfViewer: {
    flex: 1,
    width: SCREEN_WIDTH,
    backgroundColor: 'transparent',
  },
  videoPlayer: {
    width: SCREEN_WIDTH,
    height: MEDIA_HEIGHT,
  },
  audioContainer: {
    width: SCREEN_WIDTH,
    height: MEDIA_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  audioName: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  audioPlayer: {
    width: SCREEN_WIDTH - spacing.xl * 2,
    height: 60,
    marginTop: spacing.lg,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContainer: {
    width: SCREEN_WIDTH,
    height: MEDIA_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  fallbackBody: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  fallbackActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  fallbackButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    padding: spacing.sm,
  },
  captionText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    textAlign: 'center',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -22,
  },
  navButtonLeft: {
    left: spacing.sm,
  },
  navButtonRight: {
    right: spacing.sm,
  },
  footerPanel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '35%',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingBottom: spacing.xl,
  },
  footerCollapse: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  footerScroll: {
    flexGrow: 0,
  },
  footerContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  footerPill: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  footerPillText: {
    color: '#fff',
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
});

export default FullScreenMediaViewer;
