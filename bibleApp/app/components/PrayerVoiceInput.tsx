import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

interface PrayerVoiceInputProps {
  onTranscriptionComplete: (text: string) => void;
  language: string;
}

export default function PrayerVoiceInput({ onTranscriptionComplete, language }: PrayerVoiceInputProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionSuccess, setTranscriptionSuccess] = useState(false);
  const [isSampleTranscribing, setIsSampleTranscribing] = useState(false);
  const [sampleTranscriptionSuccess, setSampleTranscriptionSuccess] = useState(false);

  useEffect(() => {
    // Request permissions when component mounts
    const getPermissions = async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need microphone permissions to make this work!');
      }
    };

    getPermissions();
    
    // Clean up sound when component unmounts
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      // Reset transcription status when starting a new recording
      setTranscriptionSuccess(false);
      
      // Configure the recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // Create and start the recording with WAV format
      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.linearPCM,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        },
      });
      
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    
    // Get the recording URI
    const uri = recording.getURI();
    setRecording(null);
    
    if (uri) {
      // Save the URI for playback
      setRecordedAudioUri(uri);
    }
  };

  const playRecording = async () => {
    if (!recordedAudioUri) return;
    
    try {
      // Unload any existing sound first
      if (sound) {
        await sound.unloadAsync();
      }
      
      // Load the recorded audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordedAudioUri },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      
      // Listen for playback status updates
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.isPlaying && status.didJustFinish) {
          // Automatically unload when finished playing
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Error playing recording:', error);
    }
  };

  const resetRecording = () => {
    setRecordedAudioUri(null);
    setTranscriptionSuccess(false);
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
  };

  // Function to send audio recording to your ngrok endpoint
  const transcribeAudio = async () => {
    if (!recordedAudioUri) {
      alert('Please record audio first');
      return;
    }
    
    setIsTranscribing(true);
    
    try {
      // Use the recorded audio file
      console.log("Using recorded audio file for transcription:", recordedAudioUri);
      
      // Create form data to send the file
      const formData = new FormData();
      formData.append('audio', {
        uri: recordedAudioUri,
        name: 'recording.wav',
        type: 'audio/wav',
      });
      
      // Update with your current Ngrok URL - this needs to be updated whenever Ngrok restarts
      const NGROK_URL = 'https://03d8-170-150-29-219.ngrok-free.app';
      const endpoint = `${NGROK_URL}/api/transcribe`;
      
      console.log("Sending request to:", endpoint);
      
      // Test if the server is reachable first
      try {
        const pingResponse = await fetch(NGROK_URL, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        console.log("Server ping response:", pingResponse.status);
      } catch (pingError) {
        console.error("Server unreachable:", pingError);
        alert(`Cannot reach the transcription server. The Ngrok URL might have expired or changed.`);
        setIsTranscribing(false);
        return;
      }
      
      // Send the file to your transcription service
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log("Response status:", response.status);
      
      // Process the response
      if (response.ok) {
        const result = await response.json();
        console.log("Transcription result:", result);
        
        // Set success state and pass transcription to parent
        setTranscriptionSuccess(true);
        onTranscriptionComplete(result.transcript);
      } else {
        const errorText = await response.text();
        console.error("Server error:", response.status, errorText);
        alert(`Transcription failed: Server returned ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending audio:", error);
      
      // More detailed error message
      let errorMessage = 'Failed to transcribe audio. ';
      
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        errorMessage += 'Network connection issue. Please check your internet connection and make sure the server is running.';
      } else {
        errorMessage += 'Please try again.';
      }
      
      alert(errorMessage);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Function to transcribe the sample MP3 file
  const transcribeSampleAudio = async () => {
    setIsSampleTranscribing(true);
    
    try {
      // First, we need to get the asset and copy it to a location we can access
      const asset = await Asset.fromModule(require('../../assets/audio/sample.mp3')).downloadAsync();
      
      if (!asset.localUri) {
        throw new Error("Could not load sample audio file");
      }
      
      console.log("Sample audio loaded at:", asset.localUri);
      
      // Create form data to send the file
      const formData = new FormData();
      formData.append('audio', {
        uri: asset.localUri,
        name: 'sample.mp3',
        type: 'audio/mpeg',
      });
      
      console.log("Sending sample audio for transcription");
      
      // Using the exact fetch approach recommended by your backend LLM
      fetch('https://03d8-170-150-29-219.ngrok-free.app/api/transcribe', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then(response => {
        console.log("Sample audio response status:", response.status);
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Sample transcription:", data.transcript);
        // Set success state and pass transcription to parent
        setSampleTranscriptionSuccess(true);
        onTranscriptionComplete(data.transcript);
        setIsSampleTranscribing(false);
      })
      .catch(error => {
        console.error("Sample transcription error:", error);
        alert('Failed to transcribe sample audio. Please try again.');
        setIsSampleTranscribing(false);
      });
      
    } catch (error) {
      console.error("Error preparing sample transcription:", error);
      alert('Failed to prepare sample transcription. Please try again.');
      setIsSampleTranscribing(false);
    }
  };

  return (
    <View style={styles.container}>
      {isRecording ? (
        // Recording in progress
        <>
          <TouchableOpacity 
            style={[styles.microphoneButton, styles.recordingButton]}
            onPress={stopRecording}
          >
            <Ionicons name="stop" size={50} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.microphoneText}>
            {language === 'en' ? 'Recording... Tap to stop' : 
             language === 'es' ? 'Grabando... Toca para detener' : 
             language === 'hi' ? 'रिकॉर्डिंग... रोकने के लिए टैप करें' : 
             language === 'pt' ? 'Gravando... Toque para parar' : 
             language === 'id' ? 'Merekam... Ketuk untuk berhenti' : 
             language === 'fr' ? 'Enregistrement... Appuyez pour arrêter' : 
             'Recording... Tap to stop'}
          </Text>
        </>
      ) : isTranscribing || isSampleTranscribing ? (
        // Transcribing (either recorded or sample audio)
        <View style={styles.transcribingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.transcribingText}>
            {language === 'en' ? 'Transcribing...' : 
             language === 'es' ? 'Transcribiendo...' : 
             language === 'hi' ? 'अनुलेखन हो रहा है...' : 
             language === 'pt' ? 'Transcrevendo...' : 
             language === 'id' ? 'Mentranskripsikan...' : 
             language === 'fr' ? 'Transcription en cours...' : 
             'Transcribing...'}
          </Text>
        </View>
      ) : recordedAudioUri ? (
        // Recording completed, show play button and transcribe button
        <View style={styles.recordingCompleteContainer}>
          <TouchableOpacity 
            style={styles.playbackButton}
            onPress={playRecording}
          >
            <Ionicons name="play-circle" size={60} color={Colors.light.primary} />
            <Text style={styles.playbackButtonText}>
              {language === 'en' ? 'Play Recording' : 
               language === 'es' ? 'Reproducir Grabación' : 
               language === 'hi' ? 'रिकॉर्डिंग चलाएं' : 
               language === 'pt' ? 'Reproduzir Gravação' : 
               language === 'id' ? 'Putar Rekaman' : 
               language === 'fr' ? 'Lire l\'Enregistrement' : 
               'Play Recording'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.transcribeButton, 
              transcriptionSuccess && styles.transcribeButtonSuccess
            ]}
            onPress={transcribeAudio}
            disabled={transcriptionSuccess}
          >
            <Ionicons 
              name={transcriptionSuccess ? "checkmark-circle" : "text-outline"} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.transcribeButtonText}>
              {transcriptionSuccess ? 
                (language === 'en' ? 'Transcription Complete' : 
                 language === 'es' ? 'Transcripción Completa' : 
                 language === 'hi' ? 'अनुलेखन पूर्ण' : 
                 language === 'pt' ? 'Transcrição Completa' : 
                 language === 'id' ? 'Transkripsi Selesai' : 
                 language === 'fr' ? 'Transcription Terminée' : 
                 'Transcription Complete') : 
                (language === 'en' ? 'Transcribe Prayer' : 
                 language === 'es' ? 'Transcribir Oración' : 
                 language === 'hi' ? 'प्रार्थना का अनुलेखन करें' : 
                 language === 'pt' ? 'Transcrever Oração' : 
                 language === 'id' ? 'Transkripsikan Doa' : 
                 language === 'fr' ? 'Transcrire la Prière' : 
                 'Transcribe Prayer')
              }
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.recordAgainButton}
            onPress={resetRecording}
          >
            <Ionicons name="refresh" size={20} color={Colors.light.primary} />
            <Text style={styles.recordAgainButtonText}>
              {language === 'en' ? 'Record Again' : 
               language === 'es' ? 'Grabar de nuevo' : 
               language === 'hi' ? 'फिर से रिकॉर्ड करें' : 
               language === 'pt' ? 'Gravar novamente' : 
               language === 'id' ? 'Rekam lagi' : 
               language === 'fr' ? 'Enregistrer à nouveau' : 
               'Record Again'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Ready to record
        <View style={styles.initialContainer}>
          <TouchableOpacity 
            style={styles.microphoneButton}
            onPress={startRecording}
          >
            <Ionicons name="mic" size={50} color={Colors.light.primary} />
          </TouchableOpacity>
          <Text style={styles.microphoneText}>
            {language === 'en' ? 'Tap to start recording' : 
             language === 'es' ? 'Toca para comenzar a grabar' : 
             language === 'hi' ? 'रिकॉर्डिंग शुरू करने के लिए टैप करें' : 
             language === 'pt' ? 'Toque para começar a gravar' : 
             language === 'id' ? 'Ketuk untuk mulai merekam' : 
             language === 'fr' ? 'Appuyez pour commencer l\'enregistrement' : 
             'Tap to start recording'}
          </Text>
          
          {/* Sample audio transcription button */}
          <TouchableOpacity 
            style={[
              styles.sampleButton, 
              sampleTranscriptionSuccess && styles.transcribeButtonSuccess
            ]}
            onPress={transcribeSampleAudio}
            disabled={sampleTranscriptionSuccess}
          >
            <Text style={styles.sampleButtonText}>T</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    position: 'relative',
  },
  initialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
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
    marginBottom: 20,
  },
  recordingButton: {
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  microphoneText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  transcribingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  transcribingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  recordingCompleteContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  playbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f4f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: '80%',
  },
  playbackButtonText: {
    fontSize: 18,
    color: Colors.light.primary,
    marginLeft: 12,
    fontWeight: '500',
  },
  transcribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    width: '80%',
  },
  transcribeButtonSuccess: {
    backgroundColor: '#4285F4', // Google blue color when successful
  },
  transcribeButtonText: {
    fontSize: 18,
    color: '#fff',
    marginLeft: 12,
    fontWeight: '500',
  },
  recordAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  recordAgainButtonText: {
    fontSize: 16,
    color: Colors.light.primary,
    marginLeft: 8,
  },
  sampleButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sampleButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
}); 