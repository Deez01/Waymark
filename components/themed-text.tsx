import { Text, type TextProps } from 'react-native';

import { Colors, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'subtitle' | 'hero' | 'body' | 'bodySemibold' | 'caption' | 'captionSemibold' | 'small' | 'link' | 'defaultSemiBold';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  
  const color = lightColor && darkColor 
    ? (colorScheme === 'light' ? lightColor : darkColor) 
    : colors.text;

  const getTypeStyle = () => {
    switch (type) {
      case 'hero':
        return Typography.hero;
      case 'title':
        return Typography.title;
      case 'subtitle':
        return Typography.subtitle;
      case 'body':
      case 'default':
        return Typography.body;
      case 'bodySemibold':
      case 'defaultSemiBold':
        return Typography.bodySemibold;
      case 'caption':
        return Typography.caption;
      case 'captionSemibold':
        return Typography.captionSemibold;
      case 'small':
        return Typography.small;
      case 'link':
        return { ...Typography.body, color: colors.accent };
      default:
        return Typography.body;
    }
  };

  return (
    <Text
      style={[
        { color },
        getTypeStyle(),
        type === 'link' && { color: colors.accent },
        style,
      ]}
      {...rest}
    />
  );
}
