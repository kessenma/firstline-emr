// apps/mobile/src/components/ui/DropdownMenu.tsx
// DropdownMenu component for React Native

import React, { createContext, useContext, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  ViewStyle,
  TextStyle,
  ScrollView,
} from 'react-native';
import { Check, ChevronRight, Dot } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../utils/theme';

const { height: screenHeight } = Dimensions.get('window');

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextType | null>(null);

interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <View>
        {children}
      </View>
    </DropdownMenuContext.Provider>
  );
};

interface DropdownMenuTriggerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const DropdownMenuTrigger: React.FC<DropdownMenuTriggerProps> = ({
  children,
  style,
}) => {
  const context = useContext(DropdownMenuContext);

  if (!context) {
    throw new Error('DropdownMenuTrigger must be used within DropdownMenu');
  }

  const { setOpen } = context;

  return (
    <TouchableOpacity
      style={style}
      onPress={() => setOpen(true)}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

interface DropdownMenuContentProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  children,
  style,
}) => {
  const context = useContext(DropdownMenuContext);
  const colors = useThemeColors();

  if (!context) {
    throw new Error('DropdownMenuContent must be used within DropdownMenu');
  }

  const { open, setOpen } = context;

  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => setOpen(false)}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          onPress={() => setOpen(false)}
          activeOpacity={1}
        />
        <View
          style={[
            styles.content,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
            style,
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  onPress,
  style,
  disabled = false,
}) => {
  const context = useContext(DropdownMenuContext);
  const colors = useThemeColors();

  if (!context) {
    throw new Error('DropdownMenuItem must be used within DropdownMenu');
  }

  const { setOpen } = context;

  const handlePress = () => {
    if (!disabled && onPress) {
      onPress();
      setOpen(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.item,
        {
          backgroundColor: colors.surface,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

interface DropdownMenuCheckboxItemProps {
  children: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export const DropdownMenuCheckboxItem: React.FC<DropdownMenuCheckboxItemProps> = ({
  children,
  checked,
  onCheckedChange,
  style,
  disabled = false,
}) => {
  const context = useContext(DropdownMenuContext);
  const colors = useThemeColors();

  if (!context) {
    throw new Error('DropdownMenuCheckboxItem must be used within DropdownMenu');
  }

  const handlePress = () => {
    if (!disabled) {
      onCheckedChange(!checked);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.checkboxItem,
        {
          backgroundColor: colors.surface,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.checkboxContainer}>
        {checked && (
          <Check size={16} color={colors.primary} />
        )}
      </View>
      {children}
    </TouchableOpacity>
  );
};

interface DropdownMenuRadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}

export const DropdownMenuRadioGroup: React.FC<DropdownMenuRadioGroupProps> = ({
  value,
  onValueChange,
  children,
}) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      {children}
    </RadioGroupContext.Provider>
  );
};

interface RadioGroupContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextType | null>(null);

interface DropdownMenuRadioItemProps {
  children: React.ReactNode;
  value: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export const DropdownMenuRadioItem: React.FC<DropdownMenuRadioItemProps> = ({
  children,
  value,
  style,
  disabled = false,
}) => {
  const radioContext = useContext(RadioGroupContext);
  const context = useContext(DropdownMenuContext);
  const colors = useThemeColors();

  if (!radioContext || !context) {
    throw new Error('DropdownMenuRadioItem must be used within DropdownMenuRadioGroup and DropdownMenu');
  }

  const { value: selectedValue, onValueChange } = radioContext;
  const { setOpen } = context;
  const isSelected = selectedValue === value;

  const handlePress = () => {
    if (!disabled) {
      onValueChange(value);
      setOpen(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.radioItem,
        {
          backgroundColor: colors.surface,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.radioContainer}>
        {isSelected && (
          <Dot size={16} color={colors.primary} />
        )}
      </View>
      {children}
    </TouchableOpacity>
  );
};

interface DropdownMenuLabelProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const DropdownMenuLabel: React.FC<DropdownMenuLabelProps> = ({
  children,
  style,
}) => {
  const colors = useThemeColors();

  return (
    <Text
      style={[
        styles.label,
        {
          color: colors.textSecondary,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

interface DropdownMenuSeparatorProps {
  style?: ViewStyle;
}

export const DropdownMenuSeparator: React.FC<DropdownMenuSeparatorProps> = ({
  style,
}) => {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.separator,
        {
          backgroundColor: colors.border,
        },
        style,
      ]}
    />
  );
};

interface DropdownMenuShortcutProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export const DropdownMenuShortcut: React.FC<DropdownMenuShortcutProps> = ({
  children,
  style,
}) => {
  const colors = useThemeColors();

  return (
    <Text
      style={[
        styles.shortcut,
        {
          color: colors.textSecondary,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

// Group and Sub-menu components (simplified for mobile)
export const DropdownMenuGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.group}>{children}</View>
);

export const DropdownMenuSub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View>{children}</View>
);

export const DropdownMenuSubTrigger: React.FC<DropdownMenuItemProps> = (props) => (
  <DropdownMenuItem {...props}>
    {props.children}
    <ChevronRight size={16} />
  </DropdownMenuItem>
);

export const DropdownMenuSubContent: React.FC<DropdownMenuContentProps> = (props) => (
  <DropdownMenuContent {...props} />
);

export const DropdownMenuPortal = View;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  content: {
    maxHeight: screenHeight * 0.7,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.lg,
  },
  item: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  checkboxContainer: {
    width: 20,
    height: 20,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'currentColor',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  radioContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'currentColor',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  separator: {
    height: 1,
    marginHorizontal: spacing.sm,
    marginVertical: spacing.xs,
  },
  shortcut: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    marginLeft: 'auto',
  },
  group: {
    marginVertical: spacing.sm,
  },
});
