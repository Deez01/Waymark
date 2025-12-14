import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { auth0Config } from '@/auth0/src/auth/auth0';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Auth0Provider } from 'react-native-auth0';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Custom navigation theme for premium look
const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.light.background,
    card: Colors.light.surface,
    text: Colors.light.text,
    border: Colors.light.borderLight,
    primary: Colors.light.accent,
  },
};

const DarkNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.dark.background,
    card: Colors.dark.surface,
    text: Colors.dark.text,
    border: Colors.dark.borderLight,
    primary: Colors.dark.accent,
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Show error if Auth0 config is missing
  if (!auth0Config.domain || !auth0Config.clientId) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.errorCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.errorTitle, { color: colors.error }]}>
            Configuration Required
          </Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Auth0 configuration is missing. Please rebuild the app with{' '}
            <Text style={{ fontWeight: '600' }}>expo run:ios</Text> after setting up your
            .env file.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Auth0Provider domain={auth0Config.domain} clientId={auth0Config.clientId}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkNavTheme : LightTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="modal"
            options={{
              presentation: 'modal',
              headerShown: false,
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
        </Stack>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    </Auth0Provider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  errorCard: {
    padding: Spacing.xl,
    borderRadius: 16,
    maxWidth: 400,
    width: '100%',
    gap: Spacing.md,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
});
