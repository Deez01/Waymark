import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useEffect } from "react";

// Side-effect import: defines the background geofence task before app renders
import "@/lib/geofencing";
import { setupNotificationHandler } from "@/lib/notifications";
import { useGeofencing } from "@/hooks/use-geofencing";
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

function navigateToPin(data: { pinId?: string; lat?: number; lng?: number }) {
  if (!data?.pinId) return;
  router.push({
    pathname: "/(tabs)",
    params: {
      pinId: String(data.pinId),
      lat: String(data.lat),
      lng: String(data.lng),
      openPin: "true",
    },
  });
}

// Bridges Convex pins to geofence registration (needs ConvexAuthProvider context)
function GeofencingManager() {
  useGeofencing();
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Configure how notifications display when app is in foreground
    setupNotificationHandler();

    // Cold start: check if app was opened via notification tap while killed
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        navigateToPin(response.notification.request.content.data as any);
      }
    });

    // Warm start: listen for notification taps while app is running
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        navigateToPin(response.notification.request.content.data as any);
      }
    );

    return () => subscription.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ConvexAuthProvider client={convex} storage={tokenStorage}>
        <GeofencingManager />
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
