import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Sharing from 'expo-sharing';
import { ref, getDownloadURL } from 'firebase/storage';
import { Asset } from 'expo-asset';
import { storage } from '../../config/firebase';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [checkboxes, setCheckboxes] = useState({
    a: false,
    b: false
  });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const prodBackend = true ? "https://bendiga-media-backend.replit.app" : "https://0cb3df08-f19f-4e55-add7-4513e781f46c-00-2lvwkm65uqcmj.spock.replit.dev"; 

  // Separate cleanup for recorded sound
  useEffect(() => {
    return () => {
      if (recordedSound) recordedSound.unloadAsync();
    };
  }, [recordedSound]);

  // Separate cleanup for generated sound
  useEffect(() => {
    return () => {
      if (generatedSound) generatedSound.unloadAsync();
    };
  }, [generatedSound]);

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

      // If currently playing, pause it
      if (generatedSound && isGeneratedPlaying) {
        await generatedSound.pauseAsync();
        setIsGeneratedPlaying(false);
        return;
      }

      // If we have a paused sound, resume it
      if (generatedSound && !isGeneratedPlaying) {
        await generatedSound.playAsync();
        setIsGeneratedPlaying(true);
        return;
      }

      // If no sound loaded yet, create and play new sound
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
      </View>

      <ScrollView style={styles.prayerContainer}>
        <Text style={styles.prayerText}>{currentPrayer.text}</Text>
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.iconButton, isRecording && styles.activeButton]} 
          onPress={handleRecordPress}
        >
          <Ionicons 
            name={isRecording ? "mic-off" : "mic"} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.iconButton, isGenerating && styles.disabledButton]} 
          onPress={currentPrayer.generatedAudioPath ? playGeneratedSound : generateVoice}
          disabled={isGenerating}
        >
          <View style={styles.buttonContentRow}>
            <Text style={styles.generateButtonText}>
              {isGenerating ? 'Generando...' : ''}
            </Text>
            <MaterialCommunityIcons name="robot-happy" size={24} color="black" />
          </View>
        </TouchableOpacity>

        {currentPrayer.audioPath && !isRecording && (
          <TouchableOpacity 
            style={[styles.iconButton, styles.secondaryButton]} 
            onPress={playSound}
          >
            <Ionicons 
              name={isRecordedPlaying ? "pause" : "play"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        )}

        {(currentPrayer.audioPath || currentPrayer.generatedAudioPath) && (
          <TouchableOpacity 
            style={[
              styles.iconButton, 
              { backgroundColor: '#4CAF50' },
              isProcessing && styles.disabledButton
            ]} 
            onPress={async () => {
              if (isProcessing) return;
              setIsProcessing(true);
              const formData = new FormData();
              
              if (currentPrayer.audioPath) {
                formData.append('recordedSound', {
                  uri: currentPrayer.audioPath,
                  type: 'audio/m4a',
                  name: 'recorded_audio.m4a'
                });
              }
              
              if (currentPrayer.generatedAudioPath) {
                formData.append('generatedSound', {
                  uri: currentPrayer.generatedAudioPath,
                  type: 'audio/mp3',
                  name: 'generated_audio.mp3'
                });
              }

              try {
                const response = await fetch(prodBackend +'/api/uploadAudio', {
                  method: 'POST',
                  body: formData,
                  headers: {
                    'Content-Type': 'multipart/form-data',
                  },
                });
                
                if (!response.ok) throw new Error('Upload failed');
                const responseData = await response.json();
                console.log('Storage URL:', responseData);

                // Get Firebase download URL
                const imageRef = ref(storage, responseData.url.replace('gs://bendiga-4d926.firebasestorage.app/', ''));
                const downloadURL = await getDownloadURL(imageRef);

                // Create asset from URL
                const asset = await Asset.fromURI(downloadURL);
                await asset.downloadAsync();

                // Share the asset
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(asset.localUri!, {
                    mimeType: 'audio/mp3',
                    dialogTitle: 'Share Combined Audio',
                    UTI: 'public.mp3'
                  });
                }
              } catch (error) {
                console.error('Error uploading files:', error);
              } finally {
                setIsProcessing(false);
              }
            }}
            disabled={isProcessing}
          >
            <Ionicons 
              name={isProcessing ? "timer-outline" : "cloud-upload"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        )}
      </View>

      {isModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>¿Qué deseas compartir?</Text>
            
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setCheckboxes(prev => ({ ...prev, a: !prev.a }))}
            >
              <View style={[styles.checkbox, checkboxes.a && styles.checkboxChecked]}>
                {checkboxes.a && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={styles.checkboxLabel}>Oración de I.A.</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setCheckboxes(prev => ({ ...prev, b: !prev.b }))}
            >
              <View style={[styles.checkbox, checkboxes.b && styles.checkboxChecked]}>
                {checkboxes.b && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={styles.checkboxLabel}>Grabación tuya</Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>Compartir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    justifyContent: 'center',  // Center horizontally
    alignItems: 'center',      // Center vertically
    gap: 20,                   // Space between buttons
    marginTop: 20,
    position: 'absolute',      // Position at bottom of screen
    bottom: 40,               // Distance from bottom
    left: 0,
    right: 0,
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
    marginTop:33
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
  iconButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  activeButton: {
    backgroundColor: '#FF3B30',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  modalButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
