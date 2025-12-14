import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ModalScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      {/* Handle Bar */}
      <View style={styles.handleContainer}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.iconContainer}>
          <View
            style={[
              styles.iconBackground,
              { backgroundColor: colors.backgroundSecondary },
            ]}>
            <IconSymbol name="sparkles" size={32} color={colors.text} />
          </View>
        </View>

        <ThemedText type="title" style={styles.title}>
          Modal View
        </ThemedText>
        
        <ThemedText style={[styles.description, { color: colors.textSecondary }]}>
          This is a premium modal experience. Use it to display important information
          or collect user input.
        </ThemedText>

        <View style={styles.actions}>
          <Link href="/" dismissTo asChild>
            <Button variant="primary" size="lg" fullWidth>
              Continue
            </Button>
          </Link>
          
          <Link href="/" dismissTo asChild>
            <Pressable style={styles.textButton}>
              <ThemedText style={{ color: colors.textSecondary }}>
                Dismiss
              </ThemedText>
            </Pressable>
          </Link>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  iconBackground: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
  },
  actions: {
    width: '100%',
    maxWidth: 320,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  textButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
});
