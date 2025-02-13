import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
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
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          height: 55,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontFamily: 'Inter',
          fontWeight: '300',
        },
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
          title: 'Orar',
          tabBarIcon: ({ color }) => <Ionicons name="hand-left-outline" size={28} color={color} />,
        }}
      />

<Tabs.Screen
        name="prayer-generator"
        options={{
          title: 'Crear',
          tabBarIcon: ({ color }) => <Ionicons name="hardware-chip-outline" size={28} color={color} />,
        }}
      />
   
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 13,
    fontFamily: 'Inter',
    fontWeight: '300',
  },
});
