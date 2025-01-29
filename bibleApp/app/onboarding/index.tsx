import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView, Image, Dimensions, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
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

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Define types
type Step = 'welcome' | 'prayer' | 'prayer-for' | 'generating-prayers' | 'sleep' | 'wake' | 'notifications' | 'final';

type OnboardingData = {
  prayerNames: string[];
  notificationsEnabled: boolean;
  sleepTime: Date;
  wakeTime: Date;
  alarmFrequency: number;
  prayerFor: string[];
  selectedPrayerNames: string[];
};


// Add these types after your existing types
type ProgressMarker = {
  type: 'logo' | 'none';
};

// Add this constant at the top with your other constants
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Add this component before your main OnboardingScreen component
const ProgressBar = ({ currentStep }: { currentStep: Step }) => {
  const steps: Step[] = ['prayer', 'prayer-for', 'sleep', 'wake', 'notifications'];
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
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [prayerName, setPrayerName] = useState('');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    prayerNames: [],
    notificationsEnabled: false,
    sleepTime: new Date(),
    wakeTime: new Date(),
    alarmFrequency: 1,
    prayerFor: [],
    selectedPrayerNames: [],
  });

  const sleepTimeSelector = useTimeSelector(onboardingData.sleepTime);
  const wakeTimeSelector = useTimeSelector(onboardingData.wakeTime);

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
        Nombres por rezar: ${onboardingData.prayerNames.join(', ')}
        Intenciones de rezar: ${onboardingData.prayerFor.join(', ')}
        
        LIMITA LA ORACION A 420 palabras
        `;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
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
      case 'welcome':
        return (
          <View style={styles.welcomeContainer}>
            <Image
              source={require('../../assets/images/bendiga_01.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.description}>
              Personaliza tu experiencia
            </Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => setCurrentStep('prayer')}
            >
              <Text style={styles.buttonText}>Siguiente</Text>
            </TouchableOpacity>
          </View>
        );

      case 'prayer':
        return renderPrayerStep(
          '¿Por quién estás orando?',
          availablePrayerOptions,
          'prayerNames',
          'prayer-for'
        );

      case 'prayer-for':
        return renderPrayerStep(
          '¿Por qué estás orando?',
          availablePrayerForOptions,
          'prayerFor',
          'generating-prayers'
        );

      case 'generating-prayers':
        return (
          <View style={styles.generatingPrayersContainer}>
            
            {(!isGenerating && generatedPrayers.length === 0) && (
              <>
                <Image 
                  source={require('../../assets/cross.png')}
                  style={styles.crossImage}
                />
                <TouchableOpacity 
                  style={styles.button}
                  onPress={generatePrayersAsync}
                >
                  <Text style={styles.buttonText}>Generar Oraciones</Text>
                </TouchableOpacity>
              </>
            )}

            {isGenerating && (
              <>
                <Image 
                  source={require('../../assets/cross.png')}
                  style={styles.crossImage}
                />
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>
                    Generando oraciones... {generatedPrayers.length}/3
                  </Text>
                  <ActivityIndicator size="large" color={Colors.light.primary} />
                </View>
              </>
            )}

            {(generatedPrayers.length === 3) && (
              <View style={styles.prayerContainer}>
                <Animated.View style={[styles.prayerCardContainer, animatedStyle]}>
                  <View style={styles.prayerCard}>
                    <View style={styles.prayerHeader}>
                      <Text style={styles.prayerNumber}>
                        Oración {currentPrayerIndex + 1}/3
                      </Text>
                      <TouchableOpacity 
                        style={styles.starButton}
                        onPress={() => setStarredPrayerIndex(currentPrayerIndex)}
                      >
                        <Ionicons 
                          name={starredPrayerIndex === currentPrayerIndex ? "star" : "star-outline"} 
                          size={24} 
                          color={starredPrayerIndex === currentPrayerIndex ? "#FFD700" : "#666"}
                        />
                      </TouchableOpacity>
                    </View>
                    <ScrollView 
                      style={styles.prayerScrollContainer}
                      contentContainerStyle={styles.prayerScrollContent}
                    >
                      <Text style={styles.prayerText}>
                        {generatedPrayers[currentPrayerIndex]}
                      </Text>
                    </ScrollView>
                  </View>
                </Animated.View>

                <View style={styles.navigationContainer}>
                  <TouchableOpacity 
                    style={[styles.navButton, currentPrayerIndex === 0 && styles.navButtonDisabled]}
                    onPress={() => navigatePrayer('prev')}
                    disabled={currentPrayerIndex === 0}
                  >
                    <Text style={styles.navButtonText}>Anterior</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.navButton, currentPrayerIndex === 2 && styles.navButtonDisabled]}
                    onPress={() => navigatePrayer('next')}
                    disabled={currentPrayerIndex === 2}
                  >
                    <Text style={styles.navButtonText}>Siguiente</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.paginationContainer}>
                  {generatedPrayers.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.paginationDot,
                        index === currentPrayerIndex && styles.paginationDotActive,
                      ]}
                    />
                  ))}
                </View>

                {generatedPrayers.length === 3 && (
                  <TouchableOpacity 
                    style={[styles.button, starredPrayerIndex === -1 && styles.buttonDisabled]}
                    onPress={() => setCurrentStep('sleep')}
                    disabled={starredPrayerIndex === -1}
                  >
                    <Text style={styles.buttonText}>
                      {starredPrayerIndex === -1 ? 'Selecciona una oración para continuar' : 'Continuar'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );

      case 'sleep':
        return (
          <>
            <Text style={styles.title}>¿Tiempo de oración en la mañana?</Text>
            <TimeSelector 
              time={sleepTimeSelector.time}
              onTimeChange={sleepTimeSelector.adjustTime}
            />
            <TouchableOpacity 
              style={styles.button}
              onPress={() => {
                setOnboardingData(prev => ({ ...prev, sleepTime: sleepTimeSelector.time }));
                setCurrentStep('wake');
              }}
            >
              <Text style={styles.buttonText}>Siguiente</Text>
            </TouchableOpacity>
          </>
        );

      case 'wake':
        return (
          <>
            <Text style={styles.title}>¿Tiempo de dormir con Dios?</Text>
            <TimeSelector 
              time={wakeTimeSelector.time}
              onTimeChange={wakeTimeSelector.adjustTime}
            />
            <TouchableOpacity 
              style={styles.button}
              onPress={() => {
                setOnboardingData(prev => ({ ...prev, wakeTime: wakeTimeSelector.time }));
                setCurrentStep('notifications');
              }}
            >
              <Text style={styles.buttonText}>Siguiente</Text>
            </TouchableOpacity>
          </>
        );

      case 'notifications':
        return (
          <>
            <Text style={styles.title}>Recordatorios Diarios</Text>
            <Text style={styles.description}>
              ¿Te gustaría recibir recordatorios diarios para orar por tus seres queridos?
            </Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={requestNotificationPermission}
            >
              <Text style={styles.buttonText}>Activar Recordatorios</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.skipButton]}
              onPress={() => setCurrentStep('final')}
            >
              <Text style={styles.skipButtonText}>Omitir</Text>
            </TouchableOpacity>
          </>
        );

      case 'final':
        return (
          <View style={styles.welcomeContainer}>
            <Image
              source={require('../../assets/images/bendiga_01.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.description}>
              Inicia tu camino para acercarte a Dios
            </Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={completeOnboarding}
            >
              <Text style={styles.buttonText}>Comenzar</Text>
            </TouchableOpacity>
          </View>
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
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }

      // Debug logs for the selected prayer
      console.log('Selected prayer index:', starredPrayerIndex);
      console.log('All generated prayers:', generatedPrayers.map((p, i) => `Prayer ${i + 1}: ${p.substring(0, 50)}...`));
      
      const selectedPrayer = generatedPrayers[starredPrayerIndex];
      console.log('About to store selected prayer:', selectedPrayer.substring(0, 50) + '...');

      await Promise.all([
        AsyncStorage.setItem('hasOnboarded', 'true'),
        AsyncStorage.setItem('onboardingData', JSON.stringify(onboardingData)),
        AsyncStorage.setItem('availablePrayerOptions', JSON.stringify(availablePrayerOptions)),
        AsyncStorage.setItem('dailyPrayer11', selectedPrayer)
      ]);

      // Verify the prayer was stored correctly
      const storedPrayer = await AsyncStorage.getItem('dailyPrayer11');
      console.log('Verified stored prayer:', storedPrayer ? storedPrayer.substring(0, 50) + '...' : 'null');
      
      router.replace('/(app)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to save onboarding data');
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      // Only ask if permissions have not already been determined
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
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
