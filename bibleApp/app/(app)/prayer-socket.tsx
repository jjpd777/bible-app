import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { Colors } from '../../constants/Colors';
import prayerWebSocketService from '../../services/prayerWebSocketService';
import { LinearGradient } from 'expo-linear-gradient';

export default function PrayerSocketScreen() {
  // Connection states
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'connecting', 'connected'
  
  // Recording states
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioResponse, setAudioResponse] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [currentAudioFileUri, setCurrentAudioFileUri] = useState<string | null>(null);
  const [prayerText, setPrayerText] = useState('');
  
  // Server URL - replace with your actual server URL
  const prodBackend  = true;
  const wsUrl = prodBackend ? "wss://realtime-3d-server.fly.dev/socket/websocket" : 'wss://789e-172-58-109-249.ngrok-free.app/socket/websocket';
  const httpBaseUrl = wsUrl.replace(/^wss:\/\//, 'https://').replace(/\/socket\/websocket$/, '');
  
  // Request audio permissions
  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access microphone is required!');
      }
    };
    
    getPermissions();
    
    // Set up WebSocket event listeners
    prayerWebSocketService.addCallbacks('connect', () => {
      setConnectionStatus('connected');
      // Join the prayer channel
      prayerWebSocketService.joinChannel('prayer:stream');
    });
    
    prayerWebSocketService.addCallbacks('error', () => {
      setConnectionStatus('disconnected');
      alert('Connection error. Please try again.');
    });
    
    prayerWebSocketService.addCallbacks('transcription_result', (data) => {
      console.log("Received transcription:", data.payload.transcription);
      setTranscription(data.payload.transcription);
    });
    
    prayerWebSocketService.addCallbacks('sample_audio_data', (data) => {
      console.log("Received sample audio data");
      if (data.payload && data.payload.audio_base64) {
        handleAudioChunk(data.payload.audio_base64);
      } else {
        console.warn("Received sample_audio_data event but payload or audio_base64 key is missing:", data);
      }
    });
    
    // Add new event listeners for conversation response and processing error
    prayerWebSocketService.addCallbacks('conversation_response', (data) => {
      console.log("Received conversation response:", data.payload);
      
      if (data.payload.success) {
        // Update transcription if available
        if (data.payload.transcription) {
          setTranscription(data.payload.transcription);
        }
        
        // Handle audio response if available
        if (data.payload.audio_url) {
          // Use the derived httpBaseUrl
          const fullAudioUrl = `${httpBaseUrl}${data.payload.audio_url}`;
          console.log("Audio response URL:", fullAudioUrl);
          
          // Play the audio from the URL
          playAudioFromUrl(fullAudioUrl);
        }
      }
    });
    
    prayerWebSocketService.addCallbacks('processing_error', (data) => {
      console.error("Processing error:", data.payload);
      alert(`Processing error: ${data.payload.message || 'Unknown error occurred'}`);
    });
    
    // Cleanup function
    return () => {
      prayerWebSocketService.disconnect();
      prayerWebSocketService.removeCallbacks('connect');
      prayerWebSocketService.removeCallbacks('error');
      prayerWebSocketService.removeCallbacks('transcription_result');
      prayerWebSocketService.removeCallbacks('sample_audio_data');
      prayerWebSocketService.removeCallbacks('conversation_response');
      prayerWebSocketService.removeCallbacks('processing_error');
      
      if (recording) recording.stopAndUnloadAsync();
      if (audioResponse) audioResponse.unloadAsync();
    };
  }, []);
  
  // Connect to WebSocket
  const connectWebSocket = () => {
    setConnectionStatus('connecting');
    prayerWebSocketService.connect(wsUrl);
  };
  
  // Disconnect from WebSocket
  const disconnectWebSocket = () => {
    console.log("Disconnecting WebSocket...");
    prayerWebSocketService.disconnect();
    setConnectionStatus('disconnected'); // Manually update status
    // Reset other relevant states if needed
    setTranscription('');
    // setAudioResponse(null); // Consider if you want to clear audio response on disconnect
    // setIsPlaying(false);
  };
  
  // Function to request the sample audio from the backend
  const requestSampleAudio = () => {
    if (connectionStatus !== 'connected') {
      alert('Please connect to the server first');
      return;
    }
    console.log("Requesting sample audio from server...");
    prayerWebSocketService.sendToChannel(
      'prayer:stream',
      'send_sample_audio',
      {}
    );
  };
  
  // Handle incoming audio chunks
  const handleAudioChunk = async (audioChunkBase64: string) => {
    try {
      // This is a simplified example - you'll need to implement
      // proper audio streaming based on how your backend sends data
      const { sound } = await Audio.Sound.createAsync(
        { uri: `data:audio/mp3;base64,${audioChunkBase64}` },
        { shouldPlay: true }
      );
      
      setAudioResponse(sound);
      setIsPlaying(true);
      
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing audio chunk:', error);
    }
  };
  
  // Start recording audio
  const startRecording = async () => {
    try {
      if (connectionStatus !== 'connected') {
        alert('Please connect to the server first');
        return;
      }
      
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  };
  
  // Stop recording and send audio
  const stopRecording = async () => {
    if (!recording) return;
    
    setIsRecording(false);
    
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      
      if (uri) {
        // Read file as base64
        const base64Audio = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64
        });
        
        // Send to server via WebSocket
        prayerWebSocketService.sendToChannel(
          'prayer:stream',
          'audio:transcribe',
          { audio: base64Audio }
        );
      }
    } catch (error) {
      console.error('Failed to stop recording or send audio', error);
    }
  };
  
  // Improved audio playback function
  const playAudioFromUrl = async (audioUrl) => {
    try {
      console.log("Playing audio from URL:", audioUrl);
      
      // Unload any existing audio
      if (audioResponse) {
        await audioResponse.unloadAsync();
      }
      
      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      // Create and play the new audio with better error handling
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, volume: 1.0 }
      );
      
      console.log("Audio loaded successfully, playing now");
      setAudioResponse(sound);
      setIsPlaying(true);
      
      sound.setOnPlaybackStatusUpdate(status => {
        console.log("Playback status:", status.isPlaying ? "playing" : "stopped", 
                    "position:", status.positionMillis, 
                    "duration:", status.durationMillis);
        
        if (status.didJustFinish) {
          console.log("Audio playback finished");
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing audio from URL:', error);
      alert(`Failed to play audio: ${error.message}`);
      setIsPlaying(false);
    }
  };
  
  return (
    <LinearGradient
      colors={['#f8f9fa', '#e9ecef']}
      style={styles.container}
    >
      <Text style={styles.title}>Prayer Assistant</Text>
      
      {/* Connection Section */}
      <View style={styles.sectionContainer}>
        {connectionStatus === 'disconnected' && (
          <View style={styles.buttonShadow}>
            <TouchableOpacity onPress={connectWebSocket} style={{ borderRadius: 30 }}>
              <LinearGradient
                colors={[Colors.light.primary, Colors.light.tint]}
                style={styles.connectionButton}
              >
                <Ionicons name="flash-outline" size={20} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Connect</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        
        {connectionStatus === 'connecting' && (
          <LinearGradient
            colors={['#ffb74d', '#ffa726']}
            style={[styles.connectionButton, styles.buttonShadow]}
          >
            <ActivityIndicator color="#fff" size="small" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Connecting...</Text>
          </LinearGradient>
        )}
        
        {connectionStatus === 'connected' && (
          <>
            <LinearGradient
              colors={['#66bb6a', '#4caf50']}
              style={[styles.connectionButton, styles.buttonShadow]}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Connected</Text>
            </LinearGradient>
            
            <View style={[styles.buttonShadow, { marginTop: 15 }]}>
              <TouchableOpacity onPress={disconnectWebSocket} style={{ borderRadius: 30 }}>
                 <LinearGradient
                   colors={['#ef5350', '#e53935']}
                   style={styles.disconnectButton}
                 >
                   <Ionicons name="power-outline" size={20} color="#fff" style={styles.buttonIcon} />
                   <Text style={styles.buttonText}>Disconnect</Text>
                 </LinearGradient>
               </TouchableOpacity>
             </View>
          </>
        )}
        
        <Text style={styles.statusText}>
          Status: {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
        </Text>
      </View>
      
      {/* Recording Section - Only shown when connected */}
      {connectionStatus === 'connected' && (
        <View style={styles.sectionContainer}>
          <Text style={styles.instructionText}>
            {isRecording ? 'Recording... Tap to stop' : 'Tap the mic to record your prayer'}
          </Text>
          
          <View style={[styles.recordButtonContainer, styles.buttonShadow]}>
            <TouchableOpacity
              style={{ borderRadius: 45 }}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <LinearGradient
                colors={isRecording ? ['#f44336', '#d32f2f'] : [Colors.light.primary, Colors.light.tint]}
                style={styles.recordButton}
              >
                <Ionicons
                  name={isRecording ? "stop-circle-outline" : "mic-outline"}
                  size={40}
                  color="#fff"
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Transcription Display */}
      {transcription ? (
        <View style={[styles.transcriptionContainer, styles.cardShadow]}>
          <Text style={styles.transcriptionTitle}>Your Prayer:</Text>
          <Text style={styles.transcriptionText}>{transcription}</Text>
        </View>
      ) : null}
      
      {/* Response Indicator */}
      {isPlaying && (
        <View style={styles.playingIndicator}>
          <ActivityIndicator color={Colors.light.primary} style={{ marginRight: 10 }} />
          <Text style={styles.playingText}>Playing response...</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: Colors.light.text,
    textAlign: 'center',
  },
  sectionContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  buttonShadow: {
     shadowColor: "#000",
     shadowOffset: {
       width: 0,
       height: 2,
     },
     shadowOpacity: 0.23,
     shadowRadius: 2.62,
     elevation: 4,
     borderRadius: 30,
  },
  connectionButton: {
    width: '100%',
    height: 55,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  disconnectButton: {
     width: '100%',
     height: 55,
     borderRadius: 30,
     justifyContent: 'center',
     alignItems: 'center',
     flexDirection: 'row',
     paddingHorizontal: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 15,
  },
  instructionText: {
    fontSize: 16,
    marginBottom: 20,
    color: Colors.light.text,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  recordButtonContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  recordButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcriptionContainer: {
    marginTop: 20,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 15,
    width: '90%',
  },
  cardShadow: {
     shadowColor: "#000",
     shadowOffset: {
       width: 0,
       height: 1,
     },
     shadowOpacity: 0.18,
     shadowRadius: 1.00,
     elevation: 1,
  },
  transcriptionTitle: {
    fontWeight: '600',
    marginBottom: 10,
    fontSize: 17,
    color: Colors.light.primary,
  },
  transcriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.light.text,
  },
  playingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  playingText: {
    fontSize: 14,
    color: Colors.light.text,
  },
});
