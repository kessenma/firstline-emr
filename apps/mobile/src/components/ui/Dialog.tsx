// apps/mobile/src/components/ui/Dialog.tsx
// Dialog component system matching web API for React Native

import React, {
  createContext,
  useContext,
  useState,
  forwardRef,
  useCallback,
} from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../../utils/theme';

// Dialog Context
interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | undefined>(undefined);

const useDialogContext = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
};

// Dialog Root
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  open: controlledOpen,
  onOpenChange,
  children,
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  );
};

// Dialog Trigger
interface DialogTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

export const DialogTrigger: React.FC<DialogTriggerProps> = ({ children }) => {
  const { setOpen } = useDialogContext();

    return React.cloneElement(children as React.ReactElement<{ onPress?: () => void }>, {
      onPress: () => {
        (children as any).props.onPress?.();
        setOpen(true);
      },
  });
};

// Dialog Portal (no-op for React Native, included for API compatibility)
export const DialogPortal: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

// Dialog Overlay
interface DialogOverlayProps {
  style?: StyleProp<ViewStyle>;
}

export const DialogOverlay: React.FC<DialogOverlayProps> = ({ style }) => {
  const { setOpen } = useDialogContext();
  const colors = useThemeColors();

  return (
    <Pressable
      style={[
        styles.overlay,
        { backgroundColor: `${colors.text}40` },
        style,
      ]}
      onPress={() => setOpen(false)}
    />
  );
};

// Dialog Content
interface DialogContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  size?: 'sm' | 'md' | 'lg';
  scrollable?: boolean;
  noPadding?: boolean;
  hideClose?: boolean;
  onClose?: () => void;
}

export const DialogContent = forwardRef<View, DialogContentProps>(
  (
    {
      children,
      style,
      size = 'md',
      scrollable = true,
      noPadding = false,
      hideClose = false,
      onClose,
    },
    ref
  ) => {
    const { open, setOpen } = useDialogContext();
    const colors = useThemeColors();

    const handleClose = useCallback(() => {
      onClose?.();
      setOpen(false);
    }, [onClose, setOpen]);

    const sizeStyles = {
      sm: { maxWidth: 300 },
      md: { maxWidth: 500 },
      lg: { maxWidth: '90%' as any },
    };

    const contentStyles = [
      styles.content,
      {
        backgroundColor: colors.surface,
        borderColor: colors.border,
      },
      sizeStyles[size],
      shadows.lg,
      style,
    ];

    const innerContentStyles = [!noPadding && { padding: spacing.lg }];

    return (
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={styles.modalContainer}>
          <DialogOverlay />
          <View ref={ref} style={contentStyles}>
            {!hideClose && (
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}

            {scrollable ? (
              <ScrollView
                style={styles.scrollView}
                contentContainerStyle={innerContentStyles}
                showsVerticalScrollIndicator={true}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.nonScrollableContent, innerContentStyles]}>
                {children}
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }
);

DialogContent.displayName = 'DialogContent';

// Dialog Header
interface DialogHeaderProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const DialogHeader: React.FC<DialogHeaderProps> = ({
  children,
  style,
}) => {
  return <View style={[styles.header, style]}>{children}</View>;
};

// Dialog Title
interface DialogTitleProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const DialogTitle = forwardRef<Text, DialogTitleProps>(
  ({ children, style }, ref) => {
    const colors = useThemeColors();

    return (
      <Text
        ref={ref}
        style={[
          styles.title,
          { color: colors.text },
          style,
        ]}
      >
        {children}
      </Text>
    );
  }
);

DialogTitle.displayName = 'DialogTitle';

// Dialog Description
interface DialogDescriptionProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

export const DialogDescription = forwardRef<Text, DialogDescriptionProps>(
  ({ children, style }, ref) => {
    const colors = useThemeColors();

    return (
      <Text
        ref={ref}
        style={[
          styles.description,
          { color: colors.textSecondary },
          style,
        ]}
      >
        {children}
      </Text>
    );
  }
);

DialogDescription.displayName = 'DialogDescription';

// Dialog Footer
interface DialogFooterProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const DialogFooter: React.FC<DialogFooterProps> = ({
  children,
  style,
}) => {
  return <View style={[styles.footer, style]}>{children}</View>;
};

// Dialog Close (for manual close buttons)
interface DialogCloseProps {
  children: React.ReactElement;
}

export const DialogClose: React.FC<DialogCloseProps> = ({ children }) => {
  const { setOpen } = useDialogContext();

  return React.cloneElement(children as React.ReactElement<{ onPress?: () => void }>, {
    onPress: () => {
      (children as any).props.onPress?.();
      setOpen(false);
    },
  });
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    width: '90%',
    maxHeight: '80%',
    minHeight: 120,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  nonScrollableContent: {
    flexGrow: 1,
    minHeight: 1,
  },
  scrollView: {
    maxHeight: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    padding: spacing.xs,
    borderRadius: borderRadius.full,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    lineHeight: typography.lineHeight.tight,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.relaxed,
  },
  footer: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
});
