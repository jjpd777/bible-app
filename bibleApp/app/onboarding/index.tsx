import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import type { OnboardingData } from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type Step = 'welcome' | 'prayer' | 'notifications' | 'final';

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [prayerName, setPrayerName] = useState('');
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    prayerNames: [],
    notificationsEnabled: false,
  });

  const completeOnboarding = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    await AsyncStorage.setItem('onboardingData', JSON.stringify(onboardingData));
    router.replace('/(app)');
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
            {onboardingData.prayerNames.map((name, index) => (
              <Text key={index} style={styles.prayerName}>{name}</Text>
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
});
