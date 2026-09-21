// apps/mobile/src/hooks/useToast.tsx
// Toast hook and components matching web API for React Native

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useThemeColors } from '../contexts/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../utils/theme';

const { width } = Dimensions.get('window');

export type ToastVariant = 'default' | 'destructive' | 'success' | 'error' | 'info';

export interface ToastProps {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (props: ToastProps) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * Toast access for screens that may render outside a ToastProvider (e.g. during
 * auth, before the provider mounts). Returns undefined instead of throwing, so
 * callers don't need a try/catch around a hook call — which reads as a
 * conditional hook and trips react-hooks/rules-of-hooks.
 */
export const useOptionalToast = () => useContext(ToastContext);

interface ToastMessage extends ToastProps {
  id: string;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((props: ToastProps) => {
    const id = Date.now().toString() + Math.random().toString(36);
    const newToast: ToastMessage = {
      id,
      duration: props.duration ?? 5000,
      ...props,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
}) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          index={index}
        />
      ))}
    </View>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: () => void;
  index: number;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss, index }) => {
  const colors = useThemeColors();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(-30)); // Slide down from top

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [fadeAnim, slideAnim, onDismiss]);

  // Use surface backgrounds with colored left border — less aggressive than solid color.
  // Colors pulled from theme: success (green.600), error (red.500), info (cello), warning (orange).
  const getVariantStyles = () => {
    switch (toast.variant) {
      case 'destructive':
      case 'error':
        return {
          backgroundColor: colors.surface,
          borderColor: colors.error,
          textColor: colors.text,
        };
      case 'success':
        return {
          backgroundColor: colors.surface,
          borderColor: colors.success,
          textColor: colors.text,
        };
      case 'info':
        return {
          backgroundColor: colors.surface,
          borderColor: colors.info,
          textColor: colors.text,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.surface,
          borderColor: colors.primary,
          textColor: colors.text,
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderLeftColor: variantStyles.borderColor,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          marginTop: index > 0 ? spacing.sm : 0,
        },
        shadows.lg,
      ]}
    >
      <View style={styles.toastContent}>
        <View style={styles.toastText}>
          {toast.title && (
            <Text
              style={[
                styles.title,
                { color: variantStyles.textColor },
              ]}
            >
              {toast.title}
            </Text>
          )}
          {toast.description && (
            <Text
              style={[
                styles.description,
                { color: variantStyles.textColor, opacity: 0.9 },
              ]}
            >
              {toast.description}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    width: width - spacing.md * 2,
    maxWidth: 500,
    borderRadius: borderRadius.lg,
    borderLeftWidth: 4,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  toastText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs / 2,
  },
  description: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
  closeButton: {
    padding: spacing.xs,
  },
});
