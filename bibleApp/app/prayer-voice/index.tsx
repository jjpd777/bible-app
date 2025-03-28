import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
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

  // Define ALL hooks at the top level
  const [currentPrayer, setCurrentPrayer] = useState<SavedPrayer | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedSound, setRecordedSound] = useState<Audio.Sound | null>(null);
  const [generatedSound, setGeneratedSound] = useState<Audio.Sound | null>(null);
  const [isRecordedPlaying, setIsRecordedPlaying] = useState(false);
  const [isGeneratedPlaying, setIsGeneratedPlaying] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [checkboxes, setCheckboxes] = useState({ a: false, b: false });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

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

  // Separate cleanup for recorded sound
  useEffect(() => {
    return () => {
      if (recordedSound) recordedSound.unloadAsync();
    };
  }, [recordedSound]);

  useEffect(() => {
    return () => {
      if (generatedSound) generatedSound.unloadAsync();
    };
  }, [generatedSound]);

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      setIsRecording(false);

      const uri = recording.getURI();
      if (!uri) throw new Error('No recording URI available');

      // Delete previous recording if it exists
      if (currentPrayer?.audioPath) {
        try {
          await FileSystem.deleteAsync(currentPrayer.audioPath);
        } catch (err) {
          console.log('Error deleting previous recording:', err);
        }
      }

      const fileName = `prayer_${currentPrayer?.id}_${Date.now()}.m4a`;
      const newPath = `${FileSystem.documentDirectory}prayers/${fileName}`;

      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}prayers/`, {
        intermediates: true
      });

      await FileSystem.moveAsync({
        from: uri,
        to: newPath
      });

      // Unload previous sound if it exists
      if (recordedSound) {
        await recordedSound.unloadAsync();
        setRecordedSound(null);
        setIsRecordedPlaying(false);
      }

      const savedPrayers = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayers) {
        const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
        const updatedPrayers = prayers.map(p => 
          p.id === currentPrayer.id ? { ...p, audioPath: newPath } : p
        );
        await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
        setCurrentPrayer({ ...currentPrayer, audioPath: newPath });
      }

      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

  async function playSound() {
    try {
      if (!currentPrayer?.audioPath) return;

      // Check if file exists before trying to play it
      const fileInfo = await FileSystem.getInfoAsync(currentPrayer.audioPath);
      if (!fileInfo.exists) {
        console.log('Audio file not found');
        // Update prayer to remove invalid audio path
        const savedPrayers = await AsyncStorage.getItem('savedPrayers');
        if (savedPrayers) {
          const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
          const updatedPrayers = prayers.map(p => 
            p.id === currentPrayer.id ? { ...p, audioPath: null } : p
          );
          await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
          setCurrentPrayer({ ...currentPrayer, audioPath: null });
        }
        return;
      }

      if (recordedSound) {
        if (isRecordedPlaying) {
          await recordedSound.stopAsync();
          await recordedSound.unloadAsync();
          setRecordedSound(null);
          setIsRecordedPlaying(false);
        } else {
          await recordedSound.unloadAsync();
          setRecordedSound(null);
          createAndPlaySound();
        }
      } else {
        createAndPlaySound();
      }
    } catch (err) {
      console.error('Failed to play sound', err);
      // If there's an error, clean up the invalid audio path
      const savedPrayers = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayers) {
        const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
        const updatedPrayers = prayers.map(p => 
          p.id === currentPrayer.id ? { ...p, audioPath: null } : p
        );
        await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
        setCurrentPrayer({ ...currentPrayer, audioPath: null });
      }
    }
  }

  // Helper function to create and play sound
  async function createAndPlaySound() {
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: currentPrayer.audioPath },
      { shouldPlay: true }
    );
    setRecordedSound(newSound);
    setIsRecordedPlaying(true);

    newSound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.didJustFinish) {
        setIsRecordedPlaying(false);
        await newSound.unloadAsync();
        setRecordedSound(null);
      }
    });
  }

  async function generateVoice(prayer: SavedPrayer) {
    setIsGeneratingVoice(true);
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

  const handleRecordPress = () => {
    // Track microphone interaction
    if (typeof trackEvent === 'function') {
      trackEvent('Prayer Voice Microphone', {
        action: isRecording ? 'stop_recording' : 'start_recording',
        prayer_id: currentPrayer?.id,
        prayer_length: currentPrayer?.text?.length || 0,
        is_generated_prayer: currentPrayer?.isGenerated ? 'yes' : 'no'
      });
    }
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const generateAndSavePrayer = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const names = JSON.parse(params.names || '[]');
      const intentions = JSON.parse(params.intentions || '[]');
      const instructions = params.dailyVerse 
        ? `${params.dailyVerse}\n\n${params.instructions || ''}`
        : (params.instructions || '');
      
      // Get user's selected language from params
      const userLanguage = params.language || 'en';
      
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
                  : 'Generate this prayer in English.';
      
      const prompt = `
        ${religionPrompt}
        
        Personas: ${namesString}
        Intenciones: ${intentionsString}
        Instrucciones adicionales: ${instructions}
        
        ${languageInstruction}
      `;

      console.log('Generating prayer with prompt:', prompt);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Constants.expoConfig?.extra?.OPENAI_API_KEY || ''}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: `You are a prayer generator. Always respond in ${userLanguage} language.` },
            { role: "user", content: prompt }
          ],
          temperature: 0.9
        })
      });

      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content;

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

      // Track prayer generation event
      if (typeof trackEvent === 'function') {
        trackEvent('Prayer Generated OpenAI', {
          prayer_id: newPrayer.id,
          prayer_length: generatedText.length,
          has_names: names.length > 0,
          has_intentions: intentions.length > 0,
          has_instructions: !!instructions,
          has_daily_verse: !!params.dailyVerse
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

  // Add this function to toggle bookmark
  const toggleBookmark = async () => {
    if (!currentPrayer) return;
    
    try {
      const newBookmarkStatus = !isBookmarked;
      setIsBookmarked(newBookmarkStatus);
      
      // Track bookmark event
      if (typeof trackEvent === 'function') {
        trackEvent('Prayer Bookmark', {
          action: newBookmarkStatus ? 'bookmark' : 'unbookmark',
          prayer_id: currentPrayer.id,
          prayer_length: currentPrayer.text?.length || 0,
          is_generated_prayer: currentPrayer.isGenerated ? 'yes' : 'no'
        });
      }
      
      // Update in AsyncStorage
      const savedPrayers = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayers) {
        const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
        const updatedPrayers = prayers.map(p => 
          p.id === currentPrayer.id ? { ...p, isBookmarked: newBookmarkStatus } : p
        );
        await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
        
        // Update current prayer state
        setCurrentPrayer({ ...currentPrayer, isBookmarked: newBookmarkStatus });
      }
    } catch (err) {
      console.error('Error toggling bookmark:', err);
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
            
            {/* Add bookmark button */}
            <TouchableOpacity 
              onPress={toggleBookmark}
              style={styles.bookmarkButton}
            >
              <Ionicons 
                name={isBookmarked ? "bookmark" : "bookmark-outline"} 
                size={24} 
                color="#5856D6" 
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.prayerContainer}>
            <View style={styles.prayerContentContainer}>
              <Text style={styles.prayerText}>{currentPrayer.text}</Text>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.iconButton, isRecording && styles.activeButton]} 
              onPress={handleRecordPress}
            >
              <Ionicons 
                name={isRecording ? "mic-off" : "mic"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>

            {/* Play recorded audio button - only if audioPath exists */}
            {currentPrayer.audioPath && !isRecording && (
              <TouchableOpacity 
                style={[styles.iconButton, styles.secondaryButton]} 
                onPress={playSound}
              >
                <Ionicons 
                  name={isRecordedPlaying ? "pause" : "play"} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
            )}

            {/* Share button - ONLY if audioPath exists */}
            {currentPrayer.audioPath && (
              <TouchableOpacity 
                style={[
                  styles.iconButton, 
                  { backgroundColor: '#4CAF50' },
                  isProcessing && styles.disabledButton
                ]} 
                onPress={async () => {
                  if (isProcessing) return;
                  
                  // Track share button press
                  if (typeof trackEvent === 'function') {
                    trackEvent('Prayer Voice Share', {
                      action: 'share_prayer_voice',
                      prayer_id: currentPrayer?.id,
                      prayer_length: currentPrayer?.text?.length || 0,
                      is_generated_prayer: currentPrayer?.isGenerated ? 'yes' : 'no',
                      has_recording: !!currentPrayer?.audioPath,
                      has_generated_audio: !!currentPrayer?.generatedAudioPath
                    });
                  }
                  
                  setIsProcessing(true);
                  const formData = new FormData();
                  
                  if (currentPrayer.audioPath) {
                    formData.append('recordedSound', {
                      uri: currentPrayer.audioPath,
                      type: 'audio/m4a',
                      name: 'recorded_audio.m4a'
                    });
                  }
                  
                  if (currentPrayer.generatedAudioPath) {
                    formData.append('generatedSound', {
                      uri: currentPrayer.generatedAudioPath,
                      type: 'audio/mp3',
                      name: 'generated_audio.mp3'
                    });
                  }

                  try {
                    const response = await fetch(prodBackend +'/api/uploadAudio', {
                      method: 'POST',
                      body: formData,
                      headers: {
                        'Content-Type': 'multipart/form-data',
                      },
                    });
                    
                    if (!response.ok) throw new Error('Upload failed');
                    const responseData = await response.json();
                    console.log('Storage URL:', responseData);

                    // Get Firebase download URL
                    const imageRef = ref(storage, responseData.url.replace('gs://bendiga-4d926.firebasestorage.app/', ''));
                    const downloadURL = await getDownloadURL(imageRef);

                    // Create asset from URL
                    const asset = await Asset.fromURI(downloadURL);
                    await asset.downloadAsync();

                    // Share the asset
                    if (await Sharing.isAvailableAsync()) {
                      await Sharing.shareAsync(asset.localUri!, {
                        mimeType: 'audio/mp3',
                        dialogTitle: 'Share Combined Audio',
                        UTI: 'public.mp3'
                      });
                    }
                  } catch (error) {
                    console.error('Error uploading files:', error);
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
              >
                <Ionicons 
                  name={isProcessing ? "timer-outline" : "cloud-upload"} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
            )}

            {/* AI Voice Generation Button - Only show if we have a prayer and not already generated */}
            {currentPrayer && !currentPrayer.generatedAudioPath && (
              <>
                <TouchableOpacity 
                  style={[
                    styles.iconButton, 
                    isGeneratingVoice && styles.disabledButton
                  ]} 
                  onPress={() => generateVoice(currentPrayer)}
                  disabled={isGeneratingVoice}
                >
                  <View style={styles.buttonContentRow}>
                    {isGeneratingVoice ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <MaterialCommunityIcons 
                        name="account-voice" 
                        size={24} 
                        color="white" 
                      />
                    )}
                  </View>
                </TouchableOpacity>
                {isGeneratingVoice && (
                  <Text style={styles.generatingText}>{t('generating_audio')}</Text>
                )}
              </>
            )}

            {/* Play Generated Audio Button - Only show if we have generated audio */}
            {currentPrayer && currentPrayer.generatedAudioPath && (
              <TouchableOpacity 
                style={[styles.iconButton]} 
                onPress={playGeneratedSound}
              >
                <Ionicons 
                  name={isGeneratedPlaying ? "pause" : "play"} 
                  size={24} 
                  color="white" 
                />
              </TouchableOpacity>
            )}
          </View>

          {isModalVisible && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>¿Qué deseas compartir?</Text>
                
                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setCheckboxes(prev => ({ ...prev, a: !prev.a }))}
                >
                  <View style={[styles.checkbox, checkboxes.a && styles.checkboxChecked]}>
                    {checkboxes.a && <Ionicons name="checkmark" size={16} color="white" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Oración de I.A.</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.checkboxContainer}
                  onPress={() => setCheckboxes(prev => ({ ...prev, b: !prev.b }))}
                >
                  <View style={[styles.checkbox, checkboxes.b && styles.checkboxChecked]}>
                    {checkboxes.b && <Ionicons name="checkmark" size={16} color="white" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Grabación tuya</Text>
                </TouchableOpacity>

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.modalButton}
                    onPress={() => setIsModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Close</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.modalButton}
                  >
                    <Text style={styles.modalButtonText}>Compartir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  prayerContainer: {
    maxHeight: '50%',
    marginTop: 16,
    marginBottom: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  prayerContentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  prayerText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  audioStatus: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  audioStatusText: {
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
  secondaryButton: {
    backgroundColor: '#5856D6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',  // Center horizontally
    alignItems: 'center',      // Center vertically
    gap: 20,                   // Space between buttons
    marginTop: 20,
    position: 'absolute',      // Position at bottom of screen
    bottom: 40,               // Distance from bottom
    left: 0,
    right: 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingTop:22,
    paddingHorizontal: 16,
    position: 'relative',
    marginTop: 20,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    padding: 8,
    paddingTop:32,
    zIndex: 1
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5856D6',
    textAlign: 'center',
  },
  iconButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: '#FF3B30',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  generatePrayerButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  generatePrayerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  generatedPrayerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
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
  },
  errorText: {
    marginBottom: 20,
    fontSize: 16,
    fontWeight: 'bold',
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
  generatingText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  bookmarkButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
    paddingTop: 32,
    zIndex: 1
  },
});
