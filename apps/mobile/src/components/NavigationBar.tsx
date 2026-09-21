// apps/mobile/src/components/NavigationBar.tsx
// Main navigation bar with long-press gesture to reveal settings and animated tab selection
// Routes to bottom tab bar (phone) or collapsible sidebar (tablet)

import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Settings, RefreshCw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  runOnJS,
  Easing,
  cancelAnimation,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useThemeColors } from '../contexts/ThemeContext';
import { useTabBarVisibility } from '../contexts/TabBarVisibilityContext';
import { useDownloadProgress } from '../contexts/DownloadProgressContext';
import { useBottomSheetManager } from '../contexts/BottomSheetManagerContext';
import { DownloadProgressBadge } from './ui/DownloadProgressBadge';
import { SettingsSheet } from '../screens/settings/SettingsSheet';
import { useSyncDownloadBridge } from '../hooks/powersync/useSyncDownloadBridge';
import { useSyncStatus } from '../hooks/powersync';
import { SidebarTabBar } from './navigation/TabletNavigation';

interface NavigationBarProps extends BottomTabBarProps {
  onSettingsPress?: () => void;
}

// ────────────────────────────────────────────────
// Animated Tab Button Component (bottom bar mode)
// ────────────────────────────────────────────────
const AnimatedTabButton: React.FC<{
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  IconComponent: any;
  label: string;
  colors: any;
  options: any;
  activeColor?: string;
}> = ({ isFocused, onPress, onLongPress, IconComponent, label, colors, options, activeColor }) => {
  const focusedColor = activeColor || colors.primary;
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      translateY.value = withTiming(-2, {
        duration: 200,
      });
    } else {
      translateY.value = withTiming(0, {
        duration: 200,
      });
    }
  }, [isFocused]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.tabButton}
    >
      <Animated.View style={[styles.tabContent, animatedStyle]}>
        {IconComponent && (
          <View style={styles.iconContainer}>
            {IconComponent({
              focused: isFocused,
              color: isFocused ? focusedColor : colors.textSecondary,
              size: 24,
            })}
            {options.tabBarBadge && (
              <View style={[styles.badge, { backgroundColor: colors.error }]}>
                <Text style={[styles.badgeText, { color: colors.textInverse }]}>{options.tabBarBadge}</Text>
              </View>
            )}
          </View>
        )}
        <Text
          style={[
            styles.tabLabel,
            {
              color: isFocused ? focusedColor : colors.textSecondary,
            },
          ]}
        >
          {label as string}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ────────────────────────────────────────────────
