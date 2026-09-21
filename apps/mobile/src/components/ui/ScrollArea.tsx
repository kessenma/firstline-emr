// apps/mobile/src/components/ui/ScrollArea.tsx
// ScrollArea component matching web API for React Native

import React, { forwardRef } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';

export interface ScrollAreaProps extends ScrollViewProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
  orientation?: 'vertical' | 'horizontal';
  children: React.ReactNode;
}

export const ScrollArea = forwardRef<ScrollView, ScrollAreaProps>(
  (
    {
      className: _className,
      style,
      orientation = 'vertical',
      children,
      horizontal,
      showsVerticalScrollIndicator,
      showsHorizontalScrollIndicator,
      ...props
    },
    ref
  ) => {
    useThemeColors();

    const scrollViewStyles = [
      styles.scrollView,
      {
        backgroundColor: 'transparent',
      },
      style,
    ];

    // Determine scroll direction
    const isHorizontal = horizontal ?? orientation === 'horizontal';

    return (
      <ScrollView
        ref={ref}
        style={scrollViewStyles}
        horizontal={isHorizontal}
        showsVerticalScrollIndicator={
          showsVerticalScrollIndicator ?? !isHorizontal
        }
        showsHorizontalScrollIndicator={
          showsHorizontalScrollIndicator ?? isHorizontal
        }
        contentContainerStyle={styles.contentContainer}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }
);

ScrollArea.displayName = 'ScrollArea';

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
});
