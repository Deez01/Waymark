import { View, type ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  variant?: 'default' | 'secondary' | 'surface';
};

export function ThemedView({ 
  style, 
  lightColor, 
  darkColor, 
  variant = 'default',
  ...otherProps 
}: ThemedViewProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const getBackgroundColor = () => {
    if (lightColor && darkColor) {
      return colorScheme === 'light' ? lightColor : darkColor;
    }
    switch (variant) {
      case 'secondary':
        return colors.backgroundSecondary;
      case 'surface':
        return colors.surface;
      default:
        return colors.background;
    }
  };

  return <View style={[{ backgroundColor: getBackgroundColor() }, style]} {...otherProps} />;
}
