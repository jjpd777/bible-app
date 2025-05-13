import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Alert, Linking, Animated, BackHandler, ScrollView, Platform, TextInput, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLanguage } from '../../contexts/LanguageContext';
import { useReligion } from '@/contexts/ReligionContext';
import { useButtonOptions } from '../../contexts/ButtonOptionsContext';
import { Audio } from 'expo-av';
import PrayerVoiceInput from '../components/PrayerVoiceInput';
import * as FileSystem from 'expo-file-system';
//

// Replace notification handler with dummy implementation
const dummyNotificationHandler = {
  handleLocalNotification: async () => {
    console.log('Local notification would be shown here');
    return true;
  },
  
  scheduleNotification: async (title, body, trigger) => {
    console.log('Would schedule notification:', { title, body, trigger });
    return 'dummy-notification-id';
  },
  
  cancelNotification: async (id) => {
    console.log('Would cancel notification with id:', id);
  }
};

// Add this function near the top of the file
const generateDailyPrayer = (names: string[], intentions: string[]) => {
  const namesString = names.map((name, index) => {
    if (index === 0) return name;
    if (index === names.length - 1) return ` and ${name}`;
    return `, ${name}`;
  }).join('');

  const intentionsString = intentions.map((intention, index) => {
    if (index === 0) return intention.toLowerCase();
    if (index === intentions.length - 1) return ` and ${intention.toLowerCase()}`;
    return `, ${intention.toLowerCase()}`;
  }).join('');

  return `Dear Heavenly Father,

Please watch over and protect ${namesString}. Guide them with Your wisdom, fill their hearts with Your love, and bless them with Your grace.${intentionsString ? `\n\nLord, I pray for ${intentionsString} in their lives.` : ''}

Help them feel Your presence in their lives today and always.

In Jesus' name,
Amen.`;
};

