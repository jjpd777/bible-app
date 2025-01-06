import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Alert, Linking, Animated, BackHandler } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { StreakDisplay } from '../../components/StreakDisplay';
import { PrayerButton } from '../../components/PrayerButton';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Add this notification handler setup at the top level
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const scheduleSingleNotification = async (time: Date, isWakeTime: boolean) => {
  try {
    // Get existing notifications for logging
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('\n=== Current Scheduled Notifications ===');
    existingNotifications.forEach((notification, index) => {
      console.log(`Notification ${index + 1}:`, {
        id: notification.identifier,
        title: notification.content.title,
        body: notification.content.body,
        trigger: notification.trigger,
      });
    });

    const notificationType = isWakeTime ? "Morning" : "Evening";
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${notificationType} Prayer Time`,
        body: `Time for your ${notificationType.toLowerCase()} prayers 🙏`,
        sound: true,
      },
      trigger: {
        hour: time.getHours(),
        minute: time.getMinutes(),
        repeats: true,
      },
    });

    console.log(`\n=== New ${notificationType} Notification Scheduled ===`);
    console.log({
      id: id,
      type: notificationType,
      scheduledTime: `${time.getHours()}:${time.getMinutes()}`,
      repeats: true
    });

    // Schedule a test notification in 5 seconds to verify it's working
    const testId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Notification Test",
        body: `${notificationType} prayers will be at ${time.getHours()}:${time.getMinutes()}`,
        sound: true,
      },
      trigger: { seconds: 5 }
    });

    console.log('\n=== Test Notification Scheduled ===');
    console.log({
      id: testId,
      type: 'Test',
      delay: '5 seconds'
    });

    // Get final state of notifications
    const updatedNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('\n=== Final Scheduled Notifications State ===');
    updatedNotifications.forEach((notification, index) => {
      console.log(`Notification ${index + 1}:`, {
        id: notification.identifier,
        title: notification.content.title,
        body: notification.content.body,
        trigger: notification.trigger,
      });
    });

  } catch (error) {
    console.error('Failed to schedule notification:', error);
  }
};

interface PrayerBoxProps {
  title: string;
  icon: string;
  color: string;
  isCompleted?: boolean;
  onPress: (title: string) => void;
}

// Move PrayerBox outside the main component
const PrayerBox: React.FC<PrayerBoxProps> = ({ title, icon, color, isCompleted, onPress }) => (
  <TouchableOpacity 
    style={[styles.prayerBox, { backgroundColor: color }]}
    onPress={() => onPress(title)}
  >
    <View style={styles.prayerBoxContent}>
      <Text style={styles.prayerBoxIcon}>{icon}</Text>
      <Text style={styles.prayerBoxText}>{title}</Text>
      {isCompleted && <Text style={styles.checkmark}>✓</Text>}
    </View>
  </TouchableOpacity>
);

export default function PrayerTrackerScreen() {
  const [selectedPrayer, setSelectedPrayer] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [completedPrayers, setCompletedPrayers] = useState<Set<string>>(new Set());
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

  const prayers: PrayerBoxProps[] = [
    { 
      title: "Padre Nuestro", 
      icon: "🙏", 
      color: '#FFE4E1' // Misty Rose
    },
    { 
      title: "Santa Maria", 
      icon: "👼", 
      color: '#E0FFFF' // Light Cyan
    },
    { 
      title: "Angel de la Guarda", 
      icon: "⭐", 
      color: '#F0FFF0' // Honeydew
    },
  ];

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
        }
      }
    }
  };

  // Request permissions when component mounts
  useEffect(() => {
    (async () => {
      try {
        console.log('Requesting audio permissions...');
        const permission = await Audio.requestPermissionsAsync();
        console.log('Permission response:', permission);
        
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        setHasPermission(permission.status === 'granted');
        
        if (permission.status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please enable microphone access in your device settings to record prayers.',
            [
              {
                text: 'Open Settings',
                onPress: () => {
                  // On iOS this will open app settings
                  // On Android this will open app settings
                  Linking.openSettings();
                }
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        }
      } catch (error) {
        console.error('Error requesting permissions:', error);
      }
    })();
  }, []);

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

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  // Helper function to check if all prayers are completed
  const checkAllPrayersCompleted = (prayers: Set<string>) => {
    return prayers.size === 3; // Since we have 3 prayers total
  };

  const stopRecording = async () => {
    if (!recording || !isRecording) {
      console.log('No active recording to stop');
      return;
    }

    try {
      console.log('Stopping recording...');
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      setShowNextButton(true); // Show the next button after recording stops
      console.log('Recording stopped successfully');
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
    setRecording(null);
  };

  const toggleStats = () => {
    console.log('Toggling stats. Current state:', isStatsVisible);
    setIsStatsVisible(!isStatsVisible);
    Animated.timing(animatedHeight, {
      toValue: isStatsVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      console.log('Animation completed. New state:', !isStatsVisible);
    });
  };

  const startPrayerMode = () => {
    setPrayerModeActive(true);
    setCurrentPrayerIndex(0);
    setSelectedPrayer(prayers[0].title);
    setTempCompletedPrayers(new Set());
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

  // Add this helper function to format times
  const formatTime = (date: Date | null) => {
    if (!date) return 'Not set';
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const openTimeEditor = (type: 'wake' | 'sleep') => {
    setEditingTimeType(type);
    setTempTime(type === 'wake' ? wakeTime : sleepTime);
    setIsTimeModalVisible(true);
  };

  const saveTimeChanges = async () => {
    if (!tempTime || !editingTimeType) return;

    try {
      const onboardingDataString = await AsyncStorage.getItem('onboardingData');
      if (onboardingDataString) {
        const onboardingData = JSON.parse(onboardingDataString);
        const updatedData = {
          ...onboardingData,
          [editingTimeType === 'wake' ? 'wakeTime' : 'sleepTime']: tempTime.toISOString()
        };
        
        await AsyncStorage.setItem('onboardingData', JSON.stringify(updatedData));
        
        // Schedule notification based on the type
        await scheduleSingleNotification(tempTime, editingTimeType === 'wake');
        
        if (editingTimeType === 'wake') {
          setWakeTime(tempTime);
        } else {
          setSleepTime(tempTime);
        }
      }
    } catch (error) {
      console.error('Error saving time:', error);
    }

    setIsTimeModalVisible(false);
    setEditingTimeType(null);
  };

  const adjustTime = (amount: number, unit: 'hours' | 'minutes') => {
    if (!tempTime) return;
    
    const newTime = new Date(tempTime);
    if (unit === 'hours') {
      newTime.setHours(newTime.getHours() + amount);
    } else {
      newTime.setMinutes(newTime.getMinutes() + amount);
    }
    setTempTime(newTime);
  };

  return (
    <View style={styles.container}>
      {prayerModeActive ? (
        <View style={styles.prayerModeContainer}>
          <TouchableOpacity 
            style={styles.exitButton}
            onPress={confirmExitPrayerMode}
          >
            <Text style={styles.exitButtonText}>✕</Text>
          </TouchableOpacity>
          
          <Text style={styles.prayerModeTitle}>{selectedPrayer}</Text>
          
          {!showNextButton ? (
            <>
              <TouchableOpacity 
                style={[
                  styles.micButton,
                  isRecording ? styles.micButtonRecording : null
                ]}
                onLongPress={startRecording}
                onPressOut={stopRecording}
              >
                <Text style={styles.micButtonText}>🎤</Text>
              </TouchableOpacity>
              <Text style={styles.recordingText}>
                {isRecording ? 'Grabando...' : 'Mantén presionado para grabar'}
              </Text>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={() => {
                handlePrayerComplete();
                setShowNextButton(false);
              }}
            >
              <Text style={styles.nextButtonText}>
                {currentPrayerIndex === prayers.length - 1 
                  ? 'Finalizar Modo Oración' 
                  : 'Siguiente Oración'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.timesContainer}>
            <TouchableOpacity 
              style={styles.timeBox} 
              onPress={() => openTimeEditor('wake')}
            >
              <Text style={styles.timeLabel}>Despertar</Text>
              <Text style={styles.timeValue}>{wakeTime ? formatTime(wakeTime) : 'Loading...'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.timeBox} 
              onPress={() => openTimeEditor('sleep')}
            >
              <Text style={styles.timeLabel}>Dormir</Text>
              <Text style={styles.timeValue}>{sleepTime ? formatTime(sleepTime) : 'Loading...'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.statsButton} onPress={toggleStats}>
            <View style={styles.statsButtonContent}>
              <View style={styles.streakContainer}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <View style={styles.streakTextContainer}>
                  <Text style={styles.streakCount}>3</Text>
                  <Text style={styles.streakLabel}>días seguidos</Text>
                </View>
              </View>
              <View style={styles.expandButtonContainer}>
                <Text style={styles.statsButtonText}>
                  {isStatsVisible ? "Ver menos" : "Ver más"}
                </Text>
                <Text style={styles.arrowIcon}>{isStatsVisible ? "▼" : "▲"}</Text>
              </View>
            </View>
          </TouchableOpacity>

          <Animated.View style={[
            styles.statsContainer,
            {
              maxHeight: animatedHeight.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 600],
              }),
              opacity: animatedHeight,
              overflow: 'hidden',
            }
          ]}>
            <View style={styles.statsContent}>
              <Calendar
                style={styles.calendar}
                hideExtraDays={false}
                markedDates={markedDates}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#666',
                  selectedDayBackgroundColor: '#50C878',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#50C878',
                  dayTextColor: '#333',
                  textDisabledColor: '#d9e1e8',
                  dotColor: '#50C878',
                  monthTextColor: '#333',
                  textMonthFontWeight: 'bold',
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                }}
              />
            </View>
          </Animated.View>

          <View style={styles.prayerBoxesContainer}>
            <TouchableOpacity 
              style={styles.prayerModeButton}
              onPress={startPrayerMode}
            >
              <Text style={styles.prayerModeButtonText}>Comenzar Modo Oración</Text>
            </TouchableOpacity>

            {prayers.map((prayer) => (
              <PrayerBox 
                key={prayer.title}
                {...prayer}
                isCompleted={completedPrayers.has(prayer.title)}
                onPress={handlePrayerSelect}
              />
            ))}
          </View>
        </>
      )}
      <Modal
        visible={isTimeModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTimeType === 'wake' ? 'Ajustar Hora de Despertar' : 'Ajustar Hora de Dormir'}
            </Text>
            
            <View style={styles.timeEditor}>
              <View style={styles.timeAdjuster}>
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => adjustTime(1, 'hours')}
                >
                  <Text style={styles.timeButtonText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.timeDisplay}>
                  {tempTime?.getHours().toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => adjustTime(-1, 'hours')}
                >
                  <Text style={styles.timeButtonText}>▼</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.timeSeparator}>:</Text>
              
              <View style={styles.timeAdjuster}>
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => adjustTime(5, 'minutes')}
                >
                  <Text style={styles.timeButtonText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.timeDisplay}>
                  {tempTime?.getMinutes().toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => adjustTime(-5, 'minutes')}
                >
                  <Text style={styles.timeButtonText}>▼</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsTimeModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveTimeChanges}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
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
  },
  statsButtonContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  streakTextContainer: {
    flexDirection: 'column',
  },
  streakCount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  streakLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
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
    backgroundColor: '#50C878',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  prayerModeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
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
  timeBox: {
    alignItems: 'center',
    flex: 1,
    padding: 20,  // Make the touch target bigger
  },
  timeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 24,  // Make the time bigger
    fontWeight: '600',
    color: '#333',
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
    color: '#007AFF',
  },
  timeDisplay: {
    fontSize: 40,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  timeSeparator: {
    fontSize: 40,
    fontWeight: 'bold',
    marginHorizontal: 10,
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
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButtonText: {
    color: '#333',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
  },
});