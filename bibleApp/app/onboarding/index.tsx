import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView, Image, Dimensions, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useTimeSelector } from '../../hooks/useTimeSelector';
import { SelectableOptions } from '../../components/SelectableOptions';
import { DEFAULT_PRAYER_OPTIONS, DEFAULT_PRAYER_FOR_OPTIONS, ONBOARDING_STEPS } from '../../constants/onboarding';
import Constants from 'expo-constants';
import {
  GestureHandlerRootView,
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  withTiming,
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY;

// Replace notification handler with dummy implementation
const dummyNotificationHandler = {
  handleNotification: async () => {
    console.log('Would handle notification');
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    };
  },
  
  requestPermissionsAsync: async () => {
    console.log('Would request notification permissions');
    return { status: 'granted' };
  },
  
  getPermissionsAsync: async () => {
    console.log('Would check notification permissions');
    return { status: 'granted' };
  }
};

// Define types
type Step = 'prayer' | 'prayer-for';

type OnboardingData = {
  prayerNames: string[];
  prayerFor: string[];
};


// Add these types after your existing types
type ProgressMarker = {
  type: 'logo' | 'none';
};

// Add this constant at the top with your other constants
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Add this component before your main OnboardingScreen component
const ProgressBar = ({ currentStep }: { currentStep: Step }) => {
  const steps: Step[] = ['prayer', 'prayer-for'];
  const currentStepIndex = steps.indexOf(currentStep);

  const getMarkerForBlock = (blockIndex: number): ProgressMarker => {
    if (blockIndex === currentStepIndex) {
      // Show logo at current block
      return { type: 'logo' };
    }
    return { type: 'none' };
  };

  if (!steps.includes(currentStep)) return null;

  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.blockContainer}>
        {steps.map((step, index) => {
          const isActive = currentStepIndex >= index;
          const marker = getMarkerForBlock(index);

          return (
            <View key={step} style={progressStyles.blockWrapper}>
              <View style={[
                progressStyles.block,
                isActive && progressStyles.activeBlock
              ]}>
                {marker.type === 'logo' && (
                  <Image
                    source={require('../../assets/images/bendiga_01.png')}
                    style={progressStyles.markerLogo}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Add these styles after your existing StyleSheet
const progressStyles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 100,
  },
  blockContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 4,
  },
  blockWrapper: {
    flex: 1,
  },
  block: {
    height: 20,
    backgroundColor: '#E6F3FF', // light blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeBlock: {
    backgroundColor: '#8A2BE2', // purple
  },
  markerLogo: {
    width: 155,
    height: 155,
    position: 'absolute',
    top: -15,
  },
  markerCheckmark: {
    position: 'absolute',
    top: -15,
  },
});

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('prayer');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    prayerNames: [],
    prayerFor: [],
  });

  const [availablePrayerOptions, setAvailablePrayerOptions] = useState(DEFAULT_PRAYER_OPTIONS);
  const [availablePrayerForOptions] = useState(DEFAULT_PRAYER_FOR_OPTIONS);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const [generatedPrayers, setGeneratedPrayers] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [currentPrayerIndex, setCurrentPrayerIndex] = useState(0);
  const textOpacity = useSharedValue(1);

  const [starredPrayerIndex, setStarredPrayerIndex] = useState(0);

  const handleOptionToggle = (option: string, stateKey: 'prayerNames' | 'prayerFor') => {
    setOnboardingData(prev => {
      const currentOptions = prev[stateKey];
      const newOptions = currentOptions.includes(option)
        ? currentOptions.filter(item => item !== option)
        : [...currentOptions, option];
      
      return { ...prev, [stateKey]: newOptions };
    });
  };

 
  const generatePrayersAsync = async () => {
    setIsGenerating(true);
    setGeneratedPrayers([]);

    const generateSinglePrayer = async () => {
      const prompt = `Genera una oracion Cristian usando los siguientes elementos:
        Nombres por orar: ${onboardingData.prayerNames.join(', ')}
        Intenciones de orar: ${onboardingData.prayerFor.join(', ')}
        
        LIMITA LA ORACION A 420 palabras
        `;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful assistant that writes Christian prayers." },
            { role: "user", content: prompt }
          ],
          temperature: 0.9
        })
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    };

    try {
      // Generate all prayers concurrently
      const promises = Array(3).fill(null).map(() => generateSinglePrayer());
      
      // Update state as each prayer comes in
      for (const promise of promises) {
        const prayer = await promise;
        setGeneratedPrayers(prev => [...prev, prayer]);
      }
    } catch (error) {
      console.error('Error generating prayers:', error);
      Alert.alert('Error', 'Failed to generate some prayers. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const navigatePrayer = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentPrayerIndex < generatedPrayers.length - 1) {
      textOpacity.value = withTiming(0, {
        duration: 400,
      }, () => {
        runOnJS(setCurrentPrayerIndex)(currentPrayerIndex + 1);
        textOpacity.value = withTiming(1, { 
          duration: 400
        });
      });
    } else if (direction === 'prev' && currentPrayerIndex > 0) {
      textOpacity.value = withTiming(0, {
        duration: 400,
      }, () => {
        runOnJS(setCurrentPrayerIndex)(currentPrayerIndex - 1);
        textOpacity.value = withTiming(1, { 
          duration: 400
        });
      });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const renderPrayerStep = (
    title: string, 
    options: string[], 
    stateKey: 'prayerNames' | 'prayerFor', 
    nextStep: Step
  ) => (
    <>
      <Text style={styles.title}>{title}</Text>
      <SelectableOptions
        options={options}
        selectedOptions={onboardingData[stateKey]}
        onToggleOption={(option) => handleOptionToggle(option, stateKey)}
      />
      <TouchableOpacity 
        style={styles.button}
        onPress={() => setCurrentStep(nextStep)}
      >
        <Text style={styles.buttonText}>Siguiente</Text>
      </TouchableOpacity>
    </>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 'prayer':
        return renderPrayerStep(
          '¿Por quién estás orando?',
          availablePrayerOptions,
          'prayerNames',
          'prayer-for'
        );

      case 'prayer-for':
        return (
          <>
            <Text style={styles.title}>¿Por qué estás orando?</Text>
            <SelectableOptions
              options={availablePrayerForOptions}
              selectedOptions={onboardingData.prayerFor}
              onToggleOption={(option) => handleOptionToggle(option, 'prayerFor')}
            />
            <TouchableOpacity 
              style={styles.button}
              onPress={completeOnboarding}
            >
              <Text style={styles.buttonText}>Finalizar</Text>
            </TouchableOpacity>
          </>
        );
    }
  };

  // Add this useEffect to load saved options when returning to onboarding
  useEffect(() => {
    const loadSavedOptions = async () => {
      try {
        // First, get the onboarding data to check which names are already selected
        const onboardingDataString = await AsyncStorage.getItem('onboardingData');
        const selectedNames = onboardingDataString 
          ? JSON.parse(onboardingDataString).prayerNames 
          : [];

        // Filter out already selected names from the default options
        const availableOptions = DEFAULT_PRAYER_OPTIONS.filter(
          option => !selectedNames.includes(option)
        );

        setAvailablePrayerOptions(availableOptions);
      } catch (error) {
        console.error('Error loading prayer options:', error);
        setAvailablePrayerOptions(DEFAULT_PRAYER_OPTIONS);
      }
    };

    loadSavedOptions();
  }, []);

  // Add this useEffect to handle audio
  useEffect(() => {
    async function loadAndPlayMusic() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/music_files/track.mp3'),
          {
            isLooping: true,
            shouldPlay: true,
            volume: 0.5
          }
        );
        setSound(sound);
      } catch (error) {
        console.error('Error loading sound:', error);
      }
    }

    loadAndPlayMusic();

    // Cleanup function to unload sound when component unmounts
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const completeOnboarding = async () => {
    try {
      // Force stop the music with multiple approaches
      if (sound) {
        try {
          // Try multiple methods to ensure the sound stops
          await sound.setVolumeAsync(0); // Immediately mute
          await sound.pauseAsync();      // Pause playback
          await sound.stopAsync();       // Stop playback
          await sound.unloadAsync();     // Unload from memory
          setSound(null);                // Clear the reference
        } catch (audioError) {
          console.error('Error stopping sound:', audioError);
          // Continue with onboarding completion even if audio stopping fails
        }
      }
      
      // Create a small delay to ensure audio processing completes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await Promise.all([
        AsyncStorage.setItem('hasOnboarded', 'true'),
        AsyncStorage.setItem('onboardingData', JSON.stringify(onboardingData)),
        AsyncStorage.setItem('availablePrayerOptions', JSON.stringify(availablePrayerOptions)),
      ]);
      
      router.replace('/(app)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to save onboarding data');
    }
  };

  const requestNotificationPermission = async () => {
    try {
      // Use dummy implementation instead of actual notifications
      const { status: existingStatus } = await dummyNotificationHandler.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // Only ask if permissions have not already been determined
      if (existingStatus !== 'granted') {
        const { status } = await dummyNotificationHandler.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        setOnboardingData(prev => ({
          ...prev,
          notificationsEnabled: true
        }));
        setCurrentStep('final');
      } else {
        Alert.alert(
          "Notifications Disabled",
          "You won't receive prayer reminders. You can enable them later in settings.",
          [
            { 
              text: "Continue Anyway", 
              onPress: () => setCurrentStep('final') 
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      Alert.alert(
        "Error",
        "Could not request notification permissions. Please try again later.",
        [
          { 
            text: "Continue Anyway", 
            onPress: () => setCurrentStep('final') 
          }
        ]
      );
    }
  };

  const generateHours = () => {
    const hours = [];
    for (let i = 1; i <= 12; i++) {
      hours.push(i);
    }
    return hours;
  };

  const generateAmPm = () => ['AM', 'PM'];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const adjustTime = (type: 'hour' | 'minute', direction: 'up' | 'down') => {
    setOnboardingData(prev => {
      const timeKey = currentStep === 'sleep' ? 'sleepTime' : 'wakeTime';
      const newTime = new Date(prev[timeKey]);
      
      if (type === 'hour') {
        let newHour = newTime.getHours();
        if (direction === 'up') {
          newHour = (newHour + 1) % 24;
        } else {
          newHour = newHour === 0 ? 23 : newHour - 1;
        }
        newTime.setHours(newHour);
      } else {
        let newMinute = newTime.getMinutes();
        if (direction === 'up') {
          newMinute = (newMinute + 1) % 60;
        } else {
          newMinute = newMinute === 0 ? 59 : newMinute - 1;
        }
        newTime.setMinutes(newMinute);
      }
      
      return {
        ...prev,
        [timeKey]: newTime
      };
    });
  };

  const TimeSelector = ({ time, onTimeChange }: { time: Date, onTimeChange: (type: 'hour' | 'minute', direction: 'up' | 'down') => void }) => (
    <View style={styles.timePickerContainer}>
      {/* Hours */}
      <View style={styles.timeColumn}>
        <TouchableOpacity 
          style={styles.timeButton}
          onPress={() => onTimeChange('hour', 'up')}
        >
          <Text style={styles.arrowText}>▲</Text>
        </TouchableOpacity>
        
        <Text style={styles.timeDisplay}>
          {time.getHours().toString().padStart(2, '0')}
        </Text>
        
        <TouchableOpacity 
          style={styles.timeButton}
          onPress={() => onTimeChange('hour', 'down')}
        >
          <Text style={styles.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Minutes */}
      <View style={styles.timeColumn}>
        <TouchableOpacity 
          style={styles.timeButton}
          onPress={() => onTimeChange('minute', 'up')}
        >
          <Text style={styles.arrowText}>▲</Text>
        </TouchableOpacity>
        
        <Text style={[styles.timeDisplay, { color: '#FF9500' }]}>
          {time.getMinutes().toString().padStart(2, '0')}
        </Text>
        
        <TouchableOpacity 
          style={styles.timeButton}
          onPress={() => onTimeChange('minute', 'down')}
        >
          <Text style={styles.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <ProgressBar currentStep={currentStep} />
      <View style={styles.step}>
        {renderStep()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
  },
  step: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 22,
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  button: {
    backgroundColor: Colors.light.primary,
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    minWidth: 200,
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skipButtonText: {
    color: Colors.light.primary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.light.secondary,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    padding: 15,
    borderRadius: 10,
  },
  prayerName: {
    fontSize: 16,
    color: '#666',
    marginVertical: 5,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginVertical: 20,
  },
  timeColumn: {
    alignItems: 'center',
    minWidth: 60,
  },
  timeButton: {
    padding: 15,
    borderRadius: 8,
  },
  arrowText: {
    fontSize: 20,
    color: Colors.light.primary,
  },
  timeDisplay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.light.primary,
    marginVertical: 10,
  },
  predefinedOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  predefinedOption: {
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  predefinedOptionText: {
    color: Colors.light.primary,
    fontSize: 16,
  },
  logo: {
    width: 440,  // Adjust size as needed
    height: 440,  // Adjust size as needed
    marginBottom: -100,
  },
  selectedOption: {
    backgroundColor: '#E6D4F2', // Lighter purple
  },
  selectedOptionText: {
    color: '#6B1E9B', // Darker purple
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '-20%', // This moves the content up by 20%
  },
  generatingPrayersContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 1,
  },
  prayerContainer: {
    width: '100%',
    alignItems: 'center',
  },
  gestureContainer: {
    width: '100%',
  },
  prayerCardContainer: {
    width: '100%',
  },
  prayerCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    margin: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
  },
  prayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    width: '100%',
  },
  prayerNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  starButton: {
    padding: 5, // For better touch target
  },
  prayerScrollContainer: {
    maxHeight: 500,
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
  },
  prayerScrollContent: {
    padding: 1,
  },
  prayerText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: Colors.light.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  loadingText: {
    fontSize: 18,
    color: Colors.light.primary,
    marginBottom: 10,
  },
  crossImage: {
    width: 300,
    height: 300,
    marginBottom:150,
  
    marginTop: 200,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 20,
  },
  navButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  navButtonDisabled: {
    backgroundColor: '#ccc',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
});
