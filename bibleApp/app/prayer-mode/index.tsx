import React from 'react';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, Alert, ScrollView, Linking, Image, Animated } from 'react-native';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const PRAYERS = {
  padreNuestro: 'Padre nuestro, que estás en el cielo, santificado sea tu Nombre; venga a nosotros tu Reino; hágase tu voluntad en la tierra como en el cielo. Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal. Amén.',

  aveMaria: 'Dios te salve, María, llena eres de gracia; el Señor es contigo. Bendita Tú eres entre todas las mujeres, y bendito es el fruto de tu vientre, Jesús. Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte. Amén.',
};

export default function PrayerModeScreen() {
  const [step, setStep] = useState(1);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [dailyPrayer, setDailyPrayer] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Add recording functions
  const startRecording = async () => {
    try {
      console.log('Checking permission status:', hasPermission);
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Microphone permission is required to record prayers. Please enable it in settings.',
          [
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            },
            {
              text: 'Cancel',
              style: 'cancel'
            }
          ]
        );
        return;
      }

      if (isRecording) {
        console.log('Already recording, skipping...');
        return;
      }

      console.log('Starting recording...');
      setIsRecording(true);

      // Create a custom filename with bendiga_app prefix
      const today = new Date().toISOString().split('T')[0];
      const prayerName = step === 2 ? 'padre_nuestro' : step === 3 ? 'ave_maria' : 'daily_prayer';
      const filename = `bendiga_app_${prayerName}_${today}.m4a`;

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
        (status) => console.log('Recording status update:', status),
        filename  // Add the custom filename here
      );
      
      setRecording(newRecording);
      console.log('Recording started successfully with filename:', filename);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  // Add function to mark prayer as completed
  const markPrayerAsCompleted = async (prayerNumber: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const prayerKey = `bendiga_app_${prayerNumber}_${today}`;
      await AsyncStorage.setItem(prayerKey, 'completed');
      console.log(`Marked prayer ${prayerNumber} as completed:`, prayerKey);
    } catch (error) {
      console.error('Error marking prayer as completed:', error);
    }
  };

  // Modify stopRecording to handle normal completion
  const stopRecording = async () => {
    try {
      if (!recording) return;

      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      // Get the URI and save the recording
      const uri = recording.getURI();
      if (uri) {
        // Save recording logic here
        const today = new Date().toISOString().split('T')[0];
        const prayerName = step === 2 ? 'padre_nuestro' : step === 3 ? 'ave_maria' : 'daily_prayer';
        const newFilename = `bendiga_app_${prayerName}_${today}.m4a`;
        const newUri = `${FileSystem.documentDirectory}${newFilename}`;

        await FileSystem.moveAsync({
          from: uri,
          to: newUri
        });

        // Save to AsyncStorage
        const timestamp = new Date().toISOString();
        const prayerRecording = {
          uri: newUri,
          timestamp,
          step,
          prayerName: step === 2 ? 'Padre Nuestro' : step === 3 ? 'Ave Maria' : 'Daily Prayer'
        };

        const existingRecordings = await AsyncStorage.getItem('prayerRecordings');
        const recordings = existingRecordings ? JSON.parse(existingRecordings) : [];
        recordings.push(prayerRecording);
        await AsyncStorage.setItem('prayerRecordings', JSON.stringify(recordings));
        await markPrayerAsCompleted(step);
      }

      // Always cleanup recording resources
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      });
      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  // Simplified cleanup effect for abrupt exits
  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync()
          .then(() => {
            Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: false,
            });
          })
          .catch(() => {
            // Silently handle any errors during cleanup
          });
      }
    };
  }, [recording]);

  // Add back handler effect
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (recording) {
        stopRecording();
      }
      return false; // Don't prevent default back behavior
    });

    return () => backHandler.remove();
  }, [recording]);

  // Load the daily prayer when component mounts
  useFocusEffect(
    React.useCallback(() => {
      const loadDailyPrayer = async () => {
        try {
          const prayer = await AsyncStorage.getItem('dailyPrayer11');
          console.log('Loaded prayer from storage:', prayer ? prayer.substring(0, 50) + '...' : 'null');
          
          if (prayer) {
            setDailyPrayer(prayer);
          } else {
            console.log('No daily prayer found in storage');
            setDailyPrayer('Please complete onboarding to set your daily prayer.');
          }
        } catch (error) {
          console.error('Error loading daily prayer:', error);
          setDailyPrayer('Error loading prayer. Please try again later.');
        }
      };

      loadDailyPrayer();
    }, [])
  );

  // Add useEffect to request permissions when component mounts
  useEffect(() => {
    const getPermissions = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        setHasPermission(status === 'granted');
        
        // Also need to set audio mode for recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        
        console.log('Permission status:', status);
      } catch (error) {
        console.error('Error requesting permissions:', error);
        setHasPermission(false);
      }
    };

    getPermissions();
  }, []);

  // Add this useEffect to handle the pulsing animation
  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation;
    
    if (isRecording) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
    };
  }, [isRecording]);

  // Add these functions at the top level
  const updateStreak = async () => {
    try {
      // Get existing streak data
      const streakData = await AsyncStorage.getItem('streakData');
      const today = new Date().toISOString().split('T')[0];
      
      // Also update the markedDates for the calendar
      const existingMarkedDates = await AsyncStorage.getItem('markedDates');
      const markedDates = existingMarkedDates ? JSON.parse(existingMarkedDates) : {};
      
      // Mark today's date
      markedDates[today] = { marked: true, dotColor: '#50C878' };
      await AsyncStorage.setItem('markedDates', JSON.stringify(markedDates));
      
      if (!streakData) {
        // Initialize streak data if it doesn't exist
        const initialData = {
          currentStreak: 1,
          lastCompletedDate: today,
          longestStreak: 1,
          completedDates: {
            [today]: true
          }
        };
        await AsyncStorage.setItem('streakData', JSON.stringify(initialData));
        return;
      }

      const data = JSON.parse(streakData);
      const lastDate = new Date(data.lastCompletedDate);
      const currentDate = new Date(today);
      const diffDays = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        data.currentStreak += 1;
        data.longestStreak = Math.max(data.currentStreak, data.longestStreak);
      } else if (diffDays > 1) {
        // Streak broken
        data.currentStreak = 1;
      } else if (diffDays === 0 && !data.completedDates[today]) {
        // First completion today
        data.completedDates[today] = true;
      }

      data.lastCompletedDate = today;
      data.completedDates[today] = true;

      await AsyncStorage.setItem('streakData', JSON.stringify(data));
      
      // Log the update for debugging
      console.log('Streak updated:', {
        currentStreak: data.currentStreak,
        lastCompletedDate: data.lastCompletedDate,
        markedDates: Object.keys(markedDates).length
      });
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={[styles.stepContainer, { marginTop: '-15%' }]}>
            <Image 
              source={require('../../assets/images/JESUS.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.stepTitle}>Prepare Your Heart</Text>
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.buttonText}>Begin Prayer</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Padre Nuestro</Text>
            <Text style={styles.prayerText}>{PRAYERS.padreNuestro}</Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }], marginTop: 24 }}>
              <TouchableOpacity 
                style={[
                  styles.recordButton,
                  isRecording && styles.recordingActive
                ]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <View style={styles.recordButtonContent}>
                  <Ionicons 
                    name="mic" 
                    size={24} 
                    color={isRecording ? "#ff4444" : "#ff4444"} 
                    style={styles.micIcon} 
                  />
                  <Text style={[styles.buttonTextRecord, isRecording && styles.recordingActiveText]}>
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
            {!isRecording && !recording && (
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={() => setStep(3)}
              >
                <Text style={styles.buttonText}>Next Prayer</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Ave María</Text>
            <Text style={styles.prayerText}>{PRAYERS.aveMaria}</Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity 
                style={[
                  styles.recordButton,
                  isRecording && styles.recordingActive
                ]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <View style={styles.recordButtonContent}>
                  <Ionicons 
                    name="mic" 
                    size={24} 
                    color={isRecording ? "#ff4444" : "#ff4444"} 
                    style={styles.micIcon} 
                  />
                  <Text style={[styles.buttonTextRecord, isRecording && styles.recordingActiveText]}>
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
            {!isRecording && !recording && (
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={() => setStep(4)}
              >
                <Text style={styles.buttonText}>Next Prayer</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Final Prayer</Text>
            <ScrollView 
              style={styles.prayerScrollContainer}
              contentContainerStyle={styles.prayerScrollContent}
            >
              <Text style={styles.prayerText}>
                {dailyPrayer}
              </Text>
            </ScrollView>
           
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity 
                style={[
                  styles.recordButton,
                  isRecording && styles.recordingActive
                ]}
                onPress={isRecording ? stopRecording : startRecording}
              >
                <View style={styles.recordButtonContent}>
                  <Ionicons 
                    name="mic" 
                    size={24} 
                    color={isRecording ? "#ff4444" : "#ff4444"} 
                    style={styles.micIcon} 
                  />
                  <Text style={[styles.buttonTextRecord, isRecording && styles.recordingActiveText]}>
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
            {!isRecording && !recording && (
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={async () => {
                  try {
                    await markPrayerAsCompleted(4);
                    await updateStreak();
                    console.log('All prayers completed, streak updated');
                    router.back();
                  } catch (error) {
                    console.error('Error completing prayers:', error);
                  }
                }}
              >
                <Text style={styles.buttonText}>Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View 
            key={i} 
            style={[
              styles.progressDot,
              i <= step ? styles.progressDotActive : styles.progressDotInactive
            ]} 
          />
        ))}
      </View>

      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  progressDotActive: {
    backgroundColor: Colors.light.primary,
  },
  progressDotInactive: {
    backgroundColor: '#E0E0E0',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#663399',
  },
  stepDescription: {
    marginTop: 28,
    fontSize: 18,
    textAlign: 'center',
    color: '#9370DB',
    marginBottom: 40,
  },
  nextButton: {
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: 40,
    paddingVertical: 19,
    borderRadius: 25,
    marginTop: 20,
    width: '70%',
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.light.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  recordButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#ff4444',
  },
  recordingActive: {
    backgroundColor: '#fff',
  },
  prayerText: {
    fontSize: 20,
    lineHeight: 24,
    textAlign: 'center',
    color: '#333',
    fontStyle: 'italic',
  },
  buttonTextRecord: {
    color: '#ff4444',
    fontSize: 18,
    fontWeight: '600',
  },
  recordingActiveText: {
    color: '#ff4444',
  },
  prayerScrollContainer: {
    maxHeight: 300,
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
  },
  prayerScrollContent: {
    padding: 16,
  },
  logo: {
    width: 320,
    height: 320,
    marginBottom: 30,
  },
  recordButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIcon: {
    marginRight: 8,
  },
});
