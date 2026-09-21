// apps/mobile/src/components/BottomSheet.tsx
// Reusable bottom sheet/drawer component powered by @gorhom/bottom-sheet

import React, { useRef, useEffect, useMemo, useCallback, useContext, useState, useImperativeHandle, forwardRef, useId } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  Keyboard,
  Platform,
} from 'react-native';
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetFlatList,
  BottomSheetTextInput,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { X, Lock, LockOpen, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../contexts/ThemeContext';
import { useTabBarVisibility } from '../contexts/TabBarVisibilityContext';
import { useBottomSheetManager } from '../contexts/BottomSheetManagerContext';
import { spacing, borderRadius, typography } from '../utils/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// Context so child form components auto-detect they're inside a bottom sheet
// and switch from TextInput → BottomSheetTextInput for proper gesture handling.
const InsideBottomSheetContext = React.createContext(false);
export const useInsideBottomSheet = () => useContext(InsideBottomSheetContext);

// Self-contained keyboard height hook for rawContent consumers that manage their own
// scroll views. Tracks keyboard height independently — no state inside BottomSheet
// itself, so opening the keyboard won't cause the sheet to re-render / minimize.
export function useBottomSheetKeyboard(): number {
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKbHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKbHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);
  return kbHeight;
}

/** Place at the bottom of a BottomSheetScrollView inside a rawContent sheet
 *  to add scroll space equal to the keyboard height. Returns null when closed. */
export function BottomSheetKeyboardSpacer(): React.ReactElement | null {
  const kbHeight = useBottomSheetKeyboard();
  if (kbHeight <= 0) return null;
  return <View style={{ height: kbHeight }} />;
}

// Tab bar: paddingTop(6) + button(44) + paddingBottom(max(bottom,12))
const TAB_BAR_CHROME = 50;
// Height of the minimized pill visible above the tab bar
const MINI_BAR_HEIGHT = 56;

export interface BottomSheetHandle {
  /** Snap to a specific index: 0=minimized, 1=normal, 2=full-screen */
  snapToIndex: (index: number) => void;
  /**
   * Re-present a sheet that was swiped away while `visible` is still true.
   *
   * The present/dismiss effect below only fires when `visible` changes, so a
   * swipe-dismissed sheet whose owner still considers it open cannot be
   * recovered with snapToIndex alone — snapping a dismissed modal does nothing.
   */
  present: () => void;
}

interface BottomSheetProps {
  /**
   * Drives present/dismiss.
   *
   * KEEP THIS COMPONENT MOUNTED AND TOGGLE THIS PROP. Do not do:
   *
   *     if (!visible) return null;          // ← breaks the sheet, silently
   *     return <BottomSheet visible={visible} …>
   *
   * That makes BottomSheet mount with `visible` already true, so present() is
   * issued in the same commit as the underlying BottomSheetModal's own mount
   * and races its registration with BottomSheetModalProvider. present() then
   * no-ops, onChange never fires, and the sheet simply never appears — with a
   * perfectly valid ref and no error anywhere. It costs nothing to stay
   * mounted: nothing renders until the sheet is presented.
   *
   * Symptom to recognise: the "📋 [BottomSheet] onChange" log below never
   * appears even though the caller demonstrably invoked present().
   *
   * NOTE: that same symptom has a second, unrelated cause — see the
   * `enableDynamicSizing={false}` comment on BottomSheetModal below. Rule that
   * one out first; it is the more common of the two.
   */
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoint?: number; // Height as percentage of screen (0-100)
  showHandle?: boolean;
  showCloseButton?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** When true, children render directly without BottomSheetScrollView wrapper.
   *  Use this when children contain their own BottomSheetFlatList or similar. */
  rawContent?: boolean;
  /** When true, the sheet opens directly in full-screen mode (index 2).
   *  Swipe-to-close is disabled in full-screen; user must tap the X button. */
  startExpanded?: boolean;
  /** Optional ReactNode rendered next to the title in the header. */
  titleAccessory?: React.ReactNode;
  /** Fires whenever the sheet settles on a snap point: 0 = minimized pill,
   *  1 = normal, 2 = full-screen. Children otherwise have no way to know they
   *  are minimized — the video call uses this to tear down the full-size
   *  video surface and render only the header thumbnail. */
  onIndexChange?: (index: number) => void;
}