export default function PrayerTrackerScreen() {
  const params = useLocalSearchParams();
  console.log('Daily Verse received:', params.dailyVerse);
  const { trackEvent } = useAnalytics();

  // Track page view
  useEffect(() => {
    if (typeof trackEvent === 'function') {
      trackEvent('Page View', { page_name: 'Prayer Generation Form' });
    }
  }, [trackEvent]);

  const [selectedPrayer, setSelectedPrayer] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [completedPrayers, setCompletedPrayers] = useState<{[key: number]: boolean}>({});
  const [markedDates, setMarkedDates] = useState({
    // Test data with dates around today (Jan 4, 2025)
    '2025-01-01': { marked: true, dotColor: '#50C878' },
    '2025-01-02': { marked: true, dotColor: '#50C878' },
    '2025-01-03': { marked: true, dotColor: '#50C878' },
    '2025-01-04': { marked: true, dotColor: '#50C878' },
  });
  const [isStatsVisible, setIsStatsVisible] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const [prayerModeActive, setPrayerModeActive] = useState(false);
  const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
  const [tempCompletedPrayers, setTempCompletedPrayers] = useState<Set<string>>(new Set());
  const [showNextButton, setShowNextButton] = useState(false);
  const [wakeTime, setWakeTime] = useState<Date | null>(null);
  const [sleepTime, setSleepTime] = useState<Date | null>(null);
  const [isTimeModalVisible, setIsTimeModalVisible] = useState(false);
  const [editingTimeType, setEditingTimeType] = useState<'wake' | 'sleep' | null>(null);
  const [tempTime, setTempTime] = useState<Date | null>(null);
  const [savedPrayerNames, setSavedPrayerNames] = useState<string[]>([]);
  const [selectedPrayerFor, setSelectedPrayerFor] = useState<string[]>([]);
  const [dailyPrayer, setDailyPrayer] = useState('');
  const [isFullPrayerVisible, setIsFullPrayerVisible] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [shareStreak, setShareStreak] = useState(0);
  const [totalShares, setTotalShares] = useState(0);
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({});
 
  const [instructions, setInstructions] = useState('');
  const [isMainDropdownOpen, setIsMainDropdownOpen] = useState(false);
  const [savedPrayers, setSavedPrayers] = useState<{ prayer: string; timestamp: number }[]>([]);
  const { language, setLanguage, t } = useLanguage();
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const { getReligionEmoji, getAllReligions, religion, setReligion, getPrayerPrompt } = useReligion();
  const [isReligionDropdownVisible, setIsReligionDropdownVisible] = useState(false);
  const { getOptionsForCategory, getCategoryTitle } = useButtonOptions();
  const [inputMode, setInputMode] = useState<'text' | 'microphone'>('microphone');
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Add BackHandler effect for Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (prayerModeActive) {
        confirmExitPrayerMode();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [prayerModeActive]);

  const confirmExitPrayerMode = () => {
    Alert.alert(
      "¿Salir del modo oración?",
      "Si sales ahora, perderás el progreso de tus oraciones de hoy.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Salir",
          style: "destructive",
          onPress: () => {
            setPrayerModeActive(false);
            setCurrentPrayerIndex(0);
            setTempCompletedPrayers(new Set());
            setSelectedPrayer(null);
          }
        }
      ]
    );
  };

  // Modify handlePrayerSelect
  const handlePrayerSelect = (title: string) => {
    setPrayerModeActive(true);
    setSelectedPrayer(title);
    setCurrentPrayerIndex(prayers.findIndex(p => p.title === title));
  };

  // Add function to handle prayer completion
  const handlePrayerComplete = () => {
    if (selectedPrayer) {
      setTempCompletedPrayers(prev => new Set(prev).add(selectedPrayer));
      
      // Move to next prayer or finish prayer mode
      const nextIndex = currentPrayerIndex + 1;
      if (nextIndex < prayers.length) {
        setCurrentPrayerIndex(nextIndex);
        setSelectedPrayer(prayers[nextIndex].title);
      } else {
        // All prayers completed
        setCompletedPrayers(new Set(tempCompletedPrayers));
        setPrayerModeActive(false);
        setSelectedPrayer(null);
        
        // Update calendar if all prayers are completed
        if (tempCompletedPrayers.size === prayers.length) {
          const today = new Date().toISOString().split('T')[0];
          setMarkedDates(prev => ({
            ...prev,
            [today]: { marked: true, dotColor: '#50C878' }
          }));
          
          // Simulate sending a completion notification
          dummyNotificationHandler.handleLocalNotification();
        }
      }
    }
  };

  // Add this useEffect to fetch times when component mounts
  useEffect(() => {
    const loadOnboardingData = async () => {
      try {
        const onboardingDataString = await AsyncStorage.getItem('onboardingData');
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          setWakeTime(new Date(onboardingData.wakeTime));
          setSleepTime(new Date(onboardingData.sleepTime));
        }
      } catch (error) {
        console.error('Error loading onboarding data:', error);
      }
    };

    loadOnboardingData();
  }, []);

  // Update useEffect to also generate and save the prayer
  useFocusEffect(
    React.useCallback(() => {
      const loadPrayerData = async () => {
        try {
          // Load prayer names and intentions
          const savedPrayerNamesData = await AsyncStorage.getItem('prayerNames');
          const savedPrayerForData = await AsyncStorage.getItem('prayerFor');
          
          if (savedPrayerNamesData) {
            setSavedPrayerNames(JSON.parse(savedPrayerNamesData));
          }
          
          if (savedPrayerForData) {
            setSelectedPrayerFor(JSON.parse(savedPrayerForData));
          }
        } catch (error) {
          console.error('Error loading prayer data:', error);
        }
      };

      loadPrayerData();
    }, [])
  );

  // Add new useEffect to update prayer when dependencies change
  useEffect(() => {
    const updateDailyPrayer = async () => {
      const prayer = generateDailyPrayer(savedPrayerNames, selectedPrayerFor);
      setDailyPrayer(prayer);
      await AsyncStorage.setItem('dailyPrayer', prayer);
    };

    updateDailyPrayer();
  }, [savedPrayerNames, selectedPrayerFor]);

  // Add this helper function to format times
  const formatTime = (date: Date | null) => {
    if (!date) return { time: 'Not set', period: '' };
    const timeString = date.toLocaleTimeString('es-ES', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    const [time, period] = timeString.split(' ');
    return { time, period };
  };

  

  // Add a function to refresh prayer status
  const refreshPrayerStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const completedStatus = {};
      
      // Update the keys to match the new format
      for (let i = 1; i <= 4; i++) {
        const prayerKey = `bendiga_app_${i}_${today}`;
        const status = await AsyncStorage.getItem(prayerKey);
        completedStatus[i] = status === 'completed';
      }
      
      setCompletedPrayers(completedStatus);
    } catch (error) {
      console.error('Error refreshing prayer status:', error);
    }
  };

  // Update useFocusEffect to use the refresh function
  useFocusEffect(
    React.useCallback(() => {
      refreshPrayerStatus();
      
      // Optional: Set up an interval to refresh status periodically
      const intervalId = setInterval(refreshPrayerStatus, 5000); // Refresh every 5 seconds
      
      return () => clearInterval(intervalId);
    }, [])
  );



  // Update the calculateStreak function to use AsyncStorage
  const calculateStreak = async () => {
    try {
      const streakData = await AsyncStorage.getItem('streakData');
      if (streakData) {
        const data = JSON.parse(streakData);
        setCurrentStreak(data.currentStreak);
        console.log('Retrieved streak:', data.currentStreak);
      } else {
        setCurrentStreak(0);
        console.log('No streak data found');
      }
    } catch (error) {
      console.error('Error calculating streak:', error);
      setCurrentStreak(0);
    }
  };

  // Update useEffect to handle async calculateStreak
  useEffect(() => {
    calculateStreak();
  }, []);

  // Add useFocusEffect to recalculate streak when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      calculateStreak();
    }, [])
  );

  // Add this function to load share stats
  const loadShareStats = async () => {
    try {
      const shareData = await AsyncStorage.getItem('shareStreak');
      if (shareData) {
        const { dailyStreak, totalShares } = JSON.parse(shareData);
        setShareStreak(dailyStreak);
        setTotalShares(totalShares);
      }
    } catch (error) {
      console.error('Error loading share stats:', error);
    }
  };

  // Update useFocusEffect to also load share stats
  useFocusEffect(
    React.useCallback(() => {
      calculateStreak();
      loadShareStats();
    }, [])
  );

  // Update useFocusEffect to remove audio-related functions
  useFocusEffect(
    React.useCallback(() => {
      refreshPrayerStatus();
      loadShareStats();
    }, [])
  );

  // Keep the useEffect for dailyVerse
  useEffect(() => {
    if (params.dailyVerse) {
      setIsMainDropdownOpen(true);
      setInstructions(params.dailyVerse as string);
    }
  }, [params.dailyVerse]);

  // Load saved prayers - this function can be used by both useFocusEffect and refresh button
  const loadSavedPrayers = async () => {
    try {
      const savedPrayersStr = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayersStr) {
        const prayers = JSON.parse(savedPrayersStr);
        setSavedPrayers(prayers);
      }
    } catch (error) {
      console.error('Error loading saved prayers:', error);
    }
  };

  // Update useFocusEffect to load prayers when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadSavedPrayers();
    }, [])
  );

  // Update the refresh button to use the same loading function
  const handleRefresh = () => {
    loadSavedPrayers();
  };

  // Modify handleGeneratePrayer to use the transcript if available
  const handleGeneratePrayer = () => {
    // Get the religion-specific prayer prompt using the context
    const prayerPrompt = getPrayerPrompt(language);
    
    // Use the transcript or manual instructions for the prayer
    const prayerInstructions = transcription || instructions;
    
    // Track the prayer generation attempt with input method
    if (typeof trackEvent === 'function') {
      trackEvent('Prayer Generation Initiated', {
        input_method: inputMode,
        has_transcription: !!transcription,
        language: language,
        religion: religion
      });
    }
    
    // Navigate to prayer-voice screen
    router.push({
      pathname: '/prayer-voice',
      params: {
        instructions: prayerInstructions,
        dailyVerse: params.dailyVerse,
        isNewGeneration: 'true',
        language: language,
        prayerPrompt: prayerPrompt,
        inputMethod: inputMode  // This is the parameter we're passing
      }
    });
    
    // Clear the text input and transcription after generating
    setInstructions('');
    setTranscription('');
  };

  // Request microphone permissions when component mounts
  useEffect(() => {
    const getPermissions = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        setMicPermission(status === 'granted');
        if (status !== 'granted') {
          // If permission not granted, default to text input
          setInputMode('text');
        }
      } catch (error) {
        console.error('Error requesting microphone permission:', error);
        setMicPermission(false);
        setInputMode('text');
      }
    };

    getPermissions();
  }, []);

  // Function to request microphone permission
  const requestMicrophonePermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setMicPermission(status === 'granted');
      if (status === 'granted') {
        setInputMode('microphone');
      } else {
        Alert.alert(
          "Permission Required",
          "Microphone access is needed for voice input. Please enable it in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Open Settings", 
              onPress: () => Linking.openSettings() 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
    }
  };

  // Updated recording function with recommended options
  const startRecording = async () => {
    try {
      console.log('Starting recording with optimized settings...');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // Use the exact recording options recommended by the backend
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
      
      console.log('Using recommended recording options');
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      
      console.log('Recording started with optimized format');
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  // Updated stop function
  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      console.log('Stopping recording...');
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      console.log('Recording URI:', uri);
      
      setRecording(null);
      
      // Send the file with correct metadata
      uploadAudio(uri);
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  // Updated upload function with correct file metadata
  const uploadAudio = async (audioUri) => {
    console.log('Attempting to upload:', audioUri);
    setIsTranscribing(true);
    
    try {
      // Create form data
      const formData = new FormData();
      
      // Add file with correct metadata matching our recording format
      formData.append('audio', {
        uri: audioUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      });
      
      console.log('FormData created with correct m4a format');
      
      // Make the request
      const response = await fetch('https://realtime-3d-server.fly.dev/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      // Process response
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          if (data.transcript) {
            setTranscription(data.transcript);
            setInstructions(data.transcript);
            console.log('Transcription successful:', data.transcript);
          } else {
            console.log('Empty transcript received');
          }
        } catch (e) {
          console.log('Could not parse response as JSON:', e);
        }
      } else {
        console.error('Server returned error status:', response.status);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Replace any notification-related functions with dummy implementations
  const requestNotificationPermissions = async () => {
    // Simulate permission request
    console.log('Would request notification permissions');
    setHasPermission(true);
    return true;
  };

  const scheduleReminderNotification = async (time: Date) => {
    // Simulate scheduling a notification
    console.log('Would schedule notification at:', time);
    return 'dummy-notification-id';
  };

  return (
    <View style={styles.container}>
      {/* Input Mode Toggle */}
      <View style={styles.inputModeToggle}>
        <TouchableOpacity 
          style={[
            styles.toggleButton, 
            inputMode === 'microphone' && styles.activeToggleButton
          ]}
          onPress={() => {
            if (micPermission) {
              setInputMode('microphone');
            } else {
              requestMicrophonePermission();
            }
          }}
        >
          <Ionicons name="mic-outline" size={20} color={inputMode === 'microphone' ? '#fff' : Colors.light.primary} />
          <Text style={[styles.toggleButtonText, inputMode === 'microphone' && styles.activeToggleText]}></Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.toggleButton, 
            inputMode === 'text' && styles.activeToggleButton
          ]}
          onPress={() => setInputMode('text')}
        >
          <Ionicons name="document-text-outline" size={20} color={inputMode === 'text' ? '#fff' : Colors.light.primary} />
          <Text style={[styles.toggleButtonText, inputMode === 'text' && styles.activeToggleText]}></Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.savedPrayersContainer}>
        {/* Redesigned Prayer Generator */}
        <View style={styles.prayerGeneratorContainer}>
          {micPermission === false && inputMode === 'microphone' ? (
            // Permission request view
            <View style={styles.permissionContainer}>
              <Ionicons name="mic-off-outline" size={60} color="#999" style={styles.permissionIcon} />
              <Text style={styles.permissionTitle}>Microphone Access Required</Text>
              <Text style={styles.permissionText}>
                To use voice input for your prayers, we need access to your microphone.
              </Text>
              <TouchableOpacity 
                style={styles.permissionButton}
                onPress={requestMicrophonePermission}
              >
                <Text style={styles.permissionButtonText}>Grant Permission</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.textModeButton}
                onPress={() => setInputMode('text')}
              >
                <Text style={styles.textModeButtonText}>Use Text Input Instead</Text>
              </TouchableOpacity>
            </View>
          ) : inputMode === 'text' ? (
            // Text input mode (current functionality)
            <>
              {/* Prayer For section - now displayed first */}
              <Text style={styles.instructionsLabel}>
                {getCategoryTitle('prayer_for')}
              </Text>
              
              <View style={styles.predefinedOptionsContainer}>
                <View style={styles.optionsGrid}>
                  {getOptionsForCategory('prayer_for').map((option) => (
                    <TouchableOpacity 
                      key={option.id}
                      style={styles.optionButton}
                      onPress={() => setInstructions(prev => 
                        prev ? `${prev} ${option.label}` : option.label
                      )}
                    >
                      <Text style={styles.optionButtonText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Prayer Intentions section - now displayed second */}
              <Text style={[styles.instructionsLabel, styles.secondSectionTitle]}>
                {getCategoryTitle('prayer_intentions')}
              </Text>
              
              <View style={styles.predefinedOptionsContainer}>
                <View style={styles.optionsGrid}>
                  {getOptionsForCategory('prayer_intentions').map((option) => (
                    <TouchableOpacity 
                      key={option.id}
                      style={styles.optionButton}
                      onPress={() => setInstructions(prev => 
                        prev ? `${prev} ${option.label}` : option.label
                      )}
                    >
                      <Text style={styles.optionButtonText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <TextInput
                style={styles.instructionsInput}
                multiline
                value={instructions}
                onChangeText={setInstructions}
                placeholder={
                  language === 'en' ? 'Enter your prayer intentions here...' : 
                  language === 'es' ? 'Ingresa tus intenciones de oración aquí...' : 
                  language === 'hi' ? 'अपनी प्रार्थना इरादों यहां दर्ज करें...' : 
                  language === 'pt' ? 'Digite suas intenções de oração aqui...' : 
                  language === 'id' ? 'Masukkan niat doa Anda di sini...' : 
                  language === 'fr' ? 'Entrez vos intentions de prière ici...' : 
                  'Enter your prayer intentions here...'
                }
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
            </>
          ) : (
            // Microphone input mode (integrated directly)
            <PrayerVoiceInput 
              onTranscriptionComplete={(text) => {
                setInstructions(text);
                setTranscription(text);
                console.log("Transcription set in parent component:", text);
              }}
              language={language}
            />
          )}
          
          <TouchableOpacity 
            style={styles.generateButton}
            onPress={handleGeneratePrayer}
          >
            <Ionicons name="create-outline" size={20} color="#fff" style={styles.generateButtonIcon} />
            <Text style={styles.generateButtonText}>
              {language === 'en' ? 'Generate Prayer' : 
               language === 'es' ? 'Generar Oración' : 
               language === 'hi' ? 'प्रार्थना उत्पन्न करें' : 
               language === 'pt' ? 'Gerar Oração' : 
               language === 'id' ? 'Buat Doa' : 
               language === 'fr' ? 'Générer une Prière' : 
               'Generate Prayer'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  statsButton: {
    height: 100,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    justifyContent: 'center',
        marginBottom: 10,

  },
  statsButtonContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 20,
    
  },
  streaksContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 16,
    marginTop:-40
  },
  streakContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTextContainer: {
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  streakCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  streakDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 8,
  },
  expandButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  statsButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 4,
  },
  arrowIcon: {
    fontSize: 12,
    color: '#666',
  },
  prayerBoxesContainer: {
    padding: 16,
    gap: 12, // Space between cards
  },
  prayerBox: {
    width: '100%',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3, // for Android shadow
    marginBottom: 2, // Extra space for shadow
  },
  prayerBoxContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prayerBoxIcon: {
    fontSize: 24,
  },
  prayerBoxText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 20,
  },
  micButton: {
    backgroundColor: '#50C878',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  micButtonText: {
    fontSize: 30,
  },
  closeButton: {
    padding: 10,
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statsContent: {
    padding: 16,
  },
  calendar: {
    marginTop: 10,
    width: '100%',
    minHeight: 350,
  },
  prayerModeContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exitButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
  },
  exitButtonText: {
    fontSize: 24,
    color: '#666',
  },
  prayerModeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  micButtonRecording: {
    backgroundColor: '#ff4444',
  },
  recordingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  prayerModeButton: {
    backgroundColor: Colors.light.primary,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  prayerModeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#50C878',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  timesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  timeBox: {
    alignItems: 'center',
    flex: 1,
    padding: 20,
  },
  timeLabel: {
    fontSize: 19,
    color: Colors.light.primary,
    marginBottom: 4,
  },
  timeValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeValue: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  timePeriod: {
    fontSize: 12,  // Half the size of timeValue
    fontWeight: '600',
    color: Colors.light.primary,
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  timeEditor: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  timeAdjuster: {
    alignItems: 'center',
    width: 80,
  },
  timeButton: {
    padding: 15,
  },
  timeButtonText: {
    fontSize: 24,
    color: Colors.light.primary,
  },
  timeDisplay: {
    fontSize: 40,
    fontWeight: 'bold',
    marginVertical: 10,
    color: Colors.light.primary,
  },
  timeSeparator: {
    fontSize: 40,
    fontWeight: 'bold',
    marginHorizontal: 10,
    color: Colors.light.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonText: {
    color: Colors.light.primary,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  prayerNamesContainer: {
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  prayerNamesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  prayerName: {
    fontSize: 16,
    color: '#666',
    marginVertical: 4,
  },
  prayersContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 16,
  },
  prayerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginHorizontal: 2,
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  prayerText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 8,
  },
  showMoreText: {
    color: '#007AFF',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  prayerList: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
  },
  prayerItem: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  prayerItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'normal',
  },
  prayerStatus: {
    fontSize: 24,
    marginLeft: 12,
  },
  resetButton: {
    backgroundColor: '#e74c3c',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Medium' : 'normal',
  },
  timeHeaderContainer: {
    position: 'absolute',
    top: -10,
    left: 16,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
  },
  timeHeaderText: {
    fontSize: 21,
    color: '#666',
    fontWeight: '500',
  },
  prayerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareButton: {
    padding: 4,
  },
  profileButton: {
    position: 'absolute',
    top: 60,  // Adjust this value based on your status bar height
    right: 20,
    padding: 8,
    zIndex: 1000,
  },
  onboardingPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  simpleDropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownHeader: {
    flex: 1,
  },
  dropdownLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dropdownPreview: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 5,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    width: 220,
    borderWidth: 1,
    borderColor: '#eaeaea',
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activeDropdownOption: {
    backgroundColor: '#f0f8ff',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOption: {
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  topNavBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 15,
    width: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
    zIndex: 10,
  },
  selectionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 25,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 5,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginRight: 5,
  },
  selectorIcon: {
    marginLeft: 2,
  },
  savedPrayersContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  prayerGeneratorContainer: {
    marginTop: 82,
    marginHorizontal: 5,
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  instructionsLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    color: Colors.light.primary,
    textAlign: 'left',
  },
  secondSectionTitle: {
    marginTop: 16,
  },
  predefinedOptionsContainer: {
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  optionButton: {
    backgroundColor: '#f5f2fa',
    paddingHorizontal: 14.4,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0dce8',
    minWidth: 92,
    alignItems: 'center',
    flex: 0,
    flexGrow: 0,
    flexBasis: 'auto',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
    textAlign: 'center',
  },
  instructionsInput: {
    height: 120,
    borderWidth: 1,
    borderColor: '#e0e5eb',
    borderRadius: 15,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9fafc',
    marginTop: 8,
    marginBottom: 20,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  generateButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  generateButtonIcon: {
    marginRight: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  bookmarkIconContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  prayerCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  audioIndicator: {
    fontSize: 16,
  },
  savedPrayersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  savedPrayersTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  refreshButton: {
    padding: 8,
  },
  languageButton: {
    position: 'absolute',
    top: 60,  // Adjust this value based on your status bar height
    left: 20,
    padding: 8,
    zIndex: 1000,
  },
  languageButtonText: {
    fontSize: 24,
    color: Colors.light.primary,
  },
  languageDropdown: {
    position: 'absolute',
    top: 100,  // Adjust this value based on your status bar height
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
  },
  languageOption: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  languageOptionText: {
    fontSize: 16,
    color: '#666',
  },
  selectedLanguage: {
    fontWeight: 'bold',
  },
  inputModeToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 25,
    padding: 5,
    marginTop: 60,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    flex: 1,
  },
  activeToggleButton: {
    backgroundColor: Colors.light.primary,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.light.primary,
    marginLeft: 8,
  },
  activeToggleText: {
    color: '#fff',
  },
  microphoneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  microphoneButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f2fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.primary,
    marginBottom: 20,
  },
  recordingButton: {
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  microphoneText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  transcribingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  transcribingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  transcriptionContainer: {
    width: '100%',
    backgroundColor: '#f9fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e5eb',
  },
  transcriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 16,
  },
  recordAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  recordAgainButtonText: {
    fontSize: 14,
    color: Colors.light.primary,
    marginLeft: 6,
  },
  permissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginVertical: 20,
  },
  permissionIcon: {
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  textModeButton: {
    paddingVertical: 10,
  },
  textModeButtonText: {
    color: Colors.light.primary,
    fontSize: 14,
    fontWeight: '500',
  },
});