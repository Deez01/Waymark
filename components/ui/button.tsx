import { forwardRef } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
    type PressableProps,
} from 'react-native';

import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from './icon-symbol';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<View, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    const getVariantStyles = () => {
      switch (variant) {
        case 'primary':
          return {
            container: {
              backgroundColor: colors.text,
            },
            text: {
              color: colors.background,
            },
            pressed: {
              opacity: 0.85,
            },
          };
        case 'secondary':
          return {
            container: {
              backgroundColor: colors.backgroundSecondary,
            },
            text: {
              color: colors.text,
            },
            pressed: {
              opacity: 0.85,
            },
          };
        case 'outline':
          return {
            container: {
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: colors.border,
            },
            text: {
              color: colors.text,
            },
            pressed: {
              backgroundColor: colors.backgroundSecondary,
            },
          };
        case 'ghost':
          return {
            container: {
              backgroundColor: 'transparent',
            },
            text: {
              color: colors.text,
            },
            pressed: {
              backgroundColor: colors.backgroundSecondary,
            },
          };
        default:
          return {
            container: {},
            text: {},
            pressed: {},
          };
      }
    };

    const getSizeStyles = () => {
      switch (size) {
        case 'sm':
          return {
            container: {
              paddingVertical: Spacing.sm,
              paddingHorizontal: Spacing.md,
              borderRadius: Radius.sm,
            },
            text: Typography.captionSemibold,
            iconSize: 16,
          };
        case 'md':
          return {
            container: {
              paddingVertical: Spacing.sm + 4,
              paddingHorizontal: Spacing.lg,
              borderRadius: Radius.md,
            },
            text: Typography.bodySemibold,
            iconSize: 18,
          };
        case 'lg':
          return {
            container: {
              paddingVertical: Spacing.md,
              paddingHorizontal: Spacing.xl,
              borderRadius: Radius.md,
            },
            text: Typography.bodySemibold,
            iconSize: 20,
          };
        default:
          return {
            container: {},
            text: {},
            iconSize: 18,
          };
      }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    const isDisabled = disabled || loading;

    return (
      <Pressable
        ref={ref}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.container,
          sizeStyles.container,
          variantStyles.container,
          fullWidth && styles.fullWidth,
          pressed && variantStyles.pressed,
          isDisabled && styles.disabled,
        ]}
        {...props}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? colors.background : colors.text}
          />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' && (
              <IconSymbol
                name={icon as any}
                size={sizeStyles.iconSize}
                color={variantStyles.text.color}
                style={styles.iconLeft}
              />
            )}
            <Text style={[styles.text, sizeStyles.text, variantStyles.text]}>
              {children}
            </Text>
            {icon && iconPosition === 'right' && (
              <IconSymbol
                name={icon as any}
                size={sizeStyles.iconSize}
                color={variantStyles.text.color}
                style={styles.iconRight}
              />
            )}
          </View>
        )}
      </Pressable>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
});
