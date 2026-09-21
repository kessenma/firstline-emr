// apps/mobile/src/components/ui/Avatar.tsx
// Avatar component for React Native

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
  ImageSourcePropType,
} from 'react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { typography } from '../../utils/theme';

interface AvatarProps {
  src?: string | ImageSourcePropType;
  alt?: string;
  initials?: string;
  user?: {
    image?: string;
    googleImage?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
  };
  size?: number;
  style?: ViewStyle;
  textStyle?: TextStyle;
  onError?: () => void;
  onLoad?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  initials,
  user,
  size = 96, // Default size matching web (h-24 w-24 = 96px)
  style,
  textStyle,
  onError,
  onLoad,
}) => {
  const colors = useThemeColors();
  const [imageError, setImageError] = useState(false);

  // Determine image source
  const imageSrc = user?.image || user?.googleImage || src;

  // Generate initials
  const userInitials = initials ||
    (user?.firstName && user?.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`
      : user?.name?.[0] || alt?.[0] || '?');

  const handleImageError = () => {
    setImageError(true);
    onError?.();
  };

  const handleImageLoad = () => {
    onLoad?.();
  };

  const avatarStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: colors.surfaceSecondary,
    overflow: 'hidden',
    ...style,
  };

  if (imageSrc && !imageError) {
    return (
      <View style={avatarStyle}>
        <Image
          source={typeof imageSrc === 'string' ? { uri: imageSrc } : imageSrc}
          style={styles.image}
          onError={handleImageError}
          onLoad={handleImageLoad}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Fallback to initials
  return (
    <View style={avatarStyle}>
      <AvatarFallback initials={userInitials} size={size} textStyle={textStyle} />
    </View>
  );
};

interface AvatarFallbackProps {
  initials: string;
  size: number;
  textStyle?: TextStyle;
}

const AvatarFallback: React.FC<AvatarFallbackProps> = ({
  initials,
  size,
  textStyle,
}) => {
  const colors = useThemeColors();

  const textSize = Math.max(12, size * 0.4); // Responsive text size

  return (
    <View style={styles.fallbackContainer}>
      <Text
        style={[
          styles.fallbackText,
          {
            color: colors.textSecondary,
            fontSize: textSize,
          },
          textStyle,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {initials.toUpperCase()}
      </Text>
    </View>
  );
};

interface AvatarImageProps {
  src: string | ImageSourcePropType;
  alt?: string;
  size?: number;
  style?: ImageStyle;
  onError?: () => void;
  onLoad?: () => void;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  alt,
  size = 96,
  style,
  onError,
  onLoad,
}) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
    onError?.();
  };

  const handleImageLoad = () => {
    onLoad?.();
  };

  if (imageError) {
    return <AvatarFallback initials={alt?.[0] || '?'} size={size} />;
  }

  const imageStyle: ImageStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style,
  };

  return (
    <Image
      source={typeof src === 'string' ? { uri: src } : src}
      style={imageStyle}
      onError={handleImageError}
      onLoad={handleImageLoad}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
});
