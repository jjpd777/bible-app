import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#808080',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 14,
          marginBottom: 3,
        },
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: '#1C1C1E',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            paddingTop: 10,
            paddingBottom: 10,
            height: 50,
          },
          default: {
            backgroundColor: '#1C1C1E',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
            paddingTop: 5,
            paddingBottom: 5,
            height: 70,
          },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Relajar',
          tabBarIcon: ({ color }) =>  <Ionicons name="moon" size={28} color={color} />,
        }}
      />
 
 
      <Tabs.Screen
        name="prayer-tracker"
        options={{
          title: 'Rezar',
          tabBarIcon: ({ color }) => <Ionicons name="hand-left-outline" size={28} color={color} />,
        }}
      />
   
    </Tabs>
  );
}
