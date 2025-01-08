import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, Alert } from 'react-native';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PrayerModeScreen() {
  const [step, setStep] = useState(1);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Request permissions when component mounts
  useEffect(() => {
    (async () => {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    })();
  }, []);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmExit();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const confirmExit = () => {
    Alert.alert(
      "Exit Prayer Mode?",
      "Are you sure you want to exit? Your progress will be lost.",
      [
        {
          text: "Stay",
          style: "cancel"
        },
        {
          text: "Exit",
          style: "destructive",
          onPress: () => router.back()
        }
      ]
    );
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      
      // Add debug logs
      console.log(`About to store prayer completion for step ${step}`);
      const today = new Date().toISOString().split('T')[0];
      const prayerKey = `prayer_${step}_${today}`;
      
      // Store with explicit value
      await AsyncStorage.setItem(prayerKey, 'completed');
      
      // Verify storage
      const verifyValue = await AsyncStorage.getItem(prayerKey);
      console.log('Verification after storage:', {
        key: prayerKey,
        storedValue: verifyValue
      });
      
      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording:', err);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Prepare Your Heart</Text>
            <Text style={styles.stepDescription}>
              Take a moment to quiet your mind and prepare for prayer.
            </Text>
            <TouchableOpacity 
              style={styles.nextButton}
              onPress={() => setStep(2)}
            >
              <Text style={styles.buttonText}>Begin Prayer</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Padre Nuestro</Text>
            <Text style={styles.stepDescription}>
              Record yourself reciting the Padre Nuestro prayer.
            </Text>
            <TouchableOpacity 
              style={[
                styles.recordButton,
                isRecording && styles.recordingActive
              ]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Text style={styles.buttonText}>
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Text>
            </TouchableOpacity>
            {!isRecording && !recording && (
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={() => setStep(3)}
              >
                <Text style={styles.buttonText}>Next Prayer</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Ave María</Text>
            <Text style={styles.stepDescription}>
              Record yourself reciting the Ave María prayer.
            </Text>
            <TouchableOpacity 
              style={[
                styles.recordButton,
                isRecording && styles.recordingActive
              ]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Text style={styles.buttonText}>
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Text>
            </TouchableOpacity>
            {!isRecording && !recording && (
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={() => setStep(4)}
              >
                <Text style={styles.buttonText}>Next Prayer</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Final Prayer</Text>
            <Text style={styles.stepDescription}>
              Record your final prayer.
            </Text>
            <TouchableOpacity 
              style={[
                styles.recordButton,
                isRecording && styles.recordingActive
              ]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Text style={styles.buttonText}>
                {isRecording ? "Stop Recording" : "Start Recording"}
              </Text>
            </TouchableOpacity>
            {!isRecording && !recording && (
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={() => router.back()}
              >
                <Text style={styles.buttonText}>Complete</Text>
              </TouchableOpacity>
            )}
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((i) => (
          <View 
            key={i} 
            style={[
              styles.progressDot,
              i <= step ? styles.progressDotActive : styles.progressDotInactive
            ]} 
          />
        ))}
      </View>

      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  progressDotActive: {
    backgroundColor: '#50C878',
  },
  progressDotInactive: {
    backgroundColor: '#E0E0E0',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
  },
  nextButton: {
    backgroundColor: '#50C878',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  recordButton: {
    backgroundColor: '#50C878',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  recordingActive: {
    backgroundColor: '#ff4444',
  },
});
