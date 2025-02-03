import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

interface SavedPrayer {
  id: number;
  text: string;
  audioPath: string | null;
  generatedAudioPath: string | null;
}

export default function PrayerVoiceView() {
  const params = useLocalSearchParams<{ prayer: string }>();
  const [currentPrayer, setCurrentPrayer] = useState<SavedPrayer>(JSON.parse(params.prayer));
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedSound, setRecordedSound] = useState<Audio.Sound | null>(null);
  const [generatedSound, setGeneratedSound] = useState<Audio.Sound | null>(null);
  const [isRecordedPlaying, setIsRecordedPlaying] = useState(false);
  const [isGeneratedPlaying, setIsGeneratedPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    return () => {
      // Cleanup both sounds
      if (recordedSound) recordedSound.unloadAsync();
      if (generatedSound) generatedSound.unloadAsync();
    };
  }, [recordedSound, generatedSound]);

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
      if (recordedSound) {
        await recordedSound.unloadAsync();
        setRecordedSound(null);
        setIsRecordedPlaying(false);
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

      if (recordedSound) {
        if (isRecordedPlaying) {
          await recordedSound.pauseAsync();
          setIsRecordedPlaying(false);
        } else {
          await recordedSound.playAsync();
          setIsRecordedPlaying(true);
        }
      } else {
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: currentPrayer.audioPath },
          { shouldPlay: true }
        );
        setRecordedSound(newSound);
        setIsRecordedPlaying(true);

        newSound.setOnPlaybackStatusUpdate(async (status) => {
          if (status.didJustFinish) {
            setIsRecordedPlaying(false);
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

  async function generateVoice() {
    try {
      setIsGenerating(true);
      
      const response = await fetch(
        'https://api.elevenlabs.io/v1/text-to-speech/l1zE9xgNpUTaQCZzpNJa',
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': Constants.expoConfig?.extra?.ELEVEN_LABS_KEY || '',
          },
          body: JSON.stringify({
            text: currentPrayer.text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.3,
              similarity_boost: 0.85,
              style: 0.2,
            }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response status:', response.status);
        console.error('Response headers:', response.headers);
        console.error('Error details:', errorText);
        throw new Error(`Failed to generate audio: ${response.status} - ${errorText}`);
      }

      const audioBlob = await response.blob();
      const reader = new FileReader();
      const base64Audio = await new Promise((resolve) => {
        reader.onload = () => {
          const base64 = reader.result?.toString().split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      // Delete previous generated audio if it exists
      if (currentPrayer.generatedAudioPath) {
        try {
          await FileSystem.deleteAsync(currentPrayer.generatedAudioPath);
        } catch (err) {
          console.log('Error deleting previous generated audio:', err);
        }
      }

      const fileName = `prayer_${currentPrayer.id}_generated_${Date.now()}.mp3`;
      const newPath = `${FileSystem.documentDirectory}prayers/${fileName}`;

      await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}prayers/`, {
        intermediates: true
      });

      await FileSystem.writeAsStringAsync(newPath, base64Audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Update the prayer with the new generatedAudioPath
      const savedPrayers = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayers) {
        const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
        const updatedPrayers = prayers.map(p => 
          p.id === currentPrayer.id ? { ...p, generatedAudioPath: newPath } : p
        );
        await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
        setCurrentPrayer({ ...currentPrayer, generatedAudioPath: newPath });
      }
    } catch (err) {
      console.error('Failed to generate voice:', err);
      console.error('API Key present:', !!Constants.expoConfig?.extra?.ELEVEN_LABS_KEY);
      console.error('Prayer text length:', currentPrayer.text.length);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }

  async function playGeneratedSound() {
    try {
      if (!currentPrayer.generatedAudioPath) return;

      // Check if file exists before trying to play it
      const fileInfo = await FileSystem.getInfoAsync(currentPrayer.generatedAudioPath);
      if (!fileInfo.exists) {
        console.log('Generated audio file not found');
        // Update prayer to remove invalid generated audio path
        const savedPrayers = await AsyncStorage.getItem('savedPrayers');
        if (savedPrayers) {
          const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
          const updatedPrayers = prayers.map(p => 
            p.id === currentPrayer.id ? { ...p, generatedAudioPath: null } : p
          );
          await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
          setCurrentPrayer({ ...currentPrayer, generatedAudioPath: null });
        }
        return;
      }

      if (generatedSound) {
        await generatedSound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: currentPrayer.generatedAudioPath },
        { shouldPlay: true }
      );
      setGeneratedSound(newSound);
      setIsGeneratedPlaying(true);

      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.didJustFinish) {
          setIsGeneratedPlaying(false);
        }
      });
    } catch (err) {
      console.error('Failed to play generated sound', err);
      // Clean up invalid generated audio path
      const savedPrayers = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayers) {
        const prayers: SavedPrayer[] = JSON.parse(savedPrayers);
        const updatedPrayers = prayers.map(p => 
          p.id === currentPrayer.id ? { ...p, generatedAudioPath: null } : p
        );
        await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
        setCurrentPrayer({ ...currentPrayer, generatedAudioPath: null });
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
      <View style={styles.headerContainer}>
        <Text style={styles.title}>{currentPrayer.title}</Text>
        <TouchableOpacity 
          style={[styles.generateButton, isGenerating && styles.disabledButton]} 
          onPress={currentPrayer.generatedAudioPath ? playGeneratedSound : generateVoice}
          disabled={isGenerating}
        >
          <Text style={styles.generateButtonText}>
            {isGenerating ? 'Generando...' : 
             currentPrayer.generatedAudioPath ? 'Voz artificial' : 'Generar Voz'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.prayerContainer}>
        <Text style={styles.prayerText}>{currentPrayer.text}</Text>
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, recording && styles.activeButton]} 
          onPress={recording ? stopRecording : startRecording}
        >
          <Text style={styles.buttonText}>
            {recording ? 'Detener Grabación' : 'Grabar Oración'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={playSound}
          disabled={!currentPrayer.audioPath}
        >
          <Text style={styles.buttonText}>Reproducir Voz</Text>
        </TouchableOpacity>
      </View>
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
  disabledButton: {
    opacity: 0.5,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  generateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
