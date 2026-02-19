import { Tabs, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="map.fill" color={color} />,
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: 'Add Pin',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={32} name="plus.circle.fill" color={color} />
          ),
          // Intercept the button press
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                e.preventDefault(); // Stop the default navigation to create.tsx
                // Route to the map and pass a parameter to trigger the bottom sheet
                router.push('/(tabs)/map?openSheet=true');
              }}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Badges',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="star.fill" color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
