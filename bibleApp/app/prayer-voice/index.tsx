import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SavedPrayer {
  id: number;
  text: string;
  audioPath: string | null;
}

export default function PrayerVoiceView() {
  const params = useLocalSearchParams<{ prayer: string }>();
  const [currentPrayer, setCurrentPrayer] = useState<SavedPrayer>(JSON.parse(params.prayer));
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  }

  async function stopRecording() {
    try {
      if (!recording) return;

      await recording.stopAndUnloadAsync();
      setIsRecording(false);

      const uri = recording.getURI();
      if (!uri) throw new Error('No recording URI available');

      // Delete previous recording if it exists
      if (currentPrayer.audioPath) {
        try {
          await FileSystem.deleteAsync(currentPrayer.audioPath);
        } catch (err) {
          console.log('Error deleting previous recording:', err);
        }
      }

      const fileName = `prayer_${currentPrayer.id}_${Date.now()}.m4a`;
      const newPath = `${FileSystem.documentDirectory}prayers/${fileName}`;

      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}prayers/`, {
        intermediates: true
      });

      await FileSystem.moveAsync({
        from: uri,
        to: newPath
      });

      // Unload previous sound if it exists
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }

      const savedPrayers = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayers) {
        const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
        const updatedPrayers = prayers.map(p => 
          p.id === currentPrayer.id ? { ...p, audioPath: newPath } : p
        );
        await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
        setCurrentPrayer({ ...currentPrayer, audioPath: newPath });
      }

      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  }

  async function playSound() {
    try {
      if (!currentPrayer.audioPath) return;

      // Check if file exists before trying to play it
      const fileInfo = await FileSystem.getInfoAsync(currentPrayer.audioPath);
      if (!fileInfo.exists) {
        console.log('Audio file not found');
        // Update prayer to remove invalid audio path
        const savedPrayers = await AsyncStorage.getItem('savedPrayers');
        if (savedPrayers) {
          const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
          const updatedPrayers = prayers.map(p => 
            p.id === currentPrayer.id ? { ...p, audioPath: null } : p
          );
          await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
          setCurrentPrayer({ ...currentPrayer, audioPath: null });
        }
        return;
      }

      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: currentPrayer.audioPath },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      }
    } catch (err) {
      console.error('Failed to play sound', err);
      // If there's an error, clean up the invalid audio path
      const savedPrayers = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayers) {
        const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
        const updatedPrayers = prayers.map(p => 
          p.id === currentPrayer.id ? { ...p, audioPath: null } : p
        );
        await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
        setCurrentPrayer({ ...currentPrayer, audioPath: null });
      }
    }
  }

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.prayerContainer}>
        <Text style={styles.prayerText}>{currentPrayer.text}</Text>
      </ScrollView>
      
      <TouchableOpacity 
        style={styles.audioStatus}
        onPress={currentPrayer.audioPath ? playSound : undefined}
      >
        <Text style={styles.audioStatusText}>
          {currentPrayer.audioPath 
            ? `🎵 ${isPlaying ? 'Playing...' : 'Tap to Play'}`
            : '🔇 No Audio Recording'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, isRecording && styles.recordingButton]} 
        onPress={handleRecordPress}
      >
        <Text style={styles.buttonText}>
          {isRecording ? 'Stop Recording' : 'Grabar oración'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => {}}>
        <Text style={styles.buttonText}>Generar Voz</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  prayerContainer: {
    maxHeight: '50%',
    marginTop: 100,
    marginBottom: 16,
  },
  prayerText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  audioStatus: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 16,
  },
  audioStatusText: {
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#FF3B30',
  },
  secondaryButton: {
    backgroundColor: '#5856D6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
