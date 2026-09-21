import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Copy, Check } from 'lucide-react-native';
import Animated, { 
  ZoomIn,
  ZoomOut
} from 'react-native-reanimated';
import { useToast } from '../../hooks/useToast';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius } from '../../utils/theme';
import { palette } from '../../utils/colors';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  style?: ViewStyle;
  iconSize?: number;
  variant?: 'default' | 'ghost' | 'outline';
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  label = 'Text',
  style,
  iconSize = 16,
  variant = 'ghost',
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const colors = useThemeColors();

  const handleCopy = () => {
    Clipboard.setString(textToCopy);
    setIsCopied(true);
    
    toast({
      title: 'Copied!',
      description: `${label} has been copied to clipboard.`,
      variant: 'success',
    });

    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'default':
        return colors.surface;
      case 'outline':
        return 'transparent';
      case 'ghost':
      default:
        return 'transparent';
    }
  };
  
  const getBorderWidth = () => variant === 'outline' ? 1 : 0;
  const getBorderColor = () => variant === 'outline' ? colors.border : 'transparent';

  return (
    <TouchableOpacity
      onPress={handleCopy}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderWidth: getBorderWidth(),
          borderColor: getBorderColor(),
          width: iconSize + spacing.md,
          height: iconSize + spacing.md,
        },
        style,
      ]}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      {isCopied ? (
        <Animated.View entering={ZoomIn} exiting={ZoomOut}>
          <Check size={iconSize} color={palette.teal[500]} /> 
        </Animated.View>
      ) : (
        <Animated.View entering={ZoomIn} exiting={ZoomOut}>
          <Copy size={iconSize} color={colors.text} />
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
});