export const BottomSheet = forwardRef<BottomSheetHandle, BottomSheetProps>(({
  visible,
  onClose,
  title,
  children,
  snapPoint = 60,
  showHandle = true,
  showCloseButton = true,
  containerStyle,
  contentContainerStyle,
  rawContent = false,
  startExpanded = false,
  titleAccessory,
  onIndexChange,
}, ref) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { hideTabBar, showTabBar } = useTabBarVisibility();
  const { registerSheet, unregisterSheet } = useBottomSheetManager();
  const sheetId = useId();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  // Expose snapToIndex to parent via ref
  useImperativeHandle(ref, () => ({
    snapToIndex: (index: number) => {
      bottomSheetRef.current?.snapToIndex(index);
    },
    present: () => {
      isDismissing.current = false;
      hasPresented.current = true;
      bottomSheetRef.current?.present();
    },
  }), []);
  const didHideTabBar = useRef(false);
  const hasPresented = useRef(false);
  const isMounted = useRef(true);
  const isDismissing = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locked, setLocked] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(startExpanded ? 2 : -1);
  // Effective lock: only user-controlled lock toggle.
  // Keyboard-driven locking was removed — it caused prop churn during keyboard
  // animations that made the library reconfigure gesture handlers mid-animation,
  // which stole input focus and dismissed the keyboard.
  // At index >= 2 (expanded), isExpanded already disables all swipe gestures.
  const effectiveLocked = locked;

  // Cleanup on unmount: restore tab bar, cancel pending timers
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      }
      if (didHideTabBar.current) {
        showTabBar();
        didHideTabBar.current = false;
      }
    };
  }, [showTabBar]);

  // Register/unregister with BottomSheetManager for global dismiss
  useEffect(() => {
    if (visible) {
      registerSheet(sheetId, onClose);
    } else {
      unregisterSheet(sheetId);
    }
    return () => unregisterSheet(sheetId);
  }, [visible, sheetId, registerSheet, unregisterSheet, onClose]);

  const tabBarHeight = TAB_BAR_CHROME + Math.max(insets.bottom, 12);
  const miniSnapPoint = tabBarHeight + MINI_BAR_HEIGHT;

  // Three snap points: minimized pill, normal, full-screen.
  // Scroll conflicts are avoided by setting enableContentPanningGesture={false}
  // on the modal, so only the handle (and buttons) can move between snap points.
  const snapPoints = useMemo(
    () => [miniSnapPoint, `${snapPoint}%`, '100%'],
    [miniSnapPoint, snapPoint],
  );

  const isMinimized = currentIndex === 0;
  // >= 2 covers both full-screen (index 2) and the dynamic keyboard-extension
  // snap point (index 3) that @gorhom/bottom-sheet creates when keyboardBehavior="extend".
  // Without this, index 3 would flip isExpanded to false mid-animation, causing
  // gesture handler reconfiguration that steals input focus.
  const isExpanded = currentIndex >= 2;

  // --- Button animations ---
  const lockScale = useSharedValue(1);
  const closeScale = useSharedValue(1);
  const expandScale = useSharedValue(1);

  const lockAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lockScale.value }],
  }));
  const closeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: closeScale.value }],
  }));
  const expandAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: expandScale.value }],
  }));

  // --- Minimize / restore transition animations ---
  // Driven by the sheet's continuous animated index (0=mini, 1=normal, 2=full)
  const animatedIdx = useSharedValue(1);

  // Header padding compresses when minimized for a compact pill
  const headerTransition = useAnimatedStyle(() => ({
    paddingVertical: interpolate(animatedIdx.value, [0, 1], [2, spacing.md], Extrapolation.CLAMP),
  }));

  // Left icons (lock + expand) fade out, slide left, and collapse layout width
  const leftIconsTransition = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIdx.value, [0, 0.7, 1], [0, 0, 1], Extrapolation.CLAMP),
    transform: [
      { translateX: interpolate(animatedIdx.value, [0, 1], [-48, 0], Extrapolation.CLAMP) },
    ],
    // Collapse actual layout width so the title reclaims the space
    maxWidth: interpolate(animatedIdx.value, [0, 0.5, 1], [0, 0, 200], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }));

  // Expand button fades and collapses when expanding to full-screen (index 1→2)
  const expandButtonLayoutTransition = useAnimatedStyle(() => ({
    opacity: interpolate(animatedIdx.value, [1, 1.5, 2], [1, 0, 0], Extrapolation.CLAMP),
    maxWidth: interpolate(animatedIdx.value, [1, 1.5, 2], [50, 0, 0], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }));

  // Title scales down when minimized (layout slide is handled by the icons collapsing)
  const titleTransition = useAnimatedStyle(() => {
    const s = interpolate(animatedIdx.value, [0, 1], [0.80, 1], Extrapolation.CLAMP);
    return { transform: [{ scale: s }] };
  });


  // Drive present/dismiss from the visible prop.
  // Guard: never call dismiss() on a modal that was never presented — doing so
  // can corrupt the BottomSheetModalProvider's internal stack when multiple
  // BottomSheetModals are mounted simultaneously with visible=false.
  //
  // This effect assumes it runs at least once with visible=false before ever
  // running with visible=true — i.e. that the caller keeps BottomSheet mounted
  // and toggles the prop. If a caller instead mounts it already-visible, the
  // present() below fires in the same commit as BottomSheetModal's own mount
  // and is dropped on the floor. See the `visible` prop docs above.
  useEffect(() => {
    if (visible) {
      isDismissing.current = false;
      hasPresented.current = true;
      bottomSheetRef.current?.present();
    } else if (hasPresented.current) {
      // Only dismiss if:
      // 1. We haven't already initiated a dismiss (via button click)
      // 2. We aren't already dismissed (via swipe - currentIndex would be -1)
      if (!isDismissing.current && currentIndex !== -1) {
        isDismissing.current = true;
        bottomSheetRef.current?.dismiss();
      }
    }
  }, [visible]);

  const handleSheetChange = useCallback((index: number) => {
    if (!isMounted.current) return;
    console.log(`📋 [BottomSheet] onChange idx=${index} (title="${title}", locked=${locked})`);
    setCurrentIndex(index);
    onIndexChange?.(index);
    // Hide tab bar when expanded to full-screen, restore when leaving
    if (index === 2) {
      hideTabBar();
      didHideTabBar.current = true;
    } else if (didHideTabBar.current) {
      showTabBar();
      didHideTabBar.current = false;
    }
  }, [hideTabBar, showTabBar, onIndexChange]);

  const handleDismiss = useCallback(() => {
    console.log(`📋 [BottomSheet] onDismiss fired (title="${title}")`);
    // Cancel safety timer — dismiss completed naturally
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (!isMounted.current) return;
    setLocked(false);
    setCurrentIndex(-1);
    if (didHideTabBar.current) {
      showTabBar();
      didHideTabBar.current = false;
    }
    onClose();
  }, [onClose, showTabBar]);

  // --- Header button handlers ---
  const handleLockToggle = useCallback(() => {
    lockScale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    setLocked((prev) => !prev);
  }, [lockScale]);

  const handleClose = useCallback(() => {
    // Animate button press
    closeScale.value = withSequence(
      withTiming(0.85, { duration: 60 }),
      withTiming(1, { duration: 60 }),
    );

    setLocked(false);

    if (isDismissing.current) return;
    isDismissing.current = true;
    bottomSheetRef.current?.dismiss();

    // Safety fallback: if dismiss() fails silently (e.g. BottomSheetModalProvider
    // stack corruption when sibling modals are mounted), onDismiss never fires and
    // the sheet gets stuck. Call onClose() directly after the animation window so
    // the parent can unmount or hide the sheet regardless.
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      if (isMounted.current) {
        onClose();
      }
    }, 400);
  }, [closeScale, onClose]);

  const handleMinimize = useCallback(() => {
    setLocked(false);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleRestore = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(1);
  }, []);

  const handleExpand = useCallback(() => {
    expandScale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    setLocked(false);
    bottomSheetRef.current?.snapToIndex(2);
  }, [expandScale]);

  const handleCollapse = useCallback(() => {
    expandScale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );
    bottomSheetRef.current?.snapToIndex(1);
  }, [expandScale]);

  // Backdrop: visible when expanded, gone when minimized (so app is interactive).
  // When locked, ignore backdrop taps so the sheet stays put.
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={0}
        appearsOnIndex={1}
        opacity={0.5}
        pressBehavior={effectiveLocked ? 'none' : 'close'}
      />
    ),
    [effectiveLocked],
  );

  const renderHandle = useCallback(
    () => (
      <View style={styles.handleContainer}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
      </View>
    ),
    [colors.border],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={startExpanded ? 2 : 1}
      snapPoints={snapPoints}
      // MUST be false. @gorhom/bottom-sheet v5 defaults this to TRUE, which
      // makes the sheet measure its children to derive a content-height snap
      // point. This component always supplies explicit snapPoints, so that
      // measurement is never wanted — and it is actively harmful: a sheet
      // whose first child is not a measurable host view (a Context.Provider,
      // or a `flex: 1` View with no intrinsic height) measures 0, leaving no
      // valid layout to present into. present() then returns having done
      // nothing, onChange never fires, and there is no error anywhere.
      //
      // That is exactly how VideoCallSheet failed while NoteCreationSheet
      // worked: the latter's first child is a real View with content, the
      // former's is <VideoCallSessionBridge> (a context provider) wrapping a
      // flex child.
      enableDynamicSizing={false}
      animatedIndex={animatedIdx}
      onChange={handleSheetChange}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleComponent={showHandle && !isExpanded ? renderHandle : null}
      topInset={insets.top + 10}
      enablePanDownToClose={!effectiveLocked && !isExpanded}
      enableHandlePanningGesture={!effectiveLocked && !isExpanded}
      // When not expanded, allow content dragging to move the sheet if scrolling is at the edge.
      // This is standard behavior and helps when content is small or user wants to peek/expand.
      // When expanded or keyboard is open, disable to prevent accidental dismissals.
      enableContentPanningGesture={!effectiveLocked && !isExpanded}
      enableOverDrag={!isExpanded}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={[
        styles.sheetBackground,
        { backgroundColor: colors.surface },
        containerStyle,
      ]}
      style={styles.sheetShadow}
    >
      <InsideBottomSheetContext.Provider value={true}>
      {/* Unified animated header — smoothly transitions between normal and minimized */}
      {(title || showCloseButton) && (
          <Animated.View style={[styles.header, { borderBottomColor: colors.divider }, headerTransition]}>
            {/* Left icons (lock + expand) — slide off-screen when minimized */}
            <Animated.View
              style={[styles.leftIconsRow, leftIconsTransition]}
              pointerEvents={isMinimized ? 'none' : 'auto'}
            >
              {/* Lock button — always visible except when minimized */}
              <AnimatedTouchable
                style={[styles.lockButton, lockAnimStyle]}
                onPress={handleLockToggle}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {locked ? (
                  <Lock size={18} color={colors.primary} strokeWidth={2} />
                ) : (
                  <LockOpen size={18} color={colors.textTertiary} strokeWidth={2} />
                )}
              </AnimatedTouchable>

              {/* Expand / Collapse toggle — hides when expanded */}
              <Animated.View
                style={expandButtonLayoutTransition}
                pointerEvents={isExpanded ? 'none' : 'auto'}
              >
                <AnimatedTouchable
                  style={[styles.expandButton, expandAnimStyle]}
                  onPress={isExpanded ? handleCollapse : handleExpand}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {isExpanded ? (
                    <Minimize2 size={18} color={colors.primary} strokeWidth={2} />
                  ) : (
                    <Maximize2 size={18} color={colors.textTertiary} strokeWidth={2} />
                  )}
                </AnimatedTouchable>
              </Animated.View>
            </Animated.View>

            {/* Title — scales down and slides left when minimized, tappable to restore */}
            <TouchableOpacity
              style={styles.titleWrapper}
              onPress={isMinimized ? handleRestore : undefined}
              activeOpacity={isMinimized ? 0.7 : 1}
              disabled={!isMinimized}
            >
              <Animated.Text
                style={[styles.title, { color: colors.text }, titleTransition]}
                numberOfLines={1}
              >
                {title || 'Sheet'}
              </Animated.Text>
              {titleAccessory}
            </TouchableOpacity>

            {/* Chevron — swaps between restore (up) and minimize (down) */}
            {!locked && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={isMinimized ? handleRestore : handleMinimize}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {isMinimized ? (
                  <ChevronUp size={20} color={colors.textSecondary} strokeWidth={2} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} strokeWidth={2} />
                )}
              </TouchableOpacity>
            )}

            {showCloseButton && (
              <AnimatedTouchable
                style={[styles.closeButton, closeAnimStyle]}
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={colors.textSecondary} strokeWidth={2} />
              </AnimatedTouchable>
            )}
          </Animated.View>
        )}

        {/* Content */}
        {rawContent ? (
          children
        ) : (
          <BottomSheetScrollView
            style={styles.scrollView}
            scrollEnabled={!locked}
            contentContainerStyle={[
              styles.contentContainer,
              { paddingBottom: tabBarHeight + spacing.xxl * 2 }, // Added significant extra padding
              contentContainerStyle,
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
            <BottomSheetKeyboardSpacer />
          </BottomSheetScrollView>
        )}
      </InsideBottomSheetContext.Provider>
    </BottomSheetModal>
  );
});
BottomSheet.displayName = 'BottomSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  sheetShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },

  /* Header (animated between normal and minimized) */
  leftIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    transformOrigin: 'left center',
  },
  lockButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  expandButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
});

// Re-export for consumers that use rawContent with their own scroll/list.
// BottomSheetTextInput MUST be used instead of regular TextInput inside bottom sheets
// to avoid cursor-jumping and gesture conflicts with the sheet's gesture handler.
export { BottomSheetFlatList, BottomSheetScrollView, BottomSheetTextInput };

// Preset configurations for common use cases
export const BottomSheetPresets = {
  settings: {
    snapPoint: 60,
    showHandle: true,
    showCloseButton: true,
  },
  menu: {
    snapPoint: 40,
    showHandle: true,
    showCloseButton: false,
  },
  full: {
    snapPoint: 90,
    showHandle: false,
    showCloseButton: true,
  },
  small: {
    snapPoint: 30,
    showHandle: true,
    showCloseButton: true,
  },
};
