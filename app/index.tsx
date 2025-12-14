import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

// Initial logic screen shown when the app launches.
// It runs quick async checks (auth/onboarding, remote config, etc.)
// then redirects to the appropriate route using `router.replace(...)`.
export default function LaunchScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        // Example checks - adapt to your app's auth/onboarding flow.
        const token = await AsyncStorage.getItem("userToken");
        const onboardingDone = await AsyncStorage.getItem("onboardingDone");

        // small delay for UX while showing loader (optional)
        await new Promise((r) => setTimeout(r, 500));

        if (!mounted) return;

        router.replace("/login" as any);

        // if (!token) {
        //   // No auth -> go to login/signup screen
        //   router.replace("/login");
        // } else if (!onboardingDone) {
        //   // Logged in but hasn't finished onboarding
        //   router.replace("/onboarding");
        // } else {
        //   // All good -> go to main tabs (adjust path to your tabs group)
        //   router.replace("/(tabs)");
        // }
      } catch (e) {
        console.error("Launch init error", e);
        // Fallback to main screen
        router.replace("/(tabs)");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 12 }}>{loading ? "Loading..." : "Redirecting..."}</Text>
    </View>
  );
}
