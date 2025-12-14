import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface DividerProps extends ViewProps {
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export function Divider({ spacing = 'md', style, ...props }: DividerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const getSpacing = () => {
    switch (spacing) {
      case 'none':
        return 0;
      case 'sm':
        return Spacing.sm;
      case 'md':
        return Spacing.md;
      case 'lg':
        return Spacing.lg;
      default:
        return Spacing.md;
    }
  };

  const marginVertical = getSpacing();

  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: colors.borderLight, marginVertical },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: '100%',
  },
});
