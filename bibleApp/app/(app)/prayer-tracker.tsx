import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Alert, Linking, Animated, BackHandler, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { StreakDisplay } from '../../components/StreakDisplay';
import { PrayerButton } from '../../components/PrayerButton';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';

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
    // First, let's cancel any existing notifications
    const existingNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('\n=== Current Scheduled Notifications ===');
    console.log(`Found ${existingNotifications.length} existing notifications`);
    
    // Cancel existing notifications of the same type
    for (const notification of existingNotifications) {
      if (notification.content.title?.includes(isWakeTime ? "Morning" : "Evening")) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        console.log(`Cancelled existing ${isWakeTime ? "morning" : "evening"} notification: ${notification.identifier}`);
      }
    }

    const notificationType = isWakeTime ? "Morning" : "Evening";
    
    // Create a new Date object for today with the specified time
    const now = new Date();
    const scheduledTime = new Date(now);
    scheduledTime.setHours(time.getHours());
    scheduledTime.setMinutes(time.getMinutes());
    scheduledTime.setSeconds(0);
    
    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const trigger = scheduledTime;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${notificationType} Prayer Time`,
        body: `Time for your ${notificationType.toLowerCase()} prayers 🙏`,
        sound: true,
      },
      trigger,
    });

    console.log('\n=== New Notification Scheduled ===');
    console.log({
      id,
      type: notificationType,
      scheduledTime: scheduledTime.toLocaleTimeString(),
      scheduledDate: scheduledTime.toLocaleDateString(),
      trigger: {
        timestamp: scheduledTime.getTime(),
        date: scheduledTime.toISOString(),
      },
    });

    // Verify the notification was scheduled
    const verifyNotifications = await Notifications.getAllScheduledNotificationsAsync();
    console.log('\n=== Verification of Scheduled Notifications ===');
    verifyNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. Notification ID: ${notification.identifier}`);
      console.log('   Title:', notification.content.title);
      console.log('   Trigger:', notification.trigger);
      console.log('   Scheduled Time:', new Date(notification.trigger.seconds * 1000).toLocaleString());
    });

    return id;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    throw error;
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

  // Add this useEffect right after your existing useEffect that loads onboarding data
  useEffect(() => {
    const loadPrayerNames = async () => {
      try {
        const onboardingDataString = await AsyncStorage.getItem('onboardingData');
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          console.log('Loaded prayer names:', onboardingData.prayerNames);
          setSavedPrayerNames(onboardingData.prayerNames);
        } else {
          console.log('No onboarding data found');
        }
      } catch (error) {
        console.error('Error loading prayer names:', error);
      }
    };

    loadPrayerNames();
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
        
        // Schedule the daily notification
        const notificationId = await scheduleSingleNotification(
          tempTime, 
          editingTimeType === 'wake'
        );

        if (editingTimeType === 'wake') {
          setWakeTime(tempTime);
        } else {
          setSleepTime(tempTime);
        }

        // Schedule immediate confirmation notification
        const confirmationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "Prayer Time Updated",
            body: `Your ${editingTimeType} time has been set to ${formatTime(tempTime)}. You will be notified daily at this time.`,
            sound: true,
          },
          trigger: { seconds: 5 }
        });

        console.log('\n=== Confirmation Notification Scheduled ===');
        console.log({
          id: confirmationId,
          type: 'Confirmation',
          message: `${editingTimeType} time set to ${formatTime(tempTime)}`,
          delay: '5 seconds'
        });

        // Final verification of all scheduled notifications
        const finalNotifications = await Notifications.getAllScheduledNotificationsAsync();
        console.log('\n=== Final Verification of All Scheduled Notifications ===');
        console.log(`Total scheduled notifications: ${finalNotifications.length}`);
        finalNotifications.forEach((notification, index) => {
          console.log(`${index + 1}. Notification Details:`);
          console.log('   ID:', notification.identifier);
          console.log('   Title:', notification.content.title);
          console.log('   Body:', notification.content.body);
          console.log('   Trigger:', notification.trigger);
        });
      }
    } catch (error) {
      console.error('Error saving time:', error);
      Alert.alert('Error', 'Failed to save time settings');
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
      newTime.setMinutes(newTime.getMinutes() + amount);  // Changed from +/- 5 to +/- 1
    }
    setTempTime(newTime);
  };

  const checkPrayerCompletion = async (prayerNumber: number) => {
    const today = new Date().toISOString().split('T')[0];
    const prayerKey = `prayer_${prayerNumber}_${today}`;
    const status = await AsyncStorage.getItem(prayerKey);
    console.log(`Checking prayer ${prayerNumber}:`, { prayerKey, status });
    return status === 'completed';
  };

  // Replace useEffect with useFocusEffect
  useFocusEffect(
    React.useCallback(() => {
      const loadCompletionStatus = async () => {
        console.log('Loading completion status...');
        const status = {
          2: await checkPrayerCompletion(2), // Padre Nuestro
          3: await checkPrayerCompletion(3), // Ave María
          4: await checkPrayerCompletion(4), // Final Prayer
        };
        console.log('Completion status loaded:', status);
        setCompletedPrayers(status);
      };

      loadCompletionStatus();
    }, [])
  );

  return (
    <View style={styles.container}>
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

      <ScrollView style={styles.prayersContainer}>
        <View style={styles.prayerCard}>
          <Text style={styles.prayerTitle}>Daily Prayer</Text>
          <Text style={styles.prayerText}>
            Dear Heavenly Father,{'\n\n'}
            Please watch over and protect {savedPrayerNames.map((name, index) => {
              if (index === 0) return name;
              if (index === savedPrayerNames.length - 1) return ` and ${name}`;
              return `, ${name}`;
            })}. Guide them with Your wisdom, fill their hearts with Your love, and bless them with Your grace. Help them feel Your presence in their lives today and always.{'\n\n'}
            In Jesus' name,{'\n'}
            Amen.
          </Text>
        </View>

        <View style={styles.prayerList}>
          <View style={styles.prayerItem}>
            <Text>Padre Nuestro [{completedPrayers[2] ? 'X' : '-'}]</Text>
          </View>

          <View style={styles.prayerItem}>
            <Text>Ave María [{completedPrayers[3] ? 'X' : '-'}]</Text>
          </View>

          <View style={styles.prayerItem}>
            <Text>Final Prayer [{completedPrayers[4] ? 'X' : '-'}]</Text>
          </View>

          {/* Reset Button */}
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={async () => {
              const today = new Date().toISOString().split('T')[0];
              try {
                // Remove all prayer entries for today
                await AsyncStorage.removeItem(`prayer_2_${today}`);
                await AsyncStorage.removeItem(`prayer_3_${today}`);
                await AsyncStorage.removeItem(`prayer_4_${today}`);
                
                // Reset the state
                setCompletedPrayers({});
                
                console.log('Prayer status reset successfully');
              } catch (error) {
                console.error('Error resetting prayer status:', error);
              }
            }}
          >
            <Text style={styles.resetButtonText}>Reset Today's Prayers</Text>
          </TouchableOpacity>

    
        </View>
      </ScrollView>

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
                  onPress={() => adjustTime(1, 'minutes')}
                >
                  <Text style={styles.timeButtonText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.timeDisplay}>
                  {tempTime?.getMinutes().toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity 
                  style={styles.timeButton}
                  onPress={() => adjustTime(-1, 'minutes')}
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

      <TouchableOpacity 
        style={styles.prayerModeButton}
        onPress={() => router.push('/prayer-mode')}
      >
        <Text style={styles.prayerModeButtonText}>Start Prayer Mode</Text>
      </TouchableOpacity>
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
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  prayerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  prayerText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  prayerList: {
    marginTop: 20,
    padding: 16,
  },
  prayerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    color: '#50C878',
    fontSize: 20,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#50C878',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});