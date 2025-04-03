import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import { ref, getDownloadURL } from 'firebase/storage';
import { Asset } from 'expo-asset';
import { storage } from '../../config/firebase';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLanguage } from '@/contexts/LanguageContext';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { useReligion } from '@/contexts/ReligionContext';

interface SavedPrayer {
  id: number;
  text: string;
  audioPath: string | null;
  generatedAudioPath: string | null;
  createdAt: number;
  isGenerated: boolean;
  isBookmarked?: boolean;
}

export default function PrayerVoiceView() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    prayer?: string,
    names?: string,
    intentions?: string,
    instructions?: string,
    dailyVerse?: string;
    isNewGeneration?: string;
    language?: string;
    prayerPrompt?: string;
  }>();

  const { trackEvent } = useAnalytics();
  const { language, t } = useLanguage();
  const { religion } = useReligion();

  // Define ALL hooks at the top level
  const [currentPrayer, setCurrentPrayer] = useState<SavedPrayer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loadingDots, setLoadingDots] = useState('');

  // Add animation values for the loading sphere
  const translateY = useSharedValue(0);
  
  // Set up the animation when component mounts
  useEffect(() => {
    translateY.value = withRepeat(
      withTiming(-15, { 
        duration: 1000,
        easing: Easing.inOut(Easing.ease)
      }),
      -1, // Infinite repetitions
      true // Reverse on each iteration
    );
  }, []);
  
  // Add loading dots animation
  useEffect(() => {
    if (isGeneratingVoice) {
      const interval = setInterval(() => {
        setLoadingDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [isGeneratingVoice]);
  
  // Create the animated style
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  // Use a single useEffect for initialization
  useEffect(() => {
    const initializePrayer = async () => {
      try {
        if (params.prayer) {
          setCurrentPrayer(JSON.parse(params.prayer));
        } else if (params.isNewGeneration === 'true') {
          await generateAndSavePrayer();
        }
      } catch (err) {
        console.error('Error initializing prayer:', err);
        setError('Failed to initialize prayer');
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

  const names = JSON.parse(params.names || '[]');
  const intentions = JSON.parse(params.intentions || '[]');
  const instructions = params.dailyVerse 
    ? `${params.dailyVerse}\n\n${params.instructions || ''}`
    : (params.instructions || '');
    
  const prodBackend = true ? "https://bendiga-media-backend.replit.app" : "https://0cb3df08-f19f-4e55-add7-4513e781f46c-00-2lvwkm65uqcmj.spock.replit.dev"; 

  // Keep only the generated sound states
  const [generatedSound, setGeneratedSound] = useState<Audio.Sound | null>(null);
  const [isGeneratedPlaying, setIsGeneratedPlaying] = useState(false);

  // Keep only the useEffect for generated sound
  useEffect(() => {
    return () => {
      if (generatedSound) generatedSound.unloadAsync();
    };
  }, [generatedSound]);

  async function generateVoice(prayer: SavedPrayer) {
    setIsGeneratingVoice(true);
    setLoadingDots('');
    try {
      const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/l1zE9xgNpUTaQCZzpNJa',
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': Constants.expoConfig?.extra?.ELEVEN_LABS_KEY_PROD || '',
          },
          body: JSON.stringify({
            text: prayer.text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.3,
              similarity_boost: 0.85,
              style: 0.2,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response status:', response.status);
        console.error('Response headers:', response.headers);
        console.error('Error details:', errorText);
        throw new Error(`Failed to generate audio: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      const reader = new FileReader();
      const base64Audio = await new Promise((resolve) => {
        reader.onload = () => {
          const base64 = reader.result?.toString().split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      // Delete previous generated audio if it exists
      if (prayer.generatedAudioPath) {
        try {
          await FileSystem.deleteAsync(prayer.generatedAudioPath);
        } catch (err) {
          console.log('Error deleting previous generated audio:', err);
        }
      }

      const fileName = `prayer_${prayer.id}_generated_${Date.now()}.mp3`;
      const newPath = `${FileSystem.documentDirectory}prayers/${fileName}`;

      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}prayers/`, {
        intermediates: true
      });

      await FileSystem.writeAsStringAsync(newPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Update the prayer with the new generatedAudioPath
      const savedPrayers = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayers) {
        const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
        const updatedPrayers = prayers.map(p => 
          p.id === prayer.id ? { ...p, generatedAudioPath: newPath } : p
        );
        await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
        setCurrentPrayer({ ...prayer, generatedAudioPath: newPath });
      }

      // Track successful voice generation with the same details as prayer generation
      if (typeof trackEvent === 'function') {
        // Get the current language from context
        const currentLanguage = language || 'en';
        const languageMap = {
          'en': 'English',
          'es': 'Spanish',
          'pt': 'Portuguese',
          'fr': 'French',
          'hi': 'Hindi',
          'id': 'Indonesian',
          'de': 'German',
          'ar': 'Arabic',
          'la': 'Latin'
        };
        const languageName = languageMap[currentLanguage] || 'English';
        
        trackEvent('Prayer Voice Generated', {
          prayer_id: prayer.id,
          prayer_length: prayer.text.length,
          language: languageName,
          religion: religion,
          is_generated_prayer: prayer.isGenerated ? 'yes' : 'no',
          prompt: params.prayerPrompt || '', // Store the religion-specific prompt
          generated_text: prayer.text // Store the generated prayer text
        });
      }

    } catch (err) {
      console.error('Failed to generate voice:', err);
      console.error('API Key present:', !!Constants.expoConfig?.extra?.ELEVEN_LABS_KEY_PROD);
      console.error('Prayer text length:', prayer.text.length);
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

      // If we have a paused sound, resume it
      if (generatedSound && !isGeneratedPlaying) {
        await generatedSound.playAsync();
        setIsGeneratedPlaying(true);
        return;
      }

      // If no sound loaded yet, create and play new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentPrayer.generatedAudioPath },
        { shouldPlay: true }
      );
      setGeneratedSound(newSound);
      setIsGeneratedPlaying(true);

      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          setIsGeneratedPlaying(false);
        }
      });
    } catch (err) {
      console.error('Failed to play generated sound', err);
    }
  }

  const generateAndSavePrayer = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const names = JSON.parse(params.names || '[]');
      const intentions = JSON.parse(params.intentions || '[]');
      const instructions = params.dailyVerse 
        ? `${params.dailyVerse}\n\n${params.instructions || ''}`
        : (params.instructions || '');
      
      // Get user's selected language from params or AsyncStorage
      let userLanguage = params.language;
      
      // If language isn't passed in params, try to get it from AsyncStorage
      if (!userLanguage) {
        try {
          userLanguage = await AsyncStorage.getItem('appLanguage') || 'en';
        } catch (err) {
          console.error('Error getting language from AsyncStorage:', err);
          userLanguage = 'en'; // Default to English if there's an error
        }
      }
      
      // Map the language code to full language name
      const languageMap = {
        'en': 'English',
        'es': 'Spanish',
        'pt': 'Portuguese',
        'fr': 'French',
        'hi': 'Hindi',
        'id': 'Indonesian',
        'de': 'German',
        'ar': 'Arabic',
        'la': 'Latin'
      };
      
      const languageName = languageMap[userLanguage] || 'English';
      
      // Get the religion-specific prompt that was passed from the previous screen
      const religionPrompt = params.prayerPrompt || '';

      const namesString = names.join(', ');
      const intentionsString = intentions.join(', ');
      
      // Add language instruction to the prompt
      const languageInstruction = userLanguage === 'en' 
        ? 'Generate this prayer in English.' 
        : userLanguage === 'es' 
          ? 'Genera esta oración en español.'
          : userLanguage === 'pt'
            ? 'Gere esta oração em português.'
            : userLanguage === 'fr'
              ? 'Générez cette prière en français.'
              : userLanguage === 'hi'
                ? 'इस प्रार्थना को हिंदी में बनाएं।'
                : userLanguage === 'id'
                  ? 'Buatlah doa ini dalam bahasa Indonesia.'
                  : userLanguage === 'de'
                    ? 'Erstellen Sie dieses Gebet auf Deutsch.'
                    : userLanguage === 'ar'
                      ? 'قم بإنشاء هذه الصلاة باللغة العربية.'
                      : userLanguage === 'la'
                        ? 'Hanc orationem in Latina lingua crea.'
                        : 'Generate this prayer in English.';
      
      const prompt = `
        ${religionPrompt}
        
        Personas: ${namesString}
        Intenciones: ${intentionsString}
        Instrucciones adicionales: ${instructions}
        
        ${languageInstruction}
      `;

      console.log('Generating prayer with prompt:', prompt);

      // Use the new API endpoint
      const response = await fetch('https://realtime-3d-server.fly.dev/api/generate-prayer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          language: languageName
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.prayer;

      if (!generatedText) {
        throw new Error('No prayer was generated');
      }

      // Create new prayer object
      const newPrayer: SavedPrayer = {
        id: Date.now(),
        text: generatedText,
        audioPath: null,
        generatedAudioPath: null,
        createdAt: Date.now(),
        isGenerated: true
      };

      // Save to local storage
      const savedPrayers = await AsyncStorage.getItem('savedPrayers');
      const prayers: SavedPrayer[] = savedPrayers ? JSON.parse(savedPrayers) : [];
      prayers.push(newPrayer);
      await AsyncStorage.setItem('savedPrayers', JSON.stringify(prayers));

      // Track prayer generation event with enhanced properties
      if (typeof trackEvent === 'function') {
        trackEvent('Prayer Generated OpenAI', {
          prayer_id: newPrayer.id,
          prayer_length: generatedText.length,
          prompt: prompt, // Store the full prompt sent to the backend
          generated_text: generatedText, // Store the full response from OpenAI
          language: languageName, // Store the language used
          religion_prompt: religionPrompt, // Store the religion-specific prompt
          religion: religion // Add the selected religion from context
        });
      }

      // Set the current prayer first
      setCurrentPrayer(newPrayer);

      // Now generate the voice with the new prayer text
      try {
        await generateVoice(newPrayer);
      } catch (voiceErr) {
        console.error('Error generating voice:', voiceErr);
        // Don't throw here, we still want to keep the prayer even if voice generation fails
      }

    } catch (err) {
      console.error('Error generating prayer:', err);
      setError('Failed to generate prayer. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      {!currentPrayer && isGenerating ? (
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingSphere, animatedStyle]} />
          <Text style={styles.loadingText}>{t('generating_prayer')}</Text>
        </View>
      ) : !currentPrayer ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {error || t('could_not_load_prayer')}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>{t('back')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#5856D6" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {currentPrayer.isGenerated ? t('generated_prayer') : t('prayer')}
            </Text>
            
            <TouchableOpacity 
              onPress={() => {
                if (currentPrayer) {
                  const textToShare = `${currentPrayer.text}\n\nbendiga.app`;
                  const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(textToShare)}`;
                  
                  if (typeof trackEvent === 'function') {
                    trackEvent('Prayer WhatsApp Share', {
                      action: 'share_prayer_whatsapp',
                      prayer_id: currentPrayer.id,
                      prayer_length: currentPrayer.text?.length || 0,
                      is_generated_prayer: currentPrayer.isGenerated ? 'yes' : 'no'
                    });
                  }
                  
                  Linking.openURL(whatsappUrl).catch(err => {
                    console.error('Error opening WhatsApp:', err);
                    alert('WhatsApp is not installed on your device');
                  });
                }
              }}
              style={styles.whatsappButton}
            >
              <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            </TouchableOpacity>
          </View>

          <View style={styles.prayerWrapper}>
            <ScrollView 
              style={styles.prayerContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.prayerScrollContent}
            >
              <Text style={styles.prayerText}>{currentPrayer.text}</Text>
            </ScrollView>
          </View>

          <View style={styles.buttonContainer}>
            {/* Share audio button - only if generatedAudioPath exists */}
            {currentPrayer.generatedAudioPath && (
              <TouchableOpacity 
                style={styles.shareButton} 
                onPress={async () => {
                  try {
                    if (typeof trackEvent === 'function') {
                      trackEvent('Prayer Voice Share', {
                        action: 'share_prayer_voice',
                        prayer_id: currentPrayer?.id,
                        prayer_length: currentPrayer?.text?.length || 0,
                        is_generated_prayer: currentPrayer?.isGenerated ? 'yes' : 'no',
                        has_generated_audio: !!currentPrayer?.generatedAudioPath
                      });
                    }
                    
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(currentPrayer.generatedAudioPath, {
                        mimeType: 'audio/mp3',
                        dialogTitle: t('share_prayer_audio'),
                        UTI: 'public.mp3'
                      });
                    } else {
                      alert(t('sharing_not_available'));
                    }
                  } catch (error) {
                    console.error('Error sharing audio:', error);
                    alert(t('error_sharing'));
                  }
                }}
              >
                <Ionicons name="share-outline" size={24} color="#4CAF50" />
              </TouchableOpacity>
            )}

            {/* AI Voice Generation Button - Only show if we have a prayer and not already generated */}
            {currentPrayer && !currentPrayer.generatedAudioPath && (
              isGeneratingVoice ? (
                <View style={styles.generatingContainer}>
                  <Text style={styles.generatingEmojis}>🎵✨</Text>
                  <Text style={styles.generatingText}>
                    {loadingDots}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.voiceButton}
                  onPress={() => generateVoice(currentPrayer)}
                >
                  <MaterialCommunityIcons name="account-voice" size={24} color="white" />
                </TouchableOpacity>
              )
            )}

            {/* Play Generated Audio Button - Only show if we have generated audio */}
            {currentPrayer && currentPrayer.generatedAudioPath && (
              <TouchableOpacity 
                style={styles.playButton} 
                onPress={playGeneratedSound}
              >
                <Ionicons 
                  name={isGeneratedPlaying ? "pause" : "play"} 
                  size={24} 
                  color="#5856D6" 
                />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  prayerWrapper: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 130,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#5856D6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  prayerContainer: {
    flex: 1,
  },
  prayerScrollContent: {
    padding: 24,
  },
  prayerText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#333',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 50,
    padding: 8,
    zIndex: 1
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#5856D6',
    textAlign: 'center',
  },
  whatsappButton: {
    position: 'absolute',
    right: 16,
    top: 50,
    padding: 8,
    zIndex: 1
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
  },
  shareButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  voiceButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#5856D6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#5856D6',
    shadowColor: '#000',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSphere: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5856D6',
    marginBottom: 20,
    shadowColor: '#000',
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
    fontWeight: 'bold',
    color: '#5856D6',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginBottom: 20,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  generatingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(88, 86, 214, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    minWidth: 120,
    height: 50,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  generatingEmojis: {
    fontSize: 16,
    marginRight: 6,
  },
  generatingText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
