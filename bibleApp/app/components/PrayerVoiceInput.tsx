import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Colors } from '@/constants/Colors';

interface PrayerVoiceInputProps {
  onTranscriptionComplete: (text: string) => void;
  language: string;
}

const PrayerVoiceInput: React.FC<PrayerVoiceInputProps> = ({ onTranscriptionComplete, language }) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionSuccess, setTranscriptionSuccess] = useState(false);
  const [transcript, setTranscript] = useState<string>('');

  // Request microphone permissions when component mounts
  useEffect(() => {
    const getPermissions = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            "Permission Required",
            "Microphone access is needed for voice input. Please enable it in your device settings."
          );
        }
      } catch (error) {
        console.error('Error requesting microphone permission:', error);
      }
    };

    getPermissions();
  }, []);

  const startRecording = async () => {
    try {
      // Reset transcription status when starting a new recording
      setTranscriptionSuccess(false);
      setTranscript('');
      
      // Configure the recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // M4A recording options
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };
      
      // Create and start the recording with M4A format
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      const uri = recording.getURI();
      
      setRecordedAudioUri(uri);
      setRecording(null);
      
      // Automatically start transcription after recording stops
      if (uri) {
        transcribeAudio(uri);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    setIsTranscribing(true);
    
    try {
      // Create form data to send the file with M4A metadata
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      });
      
      // Update with your current backend URL
      const prodBackend = false; // Set to true to use production backend
      const BACKEND_URL = prodBackend 
        ? 'https://realtime-3d-server.fly.dev' 
        : 'https://0a5d-172-58-30-128.ngrok-free.app';
        
      const endpoint = `${BACKEND_URL}/api/transcribe-whisper`;
      
      // Send the file to your transcription service
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Process the response
      if (response.ok) {
        const result = await response.json();
        console.log("Transcription result:", result);
        
        // Extract the transcript from the correct field
        const transcriptionText = result.transcription || '';
        
        // Store the transcript text
        setTranscript(transcriptionText);
        
        // Set success state and pass transcription to parent
        setTranscriptionSuccess(true);
        onTranscriptionComplete(transcriptionText);
      } else {
        const errorText = await response.text();
        console.error("Server error:", response.status, errorText);
        
        Alert.alert(
          "Transcription Failed",
          `Server returned error ${response.status}. Please try again.`
        );
      }
    } catch (error) {
      console.error("Error sending audio:", error);
      
      Alert.alert(
        "Transcription Error",
        "Failed to transcribe audio. Please try again."
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const resetRecording = () => {
    setRecordedAudioUri(null);
    setTranscriptionSuccess(false);
    setTranscript('');
  };

  return (
    <View style={styles.container}>
      {!transcriptionSuccess ? (
        // Recording UI - Icon only
        <View style={styles.microphoneContainer}>
          <TouchableOpacity
            style={[
              styles.microphoneButton,
              isRecording && styles.recordingButton
            ]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Ionicons
              name={isRecording ? "stop" : "mic"}
              size={50}
              color={isRecording ? "#fff" : Colors.light.primary}
            />
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingPulse} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // Transcript display UI - No title, just the text and icon button
        <View style={styles.transcriptContainer}>
          <ScrollView style={styles.transcriptScrollView}>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </ScrollView>
          
          <TouchableOpacity 
            style={styles.recordAgainButton}
            onPress={resetRecording}
          >
            <Ionicons name="refresh" size={24} color={Colors.light.primary} />
          </TouchableOpacity>
        </View>
      )}
      
      {isTranscribing && (
        <View style={styles.transcribingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 16,
  },
  microphoneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  microphoneButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f2fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.light.primary,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    position: 'relative',
  },
  recordingButton: {
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  recordingIndicator: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#ff4444',
    opacity: 0.7,
  },
  recordingPulse: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: '#ff4444',
    opacity: 0.3,
    top: -10,
    left: -10,
  },
  transcribingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  transcriptContainer: {
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  transcriptScrollView: {
    maxHeight: 200,
    marginBottom: 15,
  },
  transcriptText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  recordAgainButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
});

export default PrayerVoiceInput; 