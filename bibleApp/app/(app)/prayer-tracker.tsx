import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Alert, Linking } from 'react-native';
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

  return (
    <View style={styles.container}>
      <StreakDisplay streak={3} />
      <Calendar
        markedDates={markedDates}
        theme={{
          todayTextColor: '#00adf5',
          selectedDayBackgroundColor: '#00adf5',
          dotColor: '#50C878',
        }}
      />
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
});