import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Calendar } from 'react-native-calendars';
import { StreakDisplay } from '../../components/StreakDisplay';
import { PrayerButton } from '../../components/PrayerButton';

export default function PrayerTrackerScreen() {
  const [selectedPrayer, setSelectedPrayer] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const getPermissions = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        console.log('Audio permission status:', status);
        setHasPermission(status === 'granted');
        
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'This app needs access to your microphone to record prayers.',
            [
              { 
                text: 'OK', 
                onPress: () => console.log('Permission alert closed') 
              }
            ]
          );
        }
      } catch (err) {
        console.error('Error requesting permissions:', err);
      }
    };

    getPermissions();
  }, []);

  // Temporary mock data
  const mockMarkedDates = {
    '2024-03-10': { marked: true, dotColor: '#50C878' },
    '2024-03-11': { marked: true, dotColor: '#50C878' },
    '2024-03-12': { marked: true, dotColor: '#50C878' },
  };

  const PrayerBox = ({ title }: { title: string }) => (
    <TouchableOpacity 
      style={styles.prayerBox}
      onPress={() => setSelectedPrayer(title)}
    >
      <Text style={styles.prayerBoxText}>{title}</Text>
    </TouchableOpacity>
  );

  const startRecording = async () => {
    try {
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Please grant microphone permission to record prayers.');
        return;
      }

      if (isRecording) {
        console.log('Already recording, skipping...');
        return;
      }

      console.log('Starting recording...');
      setIsRecording(true);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      console.log('Recording started successfully');
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
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
        markedDates={mockMarkedDates}
        onDayPress={(day) => {
          console.log('selected day', day);
        }}
        theme={{
          todayTextColor: '#00adf5',
          selectedDayBackgroundColor: '#00adf5',
          dotColor: '#50C878',
        }}
      />
      <View style={styles.prayerBoxesContainer}>
        <PrayerBox title="Padre Nuestro" />
        <PrayerBox title="Santa Maria" />
        <PrayerBox title="Angel de la Guarda" />
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

      <PrayerButton onPress={() => console.log('Prayer marked')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  prayerBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
  },
  prayerBox: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    width: '30%',
    alignItems: 'center',
  },
  prayerBoxText: {
    fontSize: 12,
    textAlign: 'center',
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