// Animated Profile Tab with Gesture Support (bottom bar mode)
// ────────────────────────────────────────────────
const AnimatedProfileTab: React.FC<{
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  IconComponent: any;
  label: string;
  colors: any;
  options: any;
  activeColor?: string;
  showSettingsButton: boolean;
  showSettings: () => void;
  openSettings: () => void;
  isDraggingToSettings: boolean;
  setIsDraggingToSettings: (val: boolean) => void;
  hideSettings: () => void;
  animatedSettingsButtonStyle: any;
  isSyncing: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  downloadCount: number;
}> = ({
  isFocused,
  onPress,
  IconComponent,
  label,
  colors,
  options,
  activeColor,
  showSettingsButton,
  showSettings,
  openSettings,
  isDraggingToSettings,
  setIsDraggingToSettings,
  hideSettings,
  animatedSettingsButtonStyle,
  isSyncing,
  isDownloading,
  downloadProgress,
  downloadCount,
}) => {
  const focusedColor = activeColor || colors.primary;
  const translateY = useSharedValue(0);
  const syncRotation = useSharedValue(0);

  useEffect(() => {
    if (isFocused) {
      translateY.value = withTiming(-2, {
        duration: 200,
      });
    } else {
      translateY.value = withTiming(0, {
        duration: 200,
      });
    }
  }, [isFocused]);

  useEffect(() => {
    if (isSyncing) {
      syncRotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(syncRotation);
      syncRotation.value = withTiming(0, { duration: 300 });
    }
  }, [isSyncing]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const syncSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${syncRotation.value}deg` }],
  }));

  // Create combined gesture for Profile tab - tap + long press + pan
  const tapGesture = Gesture.Tap()
    .maxDuration(200)
    .onEnd(() => {
      'worklet';
      runOnJS(onPress)();
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      'worklet';
      runOnJS(showSettings)();
    });

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onUpdate(event => {
      'worklet';
      if (event.translationY < -60) {
        runOnJS(setIsDraggingToSettings)(true);
      } else {
        runOnJS(setIsDraggingToSettings)(false);
      }
    })
    .onEnd(event => {
      'worklet';
      if (event.translationY < -60) {
        runOnJS(openSettings)();
      } else if (showSettingsButton) {
        runOnJS(hideSettings)();
      }
    })
    .onFinalize(() => {
      'worklet';
      runOnJS(setIsDraggingToSettings)(false);
    });

  const combinedGesture = Gesture.Race(
    tapGesture,
    Gesture.Simultaneous(longPressGesture, panGesture),
  );

  return (
    <GestureDetector gesture={combinedGesture}>
      <View style={styles.tabButton}>
        <Animated.View style={[styles.tabContent, animatedStyle]}>
          {IconComponent && (
            <View style={styles.iconContainer}>
              {IconComponent({
                focused: isFocused,
                color: isFocused ? focusedColor : colors.textSecondary,
                size: 24,
              })}
              {options.tabBarBadge && (
                <View style={[styles.badge, { backgroundColor: colors.error }]}>
                  <Text style={[styles.badgeText, { color: colors.textInverse }]}>{options.tabBarBadge}</Text>
                </View>
              )}
            </View>
          )}
          <Text
            style={[
              styles.tabLabel,
              {
                color: isFocused ? focusedColor : colors.textSecondary,
              },
            ]}
          >
            {label as string}
          </Text>
        </Animated.View>

        {/* Floating Settings Button */}
        {showSettingsButton && (
          <Animated.View
            style={[styles.floatingButton, animatedSettingsButtonStyle]}
          >
            <TouchableOpacity
              style={[
                styles.settingsButton,
                {
                  backgroundColor: isDraggingToSettings
                    ? colors.primary
                    : colors.surface,
                  borderColor: isDraggingToSettings
                    ? colors.primary
                    : colors.border,
                },
              ]}
              onPress={openSettings}
              activeOpacity={0.8}
            >
              <Settings
                size={20}
                color={isDraggingToSettings ? colors.textInverse : colors.primary}
                strokeWidth={2}
              />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Sync Spinner Badge */}
        {isSyncing && !isDownloading && (
          <View style={styles.syncBadge}>
            <Animated.View style={syncSpinStyle}>
              <RefreshCw size={16} color={colors.primary} strokeWidth={2.5} />
            </Animated.View>
          </View>
        )}

        {/* Download Progress Badge */}
        {isDownloading && (
          <View style={styles.downloadBadge}>
            <DownloadProgressBadge
              progress={downloadProgress}
              count={downloadCount}
              size={28}
              color={colors.primary}
              onPress={onPress}
            />
          </View>
        )}
      </View>
    </GestureDetector>
  );
};

// ────────────────────────────────────────────────
// Main NavigationBar — routes to bottom bar or sidebar
// ────────────────────────────────────────────────
export const NavigationBar: React.FC<NavigationBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { isTabBarVisible } = useTabBarVisibility();
  const { isAnyDownloading, totalProgress, downloadCount } = useDownloadProgress();
  const { dismissAll } = useBottomSheetManager();
  useSyncDownloadBridge(); // Bridges PowerSync sync activity -> tab bar badge
  const { isDownloading: isSyncDownloading, isConnecting: isSyncConnecting } = useSyncStatus({ pollInterval: 2000, enableDetailedLogging: false });
  const isSyncing = isSyncDownloading || isSyncConnecting;
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [showSettingsButton, setShowSettingsButton] = useState(false);
  const [isDraggingToSettings, setIsDraggingToSettings] = useState(false);

  // Detect sidebar mode from the focused route's tabBarPosition option
  const focusedRouteKey = state.routes[state.index].key;
  const tabBarPosition = descriptors[focusedRouteKey]?.options?.tabBarPosition ?? 'bottom';
  const isSidebar = tabBarPosition === 'left';

  // --- Tab bar slide in/out animation ---
  const tabBarOffset = useSharedValue(0);

  useEffect(() => {
    // Slide down off-screen when hidden, back up when visible
    tabBarOffset.value = withTiming(isTabBarVisible ? 0 : 1, { duration: 250 });
  }, [isTabBarVisible]);

  // Full height the bar needs to travel: paddingTop(6) + button(44) + paddingBottom + extra
  const slideDistance = 50 + Math.max(insets.bottom, 12) + 10;

  const tabBarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(tabBarOffset.value, [0, 1], [0, slideDistance]) }],
    opacity: interpolate(tabBarOffset.value, [0, 0.5], [1, 0], Extrapolation.CLAMP),
  }));

  // Animation values - must be called before any conditional returns
  const settingsButtonOpacity = useSharedValue(0);
  const settingsButtonTranslateY = useSharedValue(60);

  // Show settings button with animation
  const showSettings = () => {
    setShowSettingsButton(true);
    settingsButtonOpacity.value = withTiming(1, { duration: 150 });
    settingsButtonTranslateY.value = withTiming(0, { duration: 200 });
  };

  // Handle tap outside - dismiss settings button
  const handleOutsideTap = (e: any) => {
    e?.stopPropagation?.();
    if (showSettingsButton) {
      hideSettings();
    }
  };

  // Hide settings button with animation
  const hideSettings = () => {
    settingsButtonOpacity.value = withTiming(0, { duration: 150 });
    settingsButtonTranslateY.value = withTiming(60, { duration: 150 });
    setTimeout(() => {
      setShowSettingsButton(false);
      setIsDraggingToSettings(false);
    }, 150);
  };

  // Open settings sheet
  const openSettings = () => {
    hideSettings();
    setIsSettingsVisible(true);
  };

  const animatedSettingsButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: settingsButtonTranslateY.value }],
      opacity: settingsButtonOpacity.value,
    };
  });

  // ── Sidebar rendering path ──
  if (isSidebar) {
    return (
      <>
        <SidebarTabBar
          state={state}
          descriptors={descriptors}
          navigation={navigation}
          isSyncing={isSyncing}
          isDownloading={isAnyDownloading}
          downloadProgress={totalProgress}
          downloadCount={downloadCount}
          onOpenSettings={openSettings}
          dismissAll={dismissAll}
        />
        <SettingsSheet
          visible={isSettingsVisible}
          onClose={() => setIsSettingsVisible(false)}
        />
      </>
    );
  }

  // ── Bottom tab bar rendering path ──
  return (
    <>
      {/* Backdrop to detect taps outside when settings button is visible */}
      {showSettingsButton && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPressIn={handleOutsideTap}
        />
      )}

      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
          tabBarAnimatedStyle,
        ]}
        pointerEvents={isTabBarVisible ? 'auto' : 'none'}
      >
        <View style={styles.tabBar}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel !== undefined
                ? options.tabBarLabel
                : options.title !== undefined
                ? options.title
                : route.name;

            const isFocused = state.index === index;
            const isProfileTab = route.name === 'Profile';

            const onPress = () => {
              dismissAll();
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            // Get icon component
            const IconComponent = options.tabBarIcon;
            const activeColor = options.tabBarActiveTintColor as string | undefined;

            // Render Profile tab with gesture support
            if (isProfileTab) {
              return (
                <AnimatedProfileTab
                  key={route.key}
                  isFocused={isFocused}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  IconComponent={IconComponent}
                  label={label as string}
                  colors={colors}
                  options={options}
                  activeColor={activeColor}
                  showSettingsButton={showSettingsButton}
                  showSettings={showSettings}
                  openSettings={openSettings}
                  isDraggingToSettings={isDraggingToSettings}
                  setIsDraggingToSettings={setIsDraggingToSettings}
                  hideSettings={hideSettings}
                  animatedSettingsButtonStyle={animatedSettingsButtonStyle}
                  isSyncing={isSyncing}
                  isDownloading={isAnyDownloading}
                  downloadProgress={totalProgress}
                  downloadCount={downloadCount}
                />
              );
            }

            // Render regular animated tab button
            return (
              <AnimatedTabButton
                key={route.key}
                isFocused={isFocused}
                onPress={onPress}
                onLongPress={onLongPress}
                IconComponent={IconComponent}
                label={label as string}
                colors={colors}
                options={options}
                activeColor={activeColor}
              />
            );
          })}
        </View>
      </Animated.View>

      {/* Settings Sheet Modal */}
      <SettingsSheet
        visible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
      />
    </>
  );
};

// ────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
    zIndex: 1000,
    paddingTop: 6,
  },
  tabBar: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    height: 44,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    display: 'none', // Hide labels in dock style
  },
  floatingButton: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: -3,
    alignItems: 'center',
    zIndex: 1000,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 99,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  syncBadge: {
    position: 'absolute',
    top: -14,
    right: 4,
    zIndex: 1001,
  },
  downloadBadge: {
    position: 'absolute',
    top: -18,
    right: 2,
    zIndex: 1001,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    // backgroundColor set inline via colors.error
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    // color set inline via colors.textInverse
    fontSize: 12,
    fontWeight: '600',
  },
});
