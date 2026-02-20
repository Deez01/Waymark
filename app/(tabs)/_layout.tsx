import { Redirect, Tabs, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
// 1. Swap the import to MaterialIcons
import { MaterialIcons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useQuery } from 'convex/react';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);

  if (currentUser === undefined) return null;
  if (!currentUser) return <Redirect href="/sign-in" />;
  if (!currentUser.profileComplete) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>

      {/* 1. Map Tab */}
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="map" color={color} />,
        }}
      />

      {/* 2. Friends Tab */}
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="people" color={color} />
          ),
        }}
      />

      {/* 3. Create Pin Tab */}
      <Tabs.Screen
        name="create"
        options={{
          title: 'Add Pin',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="add-box" color={color} />
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              onPress={(e) => {
                e.preventDefault();
                router.push('/(tabs)/map?openSheet=true');
              }}
            />
          ),
        }}
      />

      {/* 4. Badges Tab */}
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Badges',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="star" color={color} />
          ),
        }}
      />

      {/* 5. Profile Tab */}
      <Tabs.Screen
        name="user"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
