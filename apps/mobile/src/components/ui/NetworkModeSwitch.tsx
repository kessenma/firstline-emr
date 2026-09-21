// apps/mobile/src/components/ui/NetworkModeSwitch.tsx
// Toggle switch with cellular / WiFi icons on each side.
// OFF (left) = all networks, ON (right) = WiFi only.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SignalHigh, Wifi } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { ToggleSwitch } from './ToggleSwitch';

interface NetworkModeSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export const NetworkModeSwitch: React.FC<NetworkModeSwitchProps> = ({
  value,
  onValueChange,
}) => {
  const colors = useThemeColors();
  const activeColor = colors.primary;
  const inactiveColor = colors.border;

  return (
    <View style={styles.container}>
      <View style={styles.side}>
        <SignalHigh
          size={16}
          color={!value ? activeColor : inactiveColor}
          strokeWidth={2.5}
        />
        <Text
          style={[
            styles.label,
            { color: !value ? activeColor : colors.textSecondary },
            !value && styles.labelActive,
          ]}
        >
          All
        </Text>
      </View>

      <ToggleSwitch
        value={value}
        onValueChange={onValueChange}
      />

      <View style={styles.side}>
        <Wifi
          size={16}
          color={value ? activeColor : inactiveColor}
          strokeWidth={2.5}
        />
        <Text
          style={[
            styles.label,
            { color: value ? activeColor : colors.textSecondary },
            value && styles.labelActive,
          ]}
        >
          WiFi
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  side: {
    alignItems: 'center',
    width: 30,
  },
  label: {
    fontSize: 9,
    marginTop: 1,
  },
  labelActive: {
    fontWeight: '700',
  },
});
