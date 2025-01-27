import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WELCOME</Text>
      <Button title="Onboard" onPress={onComplete} />
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    async function checkOnboarding() {
      try {
        // Check if this is first time launch after install
        const isFirstLaunch = await AsyncStorage.getItem('isAppInstalled');
        
        if (!isFirstLaunch) {
          // Clear all AsyncStorage data
          await AsyncStorage.clear();
          // Mark app as installed
          await AsyncStorage.setItem('isAppInstalled', 'true');
          setHasOnboarded(false);
          return;
        }

        const value = await AsyncStorage.getItem('hasOnboarded');
        setHasOnboarded(value === 'true');
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setHasOnboarded(false);
      }
    }
    checkOnboarding();
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded || hasOnboarded === null) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {hasOnboarded ? (
          <Stack.Screen name="(app)" />
        ) : (
          <Stack.Screen name="onboarding" />
        )}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
});
