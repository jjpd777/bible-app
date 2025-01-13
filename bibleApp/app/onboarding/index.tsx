import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Define types
type Step = 'welcome' | 'sleep' | 'wake' | 'prayer' | 'prayer-for' | 'notifications' | 'final';

type OnboardingData = {
  prayerNames: string[];
  notificationsEnabled: boolean;
  sleepTime: Date;
  wakeTime: Date;
  alarmFrequency: number;
};

// Add this constant at the top level
const DEFAULT_PRAYER_OPTIONS = [
  'Mama', 'Papa', 'Hermanos', 'Hermanas', 'Abuelita', 'Abuelito'
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [prayerName, setPrayerName] = useState('');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    prayerNames: [],
    notificationsEnabled: false,
    sleepTime: new Date(),
    wakeTime: new Date(),
    alarmFrequency: 1
  });

  const [availablePrayerOptions, setAvailablePrayerOptions] = useState(DEFAULT_PRAYER_OPTIONS);

  const [availablePrayerForOptions, setAvailablePrayerForOptions] = useState([
    'Salud', 'Vida', 'Prosperidad', 'Abundancia', 'Bendiga.app'
  ]);

  const [selectedPrayerFor, setSelectedPrayerFor] = useState<string[]>([]);

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      await AsyncStorage.setItem('onboardingData', JSON.stringify(onboardingData));
      
      // Store the remaining available options
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
          <>
            <Text style={styles.title}>WELCOME</Text>
            <Text style={styles.description}>
              Let's set up your prayer experience
            </Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => setCurrentStep('sleep')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </>
        );

      case 'sleep':
        return (
          <>
            <Text style={styles.title}>Bendiga Time #1?</Text>
            <Text style={styles.description}>
              We'll use this to schedule your evening prayers
            </Text>
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
            <Text style={styles.title}>Bendiga Time #2?</Text>
            <Text style={styles.description}>
              We'll use this to schedule your morning prayers
            </Text>
            <TimeSelector 
              time={onboardingData.wakeTime}
              onTimeChange={(type, direction) => adjustTime(type, direction)}
            />
            <TouchableOpacity 
              style={styles.button}
              onPress={() => setCurrentStep('prayer')}
            >
              <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
          </>
        );

      case 'prayer':
        return (
          <>
            <Text style={styles.title}>Who do you want to pray for?</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={prayerName}
                onChangeText={setPrayerName}
                placeholder="Enter a name"
                onSubmitEditing={addPrayerName}
              />
              <TouchableOpacity 
                style={styles.addButton}
                onPress={addPrayerName}
              >
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.predefinedOptionsContainer}>
              {availablePrayerOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.predefinedOption}
                  onPress={() => {
                    setOnboardingData(prev => ({
                      ...prev,
                      prayerNames: [...prev.prayerNames, option]
                    }));
                    setAvailablePrayerOptions(prev => 
                      prev.filter(item => item !== option)
                    );
                  }}
                >
                  <Text style={styles.predefinedOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {onboardingData.prayerNames.map((name, index) => (
              <Text key={index} style={styles.prayerName}>{name}</Text>
            ))}
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
            <Text style={styles.title}>What are you praying for?</Text>
            <View style={styles.predefinedOptionsContainer}>
              {availablePrayerForOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.predefinedOption}
                  onPress={async () => {
                    try {
                      const existingPrayerFor = await AsyncStorage.getItem('prayerFor') || '[]';
                      const prayerForArray = JSON.parse(existingPrayerFor);
                      if (!prayerForArray.includes(option)) {
                        prayerForArray.push(option);
                        await AsyncStorage.setItem('prayerFor', JSON.stringify(prayerForArray));
                      }
                      
                      setSelectedPrayerFor(prev => [...prev, option]);
                      setAvailablePrayerForOptions(prev => 
                        prev.filter(item => item !== option)
                      );
                    } catch (error) {
                      console.error('Error saving prayer-for:', error);
                    }
                  }}
                >
                  <Text style={styles.predefinedOptionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {selectedPrayerFor.map((intention, index) => (
              <Text key={index} style={styles.prayerName}>{intention}</Text>
            ))}
            <TouchableOpacity 
              style={styles.button}
              onPress={() => setCurrentStep('notifications')}
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
          <>
            <Text style={styles.title}>You're All Set!</Text>
            <Text style={styles.description}>
              Ready to start your prayer journey
            </Text>
            <TouchableOpacity 
              style={styles.button}
              onPress={completeOnboarding}
            >
              <Text style={styles.buttonText}>Get Started</Text>
            </TouchableOpacity>
          </>
        );
    }
  };

  // Add this useEffect to load saved options when returning to onboarding
  useEffect(() => {
    const loadSavedOptions = async () => {
      try {
        const savedOptions = await AsyncStorage.getItem('availablePrayerOptions');
        if (savedOptions) {
          setAvailablePrayerOptions(JSON.parse(savedOptions));
        } else {
          setAvailablePrayerOptions(DEFAULT_PRAYER_OPTIONS);
        }
      } catch (error) {
        console.error('Error loading prayer options:', error);
        setAvailablePrayerOptions(DEFAULT_PRAYER_OPTIONS);
      }
    };

    loadSavedOptions();
  }, []);

  return (
    <View style={styles.container}>
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
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    minWidth: 200,
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skipButtonText: {
    color: '#007AFF',
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
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#007AFF',
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
    color: '#007AFF',
  },
  timeDisplay: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
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
    backgroundColor: '#E8E8E8',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  predefinedOptionText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
