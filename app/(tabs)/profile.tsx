import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth0 } from 'react-native-auth0';

import { ProfileScreen } from '@/components/screens/profile-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileTab() {
  const { clearSession, user, isLoading } = useAuth0();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await clearSession();
    } catch (e) {
      console.log('Auth0 logout cancelled', e);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.notLoggedIn,
            { paddingTop: insets.top + Spacing.xl },
          ]}>
          <ThemedText type="subtitle" style={styles.notLoggedInText}>
            Sign in to view your profile
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary, textAlign: 'center' }}>
            Go to the Home tab to sign in with your account
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ProfileScreen
      user={user}
      onLogout={handleLogout}
      isLoading={isLoading || isLoggingOut}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notLoggedIn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  notLoggedInText: {
    textAlign: 'center',
  },
});
