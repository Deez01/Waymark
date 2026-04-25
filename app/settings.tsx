import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DefaultTheme } from "@react-navigation/native";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";


export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? "light"];
    
}