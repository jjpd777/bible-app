import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Image,
  ImageBackground,
  AppState,
} from "react-native";

import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Sharing from "expo-sharing";
import { ref, getDownloadURL } from "firebase/storage";
import { Asset } from "expo-asset";
import { storage } from "../../config/firebase";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useLanguage } from "@/contexts/LanguageContext";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useReligion } from "@/contexts/ReligionContext";
import { Fonts, Icons, Images } from "@/assets";
import { Colors } from "@/constants/Colors";
import AnimatedGenerateIcon from "../components/animatedGenerateIcon";

interface SavedPrayer {
  id: number;
  text: string;
  audioPath: string | null;
  generatedAudioPath: string | null;
  createdAt: number;
  isGenerated: boolean;
  isBookmarked?: boolean;
}

interface RouteParams {
  prayer?: string;
  names?: string;
  intentions?: string;
  instructions?: string;
  isNewGeneration?: string;
  language?: string;
  prayerPrompt?: string;
  inputMethod?: string;
  dailyVerse?: string;
}

interface Route {
  params: RouteParams;
}

export default function PrayerVoiceView({
  route,
  navigation,
}: {
  route: Route;
  navigation: any;
}) {
  const params = route.params;

  const { trackEvent } = useAnalytics();
  const { language, t } = useLanguage();
  const { religion } = useReligion();

  // Track page view
  useEffect(() => {
    if (typeof trackEvent === "function") {
      trackEvent("Page View", { page_name: "Prayer Voice" });
    }
  }, [trackEvent]);

  // Define ALL hooks at the top level
  const [currentPrayer, setCurrentPrayer] = useState<SavedPrayer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loadingDots, setLoadingDots] = useState("");
  const [appState, setAppState] = useState(AppState.currentState);

  // Add animation values for the loading animation
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Add refs and state for scroll indicator
  const scrollViewRef = useRef<ScrollView>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  // Set up the animation when component mounts
  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(-15, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1, // Infinite repetitions
      true // Reverse on each iteration
    );

    // Create a pulsing animation for the loading indicator
    scale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite repetitions
      false // Don't reverse
    );

    // Create a fading animation
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // Infinite repetitions
      false // Don't reverse
    );
  }, []);

  // Create the animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const pulseAnimationStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  // Use a single useEffect for initialization
  useEffect(() => {
    const initializePrayer = async () => {
      try {
        if (params.prayer) {
          setCurrentPrayer(JSON.parse(params.prayer));
        } else if (params.isNewGeneration === "true") {
          await generateAndSavePrayer();
        }
      } catch (err) {
        console.error("Error initializing prayer:", err);
        setError("Failed to initialize prayer");
      }
    };

    initializePrayer();
  }, []);

  // Add this useEffect to initialize bookmark state
  useEffect(() => {
    if (currentPrayer) {
      setIsBookmarked(currentPrayer.isBookmarked || false);
    }
  }, [currentPrayer]);

  // Keep only the generated sound states
  const [generatedSound, setGeneratedSound] = useState<Audio.Sound | null>(
    null
  );
  const [isGeneratedPlaying, setIsGeneratedPlaying] = useState(false);

  // Keep only the useEffect for generated sound
  useEffect(() => {
    return () => {
      if (generatedSound) generatedSound.unloadAsync();
    };
  }, [generatedSound]);

  // Functions for handling scroll events
  const handleContentSizeChange = (
    contentWidth: number,
    contentHeight: number
  ) => {
    setContentHeight(contentHeight);
  };

  const handleScroll = (event: {
    nativeEvent: { contentOffset: { y: number } };
  }) => {
    setScrollY(event.nativeEvent.contentOffset.y);
  };

  const handleLayout = (event: {
    nativeEvent: { layout: { height: number } };
  }) => {
    const { height } = event.nativeEvent.layout;
    setScrollViewHeight(height);
  };

  // Calculate scroll indicator position and height
  const scrollIndicatorHeight = Math.max(
    (scrollViewHeight / contentHeight) * scrollViewHeight * 0.2,
    10 // minimum height
  );

  const scrollIndicatorPosition =
    contentHeight > scrollViewHeight
      ? (scrollY / (contentHeight - scrollViewHeight)) *
        (scrollViewHeight - scrollIndicatorHeight) *
        0.96
      : 0;

  // Add this new variable to determine if content is scrollable
  const isContentScrollable = contentHeight > scrollViewHeight;

  // Add useEffect for app state handling
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === "active") {
        // App has come to the foreground
        if (generatedSound && isGeneratedPlaying) {
          // Resume playback if it was playing before going to background
          generatedSound.playAsync().catch((err) => {
            console.error("Error resuming playback:", err);
          });
        }
      }
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, [appState, generatedSound, isGeneratedPlaying]);

  // Add useEffect for audio session configuration
  useEffect(() => {
    const configureAudioSession = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error("Error configuring audio session:", error);
      }
    };

    configureAudioSession();
  }, []);

  async function generateVoice(prayer: SavedPrayer) {
    setIsGeneratingVoice(true);
    setLoadingDots("");
    try {
      // Use your backend API instead of calling ElevenLabs directly
      const response = await fetch(
        "https://realtime-3d-server.fly.dev/api/generate-audio",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: prayer.text,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        const errorText = errorData.error || "Failed to generate audio";
        console.error("Response status:", response.status);
        console.error("Error details:", errorText);

        // Track the error with Mixpanel
        if (typeof trackEvent === "function") {
          trackEvent("Prayer Voice Generation Error", {
            error_type: "API_ERROR",
            error_status: response.status,
            error_details: errorText.substring(0, 500), // Limit the error text length
            prayer_id: prayer.id,
            prayer_length: prayer.text.length,
            language: language || "en",
            religion: religion,
          });
        }

        throw new Error(
          `Failed to generate audio: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      if (!data.success || !data.url) {
        throw new Error("Invalid response from server");
      }

      // Construct the full URL to the audio file
      const audioUrl = `https://realtime-3d-server.fly.dev${data.url}`;

      // Download the audio file from the URL
      const audioResponse = await fetch(audioUrl);
      const audioBlob = await audioResponse.blob();

      const reader = new FileReader();
      const base64Audio = await new Promise((resolve) => {
        reader.onload = () => {
          const base64 = reader.result?.toString().split(",")[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      // Delete previous generated audio if it exists
      if (prayer.generatedAudioPath) {
        try {
          await FileSystem.deleteAsync(prayer.generatedAudioPath);
        } catch (err) {
          console.log("Error deleting previous generated audio:", err);
        }
      }

      const fileName = `prayer_${prayer.id}_generated_${Date.now()}.mp3`;
      const newPath = `${FileSystem.documentDirectory}prayers/${fileName}`;

      await FileSystem.makeDirectoryAsync(
        `${FileSystem.documentDirectory}prayers/`,
        {
          intermediates: true,
        }
      );

      await FileSystem.writeAsStringAsync(newPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Update the prayer with the new generatedAudioPath
      const savedPrayers = await AsyncStorage.getItem("savedPrayers");
      if (savedPrayers) {
        const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
        const updatedPrayers = prayers.map((p) =>
          p.id === prayer.id ? { ...p, generatedAudioPath: newPath } : p
        );
        await AsyncStorage.setItem(
          "savedPrayers",
          JSON.stringify(updatedPrayers)
        );
        setCurrentPrayer({ ...prayer, generatedAudioPath: newPath });
      }

      // Track successful voice generation with the same details as prayer generation
      if (typeof trackEvent === "function") {
        // Get the current language from context
        const currentLanguage = language || "en";
        const languageMap = {
          en: "English",
          es: "Spanish",
          pt: "Portuguese",
          fr: "French",
          hi: "Hindi",
          id: "Indonesian",
          de: "German",
          ar: "Arabic",
          la: "Latin",
        };
        const languageName = languageMap[currentLanguage] || "English";

        trackEvent("Prayer Voice Generated", {
          prayer_id: prayer.id,
          prayer_length: prayer.text.length,
          language: languageName,
          religion: religion,
          is_generated_prayer: prayer.isGenerated ? "yes" : "no",
          prompt: params.prayerPrompt || "", // Store the religion-specific prompt
          generated_text: prayer.text, // Store the generated prayer text
        });
      }
    } catch (err) {
      console.error("Failed to generate voice:", err);

      // Track the error with Mixpanel
      if (typeof trackEvent === "function") {
        trackEvent("Prayer Voice Generation Error", {
          error_type: "EXCEPTION",
          error_message: err.message || "Unknown error",
          prayer_id: prayer.id,
          prayer_length: prayer.text.length,
          language: language || "en",
          religion: religion,
        });
      }

      throw err;
    } finally {
      setIsGeneratingVoice(false);
    }
  }

  async function playGeneratedSound() {
    try {
      if (!currentPrayer?.generatedAudioPath) return;

      // If currently playing, pause it
      if (generatedSound && isGeneratedPlaying) {
        await generatedSound.pauseAsync();
        setIsGeneratedPlaying(false);
        return;
      }

      // If we have a sound object (paused or finished), try to play/replay it
      if (generatedSound) {
        // Get the current status to check if it's finished
        const status = await generatedSound.getStatusAsync();

        // If the sound has finished playing, reset it to the beginning
        if (
          status.isLoaded &&
          status.positionMillis === status.durationMillis
        ) {
          await generatedSound.setPositionAsync(0);
        }

        // Play/resume the sound
        await generatedSound.playAsync();
        setIsGeneratedPlaying(true);
        return;
      }

      // If no sound loaded yet, create and play new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentPrayer.generatedAudioPath },
        {
          shouldPlay: true,
          progressUpdateIntervalMillis: 1000,
        }
      );
      setGeneratedSound(newSound);
      setIsGeneratedPlaying(true);

      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsGeneratedPlaying(false);
        }
      });
    } catch (err) {
      console.error("Failed to play generated sound", err);

      // Track audio playback errors
      if (typeof trackEvent === "function" && currentPrayer) {
        trackEvent("Prayer Voice Playback Error", {
          error_message: err instanceof Error ? err.message : "Unknown error",
          prayer_id: currentPrayer.id,
          has_generated_audio: !!currentPrayer.generatedAudioPath,
          language: language || "en",
          religion: religion,
        });
      }
    }
  }

  const generateAndSavePrayer = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const names = JSON.parse(params.names || "[]");
      const intentions = JSON.parse(params.intentions || "[]");
      const instructions = params.dailyVerse
        ? `${params.dailyVerse}\n\n${params.instructions || ""}`
        : params.instructions || "";

      // Get user's selected language from params or AsyncStorage
      let userLanguage = params.language;

      // If language isn't passed in params, try to get it from AsyncStorage
      if (!userLanguage) {
        try {
          userLanguage = (await AsyncStorage.getItem("appLanguage")) || "en";
        } catch (err) {
          console.error("Error getting language from AsyncStorage:", err);
          userLanguage = "en"; // Default to English if there's an error
        }
      }

      // Map the language code to full language name
      const languageMap = {
        en: "English",
        es: "Spanish",
        pt: "Portuguese",
        fr: "French",
        hi: "Hindi",
        id: "Indonesian",
        de: "German",
        ar: "Arabic",
        la: "Latin",
      };

      const languageName = languageMap[userLanguage] || "English";

      // Get the religion-specific prompt that was passed from the previous screen
      const religionPrompt = params.prayerPrompt || "";

      const namesString = names.join(", ");
      const intentionsString = intentions.join(", ");

      // Add language instruction to the prompt
      const languageInstruction =
        userLanguage === "en"
          ? "Generate this prayer in English."
          : userLanguage === "es"
          ? "Genera esta oración en español."
          : userLanguage === "pt"
          ? "Gere esta oração em português."
          : userLanguage === "fr"
          ? "Générez cette prière en français."
          : userLanguage === "hi"
          ? "इस प्रार्थना को हिंदी में बनाएं।"
          : userLanguage === "id"
          ? "Buatlah doa ini dalam bahasa Indonesia."
          : userLanguage === "de"
          ? "Erstellen Sie dieses Gebet auf Deutsch."
          : userLanguage === "ar"
          ? "قم بإنشاء هذه الصلاة باللغة العربية."
          : userLanguage === "la"
          ? "Hanc orationem in Latina lingua crea."
          : "Generate this prayer in English.";

      const prompt = `
        ${religionPrompt}
        
        Personas: ${namesString}
        Intenciones: ${intentionsString}
        Instrucciones adicionales: ${instructions}
        
        ${languageInstruction}
      `;

      console.log("Generating prayer with prompt:", prompt);

      // Use the new API endpoint
      const response = await fetch(
        "https://realtime-3d-server.fly.dev/api/generate-prayer",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: prompt,
            language: languageName,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.prayer;

      if (!generatedText) {
        throw new Error("No prayer was generated");
      }

      // Create new prayer object
      const newPrayer: SavedPrayer = {
        id: Date.now(),
        text: generatedText,
        audioPath: null,
        generatedAudioPath: null,
        createdAt: Date.now(),
        isGenerated: true,
      };

      // Save to local storage
      const savedPrayers = await AsyncStorage.getItem("savedPrayers");
      const prayers: SavedPrayer[] = savedPrayers
        ? JSON.parse(savedPrayers)
        : [];
      prayers.push(newPrayer);
      await AsyncStorage.setItem("savedPrayers", JSON.stringify(prayers));

      // Track prayer generation event with enhanced properties
      if (typeof trackEvent === "function") {
        trackEvent("Prayer Generated OpenAI", {
          prayer_id: newPrayer.id,
          prayer_length: generatedText.length,
          prompt: prompt, // Store the full prompt sent to the backend
          generated_text: generatedText, // Store the full response from OpenAI
          language: languageName, // Store the language used
          religion_prompt: religionPrompt, // Store the religion-specific prompt
          religion: religion, // Add the selected religion from context
          input_method: params.inputMethod || "text", // Add this line to include input method
        });
      }

      // Set the current prayer first
      setCurrentPrayer(newPrayer);

      // Now generate the voice with the new prayer text
      try {
        await generateVoice(newPrayer);
      } catch (voiceErr) {
        console.error("Error generating voice:", voiceErr);

        // We're already tracking the specific error in generateVoice,
        // but we can track that voice generation failed during prayer creation
        if (typeof trackEvent === "function") {
          trackEvent("Prayer Creation Voice Generation Failed", {
            prayer_id: newPrayer.id,
            language: languageName,
            religion: religion,
          });
        }

        // Don't throw here, we still want to keep the prayer even if voice generation fails
      }
    } catch (err) {
      console.error("Error generating prayer:", err);
      setError("Failed to generate prayer. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ImageBackground
      source={Images.BlurBackground}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.container}>
        {!currentPrayer && isGenerating ? (
          <View style={styles.loadingContainer}>
            <Image source={Images.Loading} style={styles.img} />
          </View>
        ) : !currentPrayer ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {error || t("could_not_load_prayer")}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.retryButtonText}>{t("back")}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.headerContainer}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Icons.BackIcon width={24} height={24} />
              </TouchableOpacity>
              <Text style={styles.title}>
                {currentPrayer.isGenerated
                  ? t("generated_prayer")
                  : t("prayer")}
              </Text>

              <TouchableOpacity
                onPress={() => {
                  if (currentPrayer) {
                    const textToShare = `${currentPrayer.text}\n\nbendiga.app`;
                    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(
                      textToShare
                    )}`;

                    if (typeof trackEvent === "function") {
                      trackEvent("Prayer WhatsApp Share", {
                        action: "share_prayer_whatsapp",
                        prayer_id: currentPrayer.id,
                        prayer_length: currentPrayer.text?.length || 0,
                        is_generated_prayer: currentPrayer.isGenerated
                          ? "yes"
                          : "no",
                      });
                    }

                    Linking.openURL(whatsappUrl).catch((err) => {
                      console.error("Error opening WhatsApp:", err);
                      alert("WhatsApp is not installed on your device");
                    });
                  }
                }}
              >
                <Icons.Whatsapp />
              </TouchableOpacity>
            </View>

            <View style={styles.prayerWrapper}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.prayerContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.prayerScrollContent}
                onContentSizeChange={(width, height) =>
                  handleContentSizeChange(width, height)
                }
                onScroll={handleScroll}
                onLayout={handleLayout}
                scrollEventThrottle={16}
              >
                <Text style={styles.prayerText}>{currentPrayer.text}</Text>
              </ScrollView>

              {/* Custom scroll indicator */}
              <View style={styles.scrollIndicatorMainCont}>
                {isContentScrollable && (
                  <View style={styles.scrollIndicatorCont}>
                    <View
                      style={[
                        styles.scrollIndicator,
                        {
                          height: scrollIndicatorHeight,
                          top: scrollIndicatorPosition,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.buttonContainer}>
              {/* Share audio button - only if generatedAudioPath exists */}
              {currentPrayer.generatedAudioPath && (
                <TouchableOpacity
                  style={styles.bookmarkButton}
                  onPress={async () => {
                    try {
                      if (typeof trackEvent === "function") {
                        trackEvent("Prayer Voice Share", {
                          action: "share_prayer_voice",
                          prayer_id: currentPrayer?.id,
                          prayer_length: currentPrayer?.text?.length || 0,
                          is_generated_prayer: currentPrayer?.isGenerated
                            ? "yes"
                            : "no",
                          has_generated_audio:
                            !!currentPrayer?.generatedAudioPath,
                        });
                      }

                      if (await Sharing.isAvailableAsync()) {
                        await Sharing.shareAsync(
                          currentPrayer.generatedAudioPath || "",
                          {
                            mimeType: "audio/mp3",
                            dialogTitle: t("share_prayer_audio"),
                            UTI: "public.mp3",
                          }
                        );
                      } else {
                        alert(t("sharing_not_available"));
                      }
                    } catch (error) {
                      console.error("Error sharing audio:", error);
                      alert(t("error_sharing"));
                    }
                  }}
                >
                  <Icons.Share />
                </TouchableOpacity>
              )}

              {/* AI Voice Generation Button - Only show if we have a prayer and not already generated */}
              {currentPrayer &&
                !currentPrayer.generatedAudioPath &&
                (isGeneratingVoice ? (
                  <View style={styles.generatingContainer}>
                    <Text style={styles.generatingText}>
                      Generating audio . . .
                    </Text>
                    <View style={styles.bookmarkButton}>
                      <AnimatedGenerateIcon isAnimating={true} />
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.voiceButton}
                    onPress={() => generateVoice(currentPrayer)}
                  >
                    <MaterialCommunityIcons
                      name="account-voice"
                      size={24}
                      color="white"
                    />
                  </TouchableOpacity>
                ))}

              {/* Play Generated Audio Button - Only show if we have generated audio */}
              {currentPrayer && currentPrayer.generatedAudioPath && (
                <TouchableOpacity
                  style={styles.bookmarkButton}
                  onPress={playGeneratedSound}
                >
                  {isGeneratedPlaying ? (
                    <Icons.Pause width={24} height={24} />
                  ) : (
                    <Icons.Play />
                  )}
                </TouchableOpacity>
              )}

              {/* Bookmark Button - Only show if we have generated audio */}
              {currentPrayer && currentPrayer.generatedAudioPath && (
                <TouchableOpacity
                  style={styles.bookmarkButton}
                  onPress={async () => {
                    try {
                      // Toggle bookmark status
                      const newBookmarkStatus = !isBookmarked;
                      setIsBookmarked(newBookmarkStatus);

                      // Update prayer in AsyncStorage
                      const savedPrayers = await AsyncStorage.getItem(
                        "savedPrayers"
                      );
                      if (savedPrayers) {
                        const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
                        const updatedPrayers = prayers.map((p) =>
                          p.id === currentPrayer.id
                            ? { ...p, isBookmarked: newBookmarkStatus }
                            : p
                        );
                        await AsyncStorage.setItem(
                          "savedPrayers",
                          JSON.stringify(updatedPrayers)
                        );

                        // Update current prayer state
                        setCurrentPrayer({
                          ...currentPrayer,
                          isBookmarked: newBookmarkStatus,
                        });
                      }

                      // Track bookmark event
                      if (typeof trackEvent === "function") {
                        trackEvent("Prayer Bookmarked", {
                          action: newBookmarkStatus
                            ? "bookmark_prayer"
                            : "unbookmark_prayer",
                          prayer_id: currentPrayer.id,
                          prayer_length: currentPrayer.text?.length || 0,
                          is_generated_prayer: currentPrayer.isGenerated
                            ? "yes"
                            : "no",
                        });
                      }
                    } catch (error) {
                      console.error("Error updating bookmark status:", error);
                    }
                  }}
                >
                  {isBookmarked ? <Icons.FilledHeart /> : <Icons.Heart />}
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
  },
  prayerWrapper: {
    flex: 1,
    marginRight: 5,
    marginBottom: 130,

    overflow: "hidden",
    position: "relative",
  },
  prayerContainer: {
    flex: 1,
  },
  prayerScrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  prayerHeading: {
    fontSize: 16,
    fontFamily: Fonts.BOLD,
    marginBottom: 10,
    color: Colors.light.white,
  },
  prayerText: {
    fontSize: 18,
    fontFamily: Fonts.REGULAR,
    lineHeight: 28,
    color: Colors.light.white,
    textAlign: "left",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: Colors.light.transparent,
  },

  title: {
    fontSize: 20,
    color: Colors.light.white,
    textAlign: "center",
    fontFamily: Fonts.SEMI_BOLD,
  },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
  },
  shareButton: {
    width: 65,
    height: 65,
    borderRadius: 15,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4CAF50",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  voiceButton: {
    width: 65,
    height: 65,
    borderRadius: 15,
    backgroundColor: "#5856D6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  playButton: {
    width: 65,
    height: 65,
    borderRadius: 15,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#5856D6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingSphere: {
    width: 65,
    height: 65,
    borderRadius: 15,
    backgroundColor: "#5856D6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "bold",
    color: "#5856D6",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  img: { width: "100%", height: "100%" },
  errorText: {
    marginBottom: 20,
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    color: Colors.light.white,
  },
  retryButton: {
    backgroundColor: "#5856D6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  retryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  generatingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarkButton: {
    width: 65,
    height: 65,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: Colors.light.transparentBlack2,
    borderColor: Colors.light.chinieseSilverTransparent,
  },
  loadingCircle: {
    width: 65,
    height: 65,
    borderRadius: 15,
    backgroundColor: "#5856D6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#5856D6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  generatingText: {
    fontSize: 16,
    fontFamily: Fonts.BOLD,
    color: Colors.light.white,
    top: -5,
  },

  scrollIndicatorMainCont: {
    position: "absolute",
    top: 20,
    right: 8,
    alignItems: "center",
    height: "100%",
    justifyContent: "center",
  },
  scrollIndicatorCont: {
    height: "100%",
    width: 1,
    backgroundColor: Colors.light.white,
    borderRadius: 6,
    alignItems: "center",
  },
  scrollIndicator: {
    position: "absolute",
    width: 6,
    backgroundColor: Colors.light.white,
    borderRadius: 8,
  },
});
