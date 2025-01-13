import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';

const PRAYERS = {
  padreNuestro: `Padre nuestro, que estás en el cielo,
santificado sea tu Nombre;
venga a nosotros tu Reino;
hágase tu voluntad en la tierra como en el cielo.
Danos hoy nuestro pan de cada día;
perdona nuestras ofensas,
como también nosotros perdonamos a los que nos ofenden;
no nos dejes caer en la tentación,
y líbranos del mal. Amén.`,

  aveMaria: `Dios te salve, María,
llena eres de gracia;
el Señor es contigo.
Bendita Tú eres entre todas las mujeres,
y bendito es el fruto de tu vientre, Jesús.
Santa María, Madre de Dios,
ruega por nosotros, pecadores,
ahora y en la hora de nuestra muerte. Amén.`,
};

export default function PrayerModeScreen() {
  const [step, setStep] = useState(1);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [dailyPrayer, setDailyPrayer] = useState('');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Add recording functions
  const startRecording = async () => {
    try {
      if (!hasPermission) {
        const permission = await Audio.requestPermissionsAsync();
        setHasPermission(permission.status === 'granted');
        if (!permission.granted) return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  // Add function to mark prayer as completed
  const markPrayerAsCompleted = async (prayerNumber: number) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const prayerKey = `prayer_${prayerNumber}_${today}`;
      await AsyncStorage.setItem(prayerKey, 'completed');
      console.log(`Marked prayer ${prayerNumber} as completed:`, prayerKey);
    } catch (error) {
      console.error('Error marking prayer as completed:', error);
    }
  };

  // Modify stopRecording to mark prayer as completed
  const stopRecording = async () => {
    try {
      if (!recording) return;

      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      setRecording(null);

      // Mark the current prayer as completed based on step
      await markPrayerAsCompleted(step);
      
      console.log('Recording stopped and prayer marked as completed');
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  // Load the daily prayer when component mounts
  useEffect(() => {
    const loadDailyPrayer = async () => {
      try {
        const prayer = await AsyncStorage.getItem('dailyPrayer');
        if (prayer) {
          setDailyPrayer(prayer);
        }
      } catch (error) {
        console.error('Error loading daily prayer:', error);
      }
    };

    loadDailyPrayer();
  }, []);

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
            <Text style={styles.prayerText}>{PRAYERS.padreNuestro}</Text>
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
              <Text style={styles.buttonTextRecord}>
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
            <Text style={styles.prayerText}>{PRAYERS.aveMaria}</Text>
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
              <Text style={styles.buttonTextRecord}>
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
            <ScrollView 
              style={styles.prayerScrollContainer}
              contentContainerStyle={styles.prayerScrollContent}
            >
              <Text style={styles.prayerText}>{dailyPrayer}</Text>
            </ScrollView>
           
            <TouchableOpacity 
              style={[
                styles.recordButton,
                isRecording && styles.recordingActive
              ]}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Text style={styles.buttonTextRecord}>
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
    backgroundColor: Colors.light.primary,
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
    backgroundColor: Colors.light.secondary,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  buttonText: {
    color: Colors.light.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  recordButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 20,
  },
  recordingActive: {
    backgroundColor: '#ff4444',
  },
  prayerText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: '#333',
    fontStyle: 'italic',
  },
  buttonTextRecord: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  prayerScrollContainer: {
    maxHeight: 300,
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
  },
  prayerScrollContent: {
    padding: 16,
  },
});
