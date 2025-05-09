import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/useColorScheme";
import { MixpanelProvider } from "@/contexts/MixpanelContext";
import { LanguageProvider } from "../contexts/LanguageContext";
import { ReligionProvider } from "../contexts/ReligionContext";
import { ButtonOptionsProvider } from "../contexts/ButtonOptionsContext";
import React from "react";
import Intro from "./intro";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import selectLanguage from "./selectLanguage";
import PrayerVoiceView from "./prayer-voice";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean>(false);
  const [hasSavedPrayers, setHasSavedPrayers] = useState<boolean>(false);
  const Stack = createNativeStackNavigator();

  const [loaded, error] = useFonts({
    Light: require("../assets/fonts/Light.ttf"),
    Regular: require("../assets/fonts/Regular.ttf"),
    Medium: require("../assets/fonts/Medium.ttf"),
    Bold: require("../assets/fonts/Bold.ttf"),
    SemiBold: require("../assets/fonts/SemiBold.ttf"),
    ExtraBold: require("../assets/fonts/ExtraBold.ttf"),
  });

  useEffect(() => {
    checkIntro();
  }, []);

  const checkIntro = async () => {
    try {
      const [intro, savedPrayers] = await Promise.all([
        AsyncStorage.getItem("hasSeenIntro"),
        AsyncStorage.getItem("savedPrayers"),
      ]);

      if (savedPrayers && JSON.parse(savedPrayers).length > 0) {
        setHasSavedPrayers(true);
      }

      if (intro === "true") {
        setHasSeenIntro(true);
      }
    } catch (error) {
      console.error("Error checking intro state:", error);
      setHasSeenIntro(false);
    }
  };

  if (!loaded) {
    return null;
  }

  return (
    <LanguageProvider>
      <ReligionProvider>
        <ButtonOptionsProvider>
          <MixpanelProvider>
            <ThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <Stack.Navigator
                screenOptions={{
                  headerShown: false,
                }}
              >
                {!hasSeenIntro && (
                  <Stack.Screen name="intro" component={Intro} />
                )}

                <Stack.Screen
                  name="selectLanguage"
                  component={selectLanguage}
                />

                <Stack.Screen name="prayer-voice" component={PrayerVoiceView} />
              </Stack.Navigator>

              <StatusBar style="auto" />
            </ThemeProvider>
          </MixpanelProvider>
        </ButtonOptionsProvider>
      </ReligionProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333333",
  },
});
