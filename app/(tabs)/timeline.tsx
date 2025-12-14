import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TimelineScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + Spacing.lg,
        },
      ]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <ThemedText type="title">Timeline</ThemedText>
        <ThemedText style={{ color: colors.textSecondary }}>
          Your memories
        </ThemedText>
      </Animated.View>

      {/* Empty State */}
      <View style={styles.content}>
        <Animated.View
          entering={FadeIn.duration(600).delay(200)}
          style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconContainer,
              { backgroundColor: colors.backgroundSecondary },
            ]}>
            <IconSymbol name="clock.fill" size={32} color={colors.textMuted} />
          </View>
          <ThemedText type="subtitle" style={styles.emptyTitle}>
            No pins yet
          </ThemedText>
          <ThemedText
            style={[styles.emptyDescription, { color: colors.textSecondary }]}>
            Your memories will appear here once you start adding pins
          </ThemedText>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
    paddingBottom: Spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
});
