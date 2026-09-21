// apps/mobile/src/hooks/useDeviceType.ts
// Dimension-based iPad/tablet detection with orientation awareness

import { useState, useEffect } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

interface ScreenData {
  width: number;
  height: number;
  isLandscape: boolean;
}

interface DeviceType {
  isTablet: boolean;
  screenData: ScreenData;
}

function getScreenData(dims: ScaledSize): ScreenData {
  return {
    width: dims.width,
    height: dims.height,
    isLandscape: dims.width > dims.height,
  };
}

function detectTablet(dims: ScaledSize): boolean {
  if (Platform.OS !== 'ios') return false;
  const smaller = Math.min(dims.width, dims.height);
  const larger = Math.max(dims.width, dims.height);
  return smaller >= 768 && larger >= 1024;
}

export function useDeviceType(): DeviceType {
  const [state, setState] = useState<DeviceType>(() => {
    const dims = Dimensions.get('window');
    return {
      isTablet: detectTablet(dims),
      screenData: getScreenData(dims),
    };
  });

  useEffect(() => {
    const handler = ({ window }: { window: ScaledSize }) => {
      setState({
        isTablet: detectTablet(window),
        screenData: getScreenData(window),
      });
    };

    const sub = Dimensions.addEventListener('change', handler);
    return () => sub.remove();
  }, []);

  return state;
}
