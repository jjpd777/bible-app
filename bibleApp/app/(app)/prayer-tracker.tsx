import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Alert, Linking, Animated } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { StreakDisplay } from '../../components/StreakDisplay';
import { PrayerButton } from '../../components/PrayerButton';
import { Audio } from 'expo-av';

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

  // Move setSelectedPrayer into PrayerBox through props
  const handlePrayerSelect = (title: string) => {
    setSelectedPrayer(title);
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
      
      if (selectedPrayer) {
        const newCompletedPrayers = new Set(completedPrayers).add(selectedPrayer);
        setCompletedPrayers(newCompletedPrayers);
        
        // If all prayers are completed, mark the calendar
        if (checkAllPrayersCompleted(newCompletedPrayers)) {
          const today = new Date().toISOString().split('T')[0];
          setMarkedDates(prev => ({
            ...prev,
            [today]: { marked: true, dotColor: '#50C878' }
          }));
        }
      }
      
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

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.statsButton}
        onPress={toggleStats}
      >
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
        {prayers.map((prayer) => (
          <PrayerBox 
            key={prayer.title}
            {...prayer}
            isCompleted={completedPrayers.has(prayer.title)}
            onPress={setSelectedPrayer}
          />
        ))}
      </View>

      <Modal
        visible={!!selectedPrayer}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPrayer(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedPrayer}</Text>
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
              {isRecording ? 'Recording...' : 'Hold to record'}
            </Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => {
                if (recording) {
                  stopRecording();
                }
                setSelectedPrayer(null);
              }}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* <PrayerButton onPress={() => console.log('Prayer marked')} /> */}
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
});