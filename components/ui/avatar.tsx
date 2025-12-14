import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  source?: string | null;
  name?: string | null;
  size?: AvatarSize;
}

export function Avatar({ source, name, size = 'md' }: AvatarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { dimension: 32, fontSize: 12, iconSize: 16 };
      case 'md':
        return { dimension: 48, fontSize: 16, iconSize: 24 };
      case 'lg':
        return { dimension: 72, fontSize: 24, iconSize: 36 };
      case 'xl':
        return { dimension: 120, fontSize: 40, iconSize: 56 };
      default:
        return { dimension: 48, fontSize: 16, iconSize: 24 };
    }
  };

  const sizeStyles = getSizeStyles();

  const getInitials = (name: string | null | undefined) => {
    if (!name) return null;
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <View
      style={[
        styles.container,
        {
          width: sizeStyles.dimension,
          height: sizeStyles.dimension,
          borderRadius: sizeStyles.dimension / 2,
          backgroundColor: colors.backgroundSecondary,
        },
      ]}>
      {source ? (
        <Image
          source={{ uri: source }}
          style={[
            styles.image,
            {
              width: sizeStyles.dimension,
              height: sizeStyles.dimension,
              borderRadius: sizeStyles.dimension / 2,
            },
          ]}
          contentFit="cover"
          transition={200}
        />
      ) : initials ? (
        <Text
          style={[
            styles.initials,
            {
              fontSize: sizeStyles.fontSize,
              color: colors.textSecondary,
            },
          ]}>
          {initials}
        </Text>
      ) : (
        <IconSymbol
          name="person.fill"
          size={sizeStyles.iconSize}
          color={colors.textSecondary}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
  },
  initials: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
