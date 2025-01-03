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
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    // Check if user has completed onboarding
    AsyncStorage.getItem('hasOnboarded').then(value => {
      setHasOnboarded(value === 'true');
    });
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    setHasOnboarded(true);
  };

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  if (!hasOnboarded) {
    return <OnboardingScreen onComplete={completeOnboarding} />;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
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
