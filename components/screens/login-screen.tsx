import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface LoginScreenProps {
  onLogin: () => Promise<void>;
  isLoading: boolean;
  error?: string | null;
}

export function LoginScreen({ onLogin, isLoading, error }: LoginScreenProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background gradient overlay */}
      <View
        style={[
          styles.backgroundGradient,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      />

      {/* Content */}
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}>
        {/* Hero Section */}
        <Animated.View
          entering={FadeIn.duration(800)}
          style={styles.heroSection}>
          {/* Logo/Brand Mark */}
          <View
            style={[
              styles.logoContainer,
              { backgroundColor: colors.surface, ...Shadows.md },
            ]}>
            <IconSymbol
              name="location.fill"
              size={32}
              color={colors.text}
            />
          </View>

          <View style={styles.heroText}>
            <ThemedText type="hero" style={styles.title}>
              Waymark
            </ThemedText>
            <ThemedText
              style={[styles.subtitle, { color: colors.textSecondary }]}>
              Pin your memories
            </ThemedText>
          </View>
        </Animated.View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Auth Card */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(200)}
          style={styles.authSection}>
          <Card variant="elevated" padding="lg" style={styles.authCard}>
            <ThemedText type="subtitle" style={styles.authTitle}>
              Welcome
            </ThemedText>
            <ThemedText
              style={[styles.authSubtitle, { color: colors.textSecondary }]}>
              Sign in to start pinning moments
            </ThemedText>

            {error && (
              <View
                style={[
                  styles.errorContainer,
                  { backgroundColor: colors.errorMuted },
                ]}>
                <IconSymbol
                  name="exclamationmark.triangle"
                  size={16}
                  color={colors.error}
                />
                <ThemedText style={[styles.errorText, { color: colors.error }]}>
                  {error}
                </ThemedText>
              </View>
            )}

            <View style={styles.buttonContainer}>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onPress={onLogin}
                loading={isLoading}
                icon="rectangle.portrait.and.arrow.forward">
                Continue with Auth0
              </Button>
            </View>

            <View style={styles.dividerContainer}>
              <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
              <ThemedText style={[styles.dividerText, { color: colors.textMuted }]}>
                Secure authentication
              </ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: colors.borderLight }]} />
            </View>

            {/* Features */}
            <View style={styles.features}>
              <FeatureItem
                icon="location.fill"
                text="Pin moments to locations"
                colors={colors}
              />
              <FeatureItem
                icon="clock.fill"
                text="Build your timeline"
                colors={colors}
              />
              <FeatureItem
                icon="heart.fill"
                text="Share with friends"
                colors={colors}
              />
            </View>
          </Card>
        </Animated.View>

        {/* Footer */}
        <Animated.View
          entering={FadeIn.duration(600).delay(400)}
          style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: colors.textMuted }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </ThemedText>
        </Animated.View>
      </View>
    </View>
  );
}

function FeatureItem({
  icon,
  text,
  colors,
}: {
  icon: string;
  text: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.featureItem}>
      <IconSymbol name={icon as any} size={16} color={colors.textSecondary} />
      <ThemedText style={[styles.featureText, { color: colors.textSecondary }]}>
        {text}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    borderBottomLeftRadius: Radius.xl * 2,
    borderBottomRightRadius: Radius.xl * 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  heroText: {
    alignItems: 'center',
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  authSection: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  authCard: {
    gap: Spacing.md,
  },
  authTitle: {
    textAlign: 'center',
  },
  authSubtitle: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.sm,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  buttonContainer: {
    marginTop: Spacing.sm,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  features: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: 14,
  },
  footer: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
