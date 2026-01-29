import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function AddPinScreen() {
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
          paddingBottom: insets.bottom + Spacing.lg,
        },
      ]}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <ThemedText type="title">Add a Pin</ThemedText>
        <ThemedText style={{ color: colors.textSecondary }}>
          Capture a memory
        </ThemedText>
      </Animated.View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Add Pin Button */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          style={styles.addPinContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.addPinButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              pressed && { backgroundColor: colors.backgroundSecondary },
            ]}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.backgroundSecondary },
              ]}>
              <IconSymbol name="plus" size={32} color={colors.text} />
            </View>
            <ThemedText type="subtitle" style={styles.addPinText}>
              Drop a Pin
            </ThemedText>
            <ThemedText
              style={[styles.addPinDescription, { color: colors.textSecondary }]}>
              Save this moment to your timeline
            </ThemedText>
          </Pressable>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(400)}
          style={styles.quickActions}>
          <QuickAction
            icon="camera.fill"
            label="Photo"
            colors={colors}
            onPress={() => {}}
          />
          <QuickAction
            icon="location.fill"
            label="Location"
            colors={colors}
            onPress={() => {}}
          />
          <QuickAction
            icon="pencil"
            label="Note"
            colors={colors}
            onPress={() => {}}
          />
        </Animated.View>
      </View>

      {/* Bottom Info */}
      <Animated.View
        entering={FadeIn.duration(600).delay(600)}
        style={styles.footer}>
        <ThemedText style={[styles.footerText, { color: colors.textMuted }]}>
          Pins are saved to your personal timeline
        </ThemedText>
      </Animated.View>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  colors,
  onPress,
}: {
  icon: string;
  label: string;
  colors: typeof Colors.light;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickActionButton,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        pressed && { backgroundColor: colors.backgroundSecondary },
      ]}>
      <IconSymbol name={icon as any} size={22} color={colors.text} />
      <ThemedText style={styles.quickActionLabel}>{label}</ThemedText>
    </Pressable>
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
    gap: Spacing.xl,
  },
  addPinContainer: {
    alignItems: 'center',
  },
  addPinButton: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    padding: Spacing.xxl,
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: Spacing.md,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  addPinText: {
    textAlign: 'center',
  },
  addPinDescription: {
    textAlign: 'center',
    fontSize: 14,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  quickActionButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing.xs,
    minWidth: 80,
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  footerText: {
    fontSize: 12,
  },
});
