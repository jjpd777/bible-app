import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/useColorScheme';
import { MixpanelProvider } from '@/contexts/MixpanelContext';
import { LanguageProvider } from '../contexts/LanguageContext';

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
        const hasOnboardedValue = await AsyncStorage.getItem('hasOnboarded');
        const onboardingData = await AsyncStorage.getItem('onboardingData');
        
        // If either value is missing, treat as not onboarded
        if (!hasOnboardedValue || !onboardingData) {
          await AsyncStorage.removeItem('hasOnboarded');
          await AsyncStorage.removeItem('onboardingData');
          setHasOnboarded(false);
          return;
        }
        
        setHasOnboarded(hasOnboardedValue === 'true');
      } catch (error) {
        console.error('Error checking onboarding:', error);
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
    <LanguageProvider>
      <MixpanelProvider>
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
      </MixpanelProvider>
    </LanguageProvider>
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
