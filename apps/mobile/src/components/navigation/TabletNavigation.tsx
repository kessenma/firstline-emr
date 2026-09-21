// apps/mobile/src/components/navigation/TabletNavigation.tsx
// iPad/tablet left sidebar navigation variant

import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Settings, RefreshCw, Menu, ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  cancelAnimation,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useThemeColors } from '../../contexts/ThemeContext';
import { DownloadProgressBadge } from '../ui/DownloadProgressBadge';

export const SIDEBAR_EXPANDED = 200;
export const SIDEBAR_COLLAPSED = 70;

interface SidebarTabBarProps extends Omit<BottomTabBarProps, 'insets'> {
  isSyncing: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  downloadCount: number;
  onOpenSettings: () => void;
  dismissAll: () => void;
}

export const SidebarTabBar: React.FC<SidebarTabBarProps> = ({
  state,
  descriptors,
  navigation,
  isSyncing,
  isDownloading,
  downloadProgress,
  downloadCount,
  onOpenSettings,
  dismissAll,
}) => {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState(true);

  const sidebarWidth = useSharedValue(SIDEBAR_EXPANDED);

  useEffect(() => {
    sidebarWidth.value = withTiming(expanded ? SIDEBAR_EXPANDED : SIDEBAR_COLLAPSED, { duration: 250 });
  }, [expanded]);

  const sidebarAnimatedStyle = useAnimatedStyle(() => ({
    width: sidebarWidth.value,
  }));

  const labelOpacity = useSharedValue(1);
  useEffect(() => {
    labelOpacity.value = withTiming(expanded ? 1 : 0, { duration: 200 });
  }, [expanded]);

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    maxWidth: interpolate(labelOpacity.value, [0, 1], [0, 120], Extrapolation.CLAMP),
    overflow: 'hidden' as const,
  }));

  const syncRotation = useSharedValue(0);
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
  const syncSpinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${syncRotation.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        sidebarStyles.container,
        {
          backgroundColor: colors.surface,
          borderRightColor: colors.border,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 8,
        },
        sidebarAnimatedStyle,
      ]}
    >
      {/* Hamburger toggle */}
      <TouchableOpacity
        style={sidebarStyles.toggleButton}
        onPress={() => setExpanded(prev => !prev)}
        activeOpacity={0.7}
      >
        {expanded ? (
          <ChevronLeft size={22} color={colors.textSecondary} />
        ) : (
          <Menu size={22} color={colors.textSecondary} />
        )}
      </TouchableOpacity>

      {/* Tab items */}
      <View style={sidebarStyles.tabList}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const isFocused = state.index === index;
          const IconComponent = options.tabBarIcon;
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

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={[
                sidebarStyles.tabItem,
                isFocused && { backgroundColor: colors.primary + '15' },
              ]}
              activeOpacity={0.7}
            >
              <View style={sidebarStyles.tabIconContainer}>
                {IconComponent && IconComponent({
                  focused: isFocused,
                  color: isFocused ? colors.primary : colors.textSecondary,
                  size: 24,
                })}
                {options.tabBarBadge != null && (
                  <View style={[sidebarStyles.badge, { backgroundColor: colors.error }]}>
                    <Text style={[sidebarStyles.badgeText, { color: colors.textInverse }]}>{options.tabBarBadge}</Text>
                  </View>
                )}
              </View>

              <Animated.Text
                style={[
                  sidebarStyles.tabLabel,
                  { color: isFocused ? colors.primary : colors.textSecondary },
                  isFocused && { fontWeight: '600' },
                  labelAnimatedStyle,
                ]}
                numberOfLines={1}
              >
                {label as string}
              </Animated.Text>

              {/* Sync/download badges inline for Profile tab */}
              {isProfileTab && isSyncing && !isDownloading && (
                <Animated.View style={[sidebarStyles.inlineBadge, syncSpinStyle]}>
                  <RefreshCw size={16} color={colors.primary} strokeWidth={2.5} />
                </Animated.View>
              )}
              {isProfileTab && isDownloading && (
                <View style={sidebarStyles.inlineBadge}>
                  <DownloadProgressBadge
                    progress={downloadProgress}
                    count={downloadCount}
                    size={24}
                    color={colors.primary}
                    onPress={onPress}
                  />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Settings button at bottom */}
      <TouchableOpacity
        style={[
          sidebarStyles.tabItem,
          sidebarStyles.settingsItem,
        ]}
        onPress={onOpenSettings}
        activeOpacity={0.7}
      >
        <Settings size={24} color={colors.textSecondary} />
        <Animated.Text
          style={[
            sidebarStyles.tabLabel,
            { color: colors.textSecondary },
            labelAnimatedStyle,
          ]}
          numberOfLines={1}
        >
          Settings
        </Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const sidebarStyles = StyleSheet.create({
  container: {
    height: '100%',
    borderRightWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  toggleButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  tabList: {
    flex: 1,
    gap: 2,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    gap: 12,
  },
  tabIconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  inlineBadge: {
    marginLeft: 'auto',
  },
  settingsItem: {
    marginTop: 'auto',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
