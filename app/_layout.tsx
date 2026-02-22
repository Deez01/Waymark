import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import "react-native-reanimated";
// 1. Add this new import for bottom sheet gestures:
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";

export const unstable_settings = {
  anchor: "(tabs)",
};

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL!
);

const tokenStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    // 2. Keep GestureHandlerRootView from your branch for bottom sheet
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* 3. Keep ConvexAuthProvider and auth screens from the main branch */}
      <ConvexAuthProvider client={convex} storage={tokenStorage}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="modal"
              options={{ presentation: 'modal', title: 'Modal' }}
            />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ConvexAuthProvider>
    </GestureHandlerRootView>
  );
}
