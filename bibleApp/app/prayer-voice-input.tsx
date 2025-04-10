import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors'
import { useLanguage } from '../contexts/LanguageContext';
import { useReligion } from '@/contexts/ReligionContext';

export default function PrayerVoiceInputScreen() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const { language, t } = useLanguage();
  const { getPrayerPrompt } = useReligion();

  useEffect(() => {
    // Request permissions when component mounts
    const getPermissions = async () => {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need microphone permissions to make this work!');
      }
    };

    getPermissions();
  }, []);

  const startRecording = async () => {
    try {
      // Configure the recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      // Create and start the recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
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
      // Start transcription process
      transcribeAudio(uri);
    }
  };

  const transcribeAudio = async (audioUri: string) => {
    setIsTranscribing(true);
    
    try {
      // Create a FormData object to send the audio file
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      
      // Send to your transcription service
      // This is a placeholder - replace with your actual transcription API
      // const response = await fetch('YOUR_TRANSCRIPTION_API_ENDPOINT', {
      //   method: 'POST',
      //   body: formData,
      // });
      
      // const result = await response.json();
      // setTranscription(result.text);
      
      // For demo purposes, we'll just set a placeholder text after a delay
      setTimeout(() => {
        setTranscription("Lord, please help my family and guide me through difficult times. I pray for health and strength.");
        setIsTranscribing(false);
      }, 2000);
      
    } catch (error) {
      console.error('Transcription error:', error);
      setIsTranscribing(false);
      alert('Failed to transcribe audio. Please try again.');
    }
  };

  const handleGeneratePrayer = () => {
    if (!transcription) return;
    
    // Get the religion-specific prayer prompt
    const prayerPrompt = getPrayerPrompt(language);
    
    // Navigate to prayer-voice screen with the transcription
    router.push({
      pathname: '/prayer-voice',
      params: {
        instructions: transcription,
        isNewGeneration: 'true',
        language: language,
        prayerPrompt: prayerPrompt
      }
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.light.primary} />
      </TouchableOpacity>
      
      <Text style={styles.title}>
        {language === 'en' ? 'Speak Your Prayer Intentions' : 
         language === 'es' ? 'Habla Tus Intenciones de Oración' : 
         language === 'hi' ? 'अपनी प्रार्थना इरादों को बोलें' : 
         language === 'pt' ? 'Fale Suas Intenções de Oração' : 
         language === 'id' ? 'Ucapkan Niat Doa Anda' : 
         language === 'fr' ? 'Dites Vos Intentions de Prière' : 
         'Speak Your Prayer Intentions'}
      </Text>
      
      <View style={styles.microphoneContainer}>
        <TouchableOpacity 
          style={[styles.microphoneButton, isRecording && styles.recordingButton]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons 
            name={isRecording ? "stop" : "mic"} 
            size={50} 
            color={isRecording ? "#fff" : Colors.light.primary} 
          />
        </TouchableOpacity>
        
        <Text style={styles.microphoneText}>
          {isRecording ? 
            (language === 'en' ? 'Recording... Tap to stop' : 
             language === 'es' ? 'Grabando... Toca para detener' : 
             language === 'hi' ? 'रिकॉर्डिंग... रोकने के लिए टैप करें' : 
             language === 'pt' ? 'Gravando... Toque para parar' : 
             language === 'id' ? 'Merekam... Ketuk untuk berhenti' : 
             language === 'fr' ? 'Enregistrement... Appuyez pour arrêter' : 
             'Recording... Tap to stop') : 
            (language === 'en' ? 'Tap to start recording' : 
             language === 'es' ? 'Toca para comenzar a grabar' : 
             language === 'hi' ? 'रिकॉर्डिंग शुरू करने के लिए टैप करें' : 
             language === 'pt' ? 'Toque para começar a gravar' : 
             language === 'id' ? 'Ketuk untuk mulai merekam' : 
             language === 'fr' ? 'Appuyez pour commencer l\'enregistrement' : 
             'Tap to start recording')
          }
        </Text>
      </View>
      
      {isTranscribing && (
        <View style={styles.transcribingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.transcribingText}>
            {language === 'en' ? 'Transcribing your prayer...' : 
             language === 'es' ? 'Transcribiendo tu oración...' : 
             language === 'hi' ? 'आपकी प्रार्थना का अनुलेखन हो रहा है...' : 
             language === 'pt' ? 'Transcrevendo sua oração...' : 
             language === 'id' ? 'Mentranskripsikan doa Anda...' : 
             language === 'fr' ? 'Transcription de votre prière...' : 
             'Transcribing your prayer...'}
          </Text>
        </View>
      )}
      
      {transcription && !isTranscribing && (
        <View style={styles.transcriptionContainer}>
          <Text style={styles.transcriptionLabel}>
            {language === 'en' ? 'Your prayer intentions:' : 
             language === 'es' ? 'Tus intenciones de oración:' : 
             language === 'hi' ? 'आपके प्रार्थना इरादे:' : 
             language === 'pt' ? 'Suas intenções de oração:' : 
             language === 'id' ? 'Niat doa Anda:' : 
             language === 'fr' ? 'Vos intentions de prière:' : 
             'Your prayer intentions:'}
          </Text>
          <Text style={styles.transcriptionText}>{transcription}</Text>
          
          <TouchableOpacity 
            style={styles.generateButton}
            onPress={handleGeneratePrayer}
          >
            <Ionicons name="create-outline" size={20} color="#fff" style={styles.generateButtonIcon} />
            <Text style={styles.generateButtonText}>
              {language === 'en' ? 'Generate Prayer' : 
               language === 'es' ? 'Generar Oración' : 
               language === 'hi' ? 'प्रार्थना उत्पन्न करें' : 
               language === 'pt' ? 'Gerar Oração' : 
               language === 'id' ? 'Buat Doa' : 
               language === 'fr' ? 'Générer une Prière' : 
               'Generate Prayer'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    paddingTop: 60,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.primary,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  microphoneContainer: {
    alignItems: 'center',
    marginVertical: 40,
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
    marginTop: 30,
  },
  transcribingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  transcriptionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transcriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
    marginBottom: 10,
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  generateButtonIcon: {
    marginRight: 8,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
