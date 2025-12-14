import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface User {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  nickname?: string | null;
}

interface ProfileScreenProps {
  user: User;
  onLogout: () => Promise<void>;
  isLoading: boolean;
}

export function ProfileScreen({ user, onLogout, isLoading }: ProfileScreenProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const displayName = user.name || user.nickname || 'User';
  const email = user.email || '';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
      ]}
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(600)} style={styles.header}>
        <ThemedText type="title">Profile</ThemedText>
      </Animated.View>

      {/* Profile Card */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <Card variant="elevated" padding="lg" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar source={user.picture} name={displayName} size="xl" />
            <View style={styles.profileInfo}>
              <ThemedText type="subtitle" numberOfLines={1}>
                {displayName}
              </ThemedText>
              {email ? (
                <ThemedText
                  style={[styles.email, { color: colors.textSecondary }]}
                  numberOfLines={1}>
                  {email}
                </ThemedText>
              ) : null}
            </View>
          </View>

          <View style={styles.statsRow}>
            <StatItem label="Member" value="Active" colors={colors} />
            <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
            <StatItem label="Plan" value="Premium" colors={colors} />
            <View style={[styles.statDivider, { backgroundColor: colors.borderLight }]} />
            <StatItem label="Status" value="Verified" colors={colors} />
          </View>
        </Card>
      </Animated.View>

      {/* Menu Section */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Account
        </ThemedText>
        <Card variant="outlined" padding="none">
          <MenuItem
            icon="person.crop.circle"
            label="Edit Profile"
            colors={colors}
            onPress={() => {}}
          />
          <Divider spacing="none" />
          <MenuItem
            icon="bell.fill"
            label="Notifications"
            colors={colors}
            onPress={() => {}}
          />
          <Divider spacing="none" />
          <MenuItem
            icon="shield.fill"
            label="Privacy & Security"
            colors={colors}
            onPress={() => {}}
          />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Preferences
        </ThemedText>
        <Card variant="outlined" padding="none">
          <MenuItem
            icon="gearshape.fill"
            label="Settings"
            colors={colors}
            onPress={() => {}}
          />
          <Divider spacing="none" />
          <MenuItem
            icon="questionmark.circle"
            label="Help & Support"
            colors={colors}
            onPress={() => {}}
          />
          <Divider spacing="none" />
          <MenuItem
            icon="doc.fill"
            label="Terms & Privacy"
            colors={colors}
            onPress={() => {}}
          />
        </Card>
      </Animated.View>

      {/* Logout Button */}
      <Animated.View entering={FadeInDown.duration(500).delay(400)} style={styles.logoutSection}>
        <Button
          variant="outline"
          size="lg"
          fullWidth
          onPress={onLogout}
          loading={isLoading}
          icon="rectangle.portrait.and.arrow.right">
          Sign Out
        </Button>
      </Animated.View>

      {/* Version */}
      <Animated.View entering={FadeIn.duration(400).delay(500)} style={styles.version}>
        <ThemedText style={[styles.versionText, { color: colors.textMuted }]}>
          Waymark v1.0.0
        </ThemedText>
      </Animated.View>
    </ScrollView>
  );
}

function StatItem({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.statItem}>
      <ThemedText style={[styles.statValue]}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>
        {label}
      </ThemedText>
    </View>
  );
}

function MenuItem({
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
        styles.menuItem,
        pressed && { backgroundColor: colors.backgroundSecondary },
      ]}>
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconContainer, { backgroundColor: colors.backgroundSecondary }]}>
          <IconSymbol name={icon as any} size={18} color={colors.text} />
        </View>
        <ThemedText style={styles.menuLabel}>{label}</ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  header: {
    paddingBottom: Spacing.sm,
  },
  profileCard: {
    gap: Spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  profileInfo: {
    alignItems: 'center',
    gap: Spacing.xs,
    width: '100%',
  },
  email: {
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: Spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 16,
  },
  logoutSection: {
    paddingTop: Spacing.md,
  },
  version: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  versionText: {
    fontSize: 12,
  },
});
