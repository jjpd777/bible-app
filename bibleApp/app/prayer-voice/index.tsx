import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

interface SavedPrayer {
  id: number;
  text: string;
  audioPath: string | null;
}

export default function PrayerVoiceView() {
  const params = useLocalSearchParams<{ prayer: string }>();
  const prayer: SavedPrayer = JSON.parse(params.prayer);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.prayerContainer}>
        <Text style={styles.prayerText}>{prayer.text}</Text>
      </ScrollView>
      
      <View style={styles.audioStatus}>
        <Text style={styles.audioStatusText}>
          {prayer.audioPath ? '🎵 Audio Available' : '🔇 No Audio yet'}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => {}}>
        <Text style={styles.buttonText}>Grabar oración</Text>
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
    marginTop:100,
    maxHeight: '50%',
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
  secondaryButton: {
    backgroundColor: '#5856D6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
