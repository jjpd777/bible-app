import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView, Image, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Colors } from '../../constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Define types
type Step = 'welcome' | 'prayer'  | 'sleep' | 'wake' | 'prayer-for' | 'notifications' | 'final';

type OnboardingData = {
  prayerNames: string[];
  notificationsEnabled: boolean;
  sleepTime: Date;
  wakeTime: Date;
  alarmFrequency: number;
  prayerFor: string[];
  selectedPrayerNames: string[];
};

// Add this constant at the top level
const DEFAULT_PRAYER_OPTIONS = [
  'Mamá', 'Papá', 'Hermanos', 'Hermanas', 'Abuelos', 'Hijos', 'Hijas', 'Mi pais', 'La Humanidad', 'Mi Comunidad', 'Mis Enemigos'
];

// Add these types after your existing types
type ProgressMarker = {
  type: 'logo' | 'none';
};

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

  const [availablePrayerOptions, setAvailablePrayerOptions] = useState(DEFAULT_PRAYER_OPTIONS);

  const [availablePrayerForOptions, setAvailablePrayerForOptions] = useState([
    'Salud', 'Vida', 'Prosperidad', 'Abundancia', 'Bendiga.app'
  ]);

  const [selectedPrayerFor, setSelectedPrayerFor] = useState<string[]>([]);

  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const completeOnboarding = async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      await AsyncStorage.setItem('hasOnboarded', 'true');
      await AsyncStorage.setItem('onboardingData', JSON.stringify(onboardingData));
      await AsyncStorage.setItem('availablePrayerOptions', JSON.stringify(availablePrayerOptions));
      
      router.replace('/(app)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to save onboarding data');
    }
  };

  const addPrayerName = () => {
    if (prayerName.trim()) {
      setOnboardingData(prev => ({
        ...prev,
        prayerNames: [...prev.prayerNames, prayerName.trim()]
      }));
      setPrayerName('');
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
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 'sleep':
        return (
          <>
            <Text style={styles.title}>¿Tiempo de oración en la mañana?</Text>
            <TimeSelector 
              time={onboardingData.sleepTime}
              onTimeChange={(type, direction) => adjustTime(type, direction)}
            />
            <TouchableOpacity 
              style={styles.button}
              onPress={() => setCurrentStep('wake')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </>
        );

      case 'wake':
        return (
          <>
            <Text style={styles.title}>
            ¿Tiempo de dormir con Dios?</Text>
           
            <TimeSelector 
              time={onboardingData.wakeTime}
              onTimeChange={(type, direction) => adjustTime(type, direction)}
            />
            <TouchableOpacity 
              style={styles.button}
              onPress={() => setCurrentStep('notifications')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </>
        );

      case 'prayer':
        return (
          <>
            <Text style={styles.title}>¿Por quién estás orando?</Text>
            <View style={styles.predefinedOptionsContainer}>
              {availablePrayerOptions.map((option, index) => {
                const isSelected = onboardingData.prayerNames.includes(option);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.predefinedOption,
                      isSelected && styles.selectedOption
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setOnboardingData(prev => ({
                          ...prev,
                          prayerNames: prev.prayerNames.filter(name => name !== option)
                        }));
                      } else {
                        setOnboardingData(prev => ({
                          ...prev,
                          prayerNames: [...prev.prayerNames, option]
                        }));
                      }
                    }}
                  >
                    <Text style={[
                      styles.predefinedOptionText,
                      isSelected && styles.selectedOptionText
                    ]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity 
              style={styles.button}
              onPress={() => setCurrentStep('prayer-for')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </>
        );

      case 'prayer-for':
        return (
          <>
            <Text style={styles.title}>¿Por qué estás orando?</Text>
            <View style={styles.predefinedOptionsContainer}>
              {availablePrayerForOptions.map((option, index) => {
                const isSelected = onboardingData.prayerFor.includes(option);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.predefinedOption,
                      isSelected && styles.selectedOption
                    ]}
                    onPress={() => {
                      if (isSelected) {
                        setOnboardingData(prev => ({
                          ...prev,
                          prayerFor: prev.prayerFor.filter(item => item !== option)
                        }));
                      } else {
                        setOnboardingData(prev => ({
                          ...prev,
                          prayerFor: [...prev.prayerFor, option]
                        }));
                      }
                    }}
                  >
                    <Text style={[
                      styles.predefinedOptionText,
                      isSelected && styles.selectedOptionText
                    ]}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity 
              style={styles.button}
              onPress={() => setCurrentStep('sleep')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </>
        );

      case 'notifications':
        return (
          <>
            <Text style={styles.title}>Daily Reminders</Text>
            <Text style={styles.description}>
              Would you like to receive daily reminders to pray for your loved ones?
            </Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={requestNotificationPermission}
            >
              <Text style={styles.buttonText}>Enable Reminders</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, styles.skipButton]}
              onPress={() => setCurrentStep('final')}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
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
              <Text style={styles.buttonText}>Comienza</Text>
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
});
