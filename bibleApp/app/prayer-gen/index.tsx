import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY;

export default function PrayerGenScreen() {
  const [generatedPrayer, setGeneratedPrayer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isSaved, setIsSaved] = useState(false);
  
  const params = useLocalSearchParams<{
    names: string;
    intentions: string;
    instructions: string;
    dailyVerse?: string;
  }>();

  // Parse the JSON strings back into arrays
  const names = JSON.parse(params.names || '[]');
  const intentions = JSON.parse(params.intentions || '[]');
  const instructions = params.dailyVerse 
    ? `${params.dailyVerse}\n\n${params.instructions || ''}`
    : (params.instructions || '');

  const generatePrayer = async () => {
    console.log('Starting prayer generation...');
    try {
      const namesString = names.join(', ');
      const intentionsString = intentions.join(', ');
      
      const prompt = `
        Personas: ${namesString}
        Intenciones: ${intentionsString}
        Instrucciones adicionales: ${instructions}
        Genera una oracion cristiana que bendiga a estas personas, tomando en cuenta estas intenciones y el verso del día si está presente. Maximo 1000 palabras.
        MENCIONA EL VERSO DEL DIA AL INICIO
        `;


      console.log('Making API request...', prompt);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "You are a helpful assistant that writes Christian prayers. Make it 200 words MAX." },
            { role: "user", content: prompt }
          ],
          temperature: 0.9
        })
      });
// JUANJO
      const data = await response.json();
      console.log('API response received:', data);
      const prayer = data.choices?.[0]?.message?.content || '';
      setGeneratedPrayer(prayer);
    } catch (err) {
      console.error('Detailed error:', err);
      setError('Error generating prayer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const savePrayer = async () => {
    try {
      const savedPrayers = await AsyncStorage.getItem('savedPrayers');
      const prayers = savedPrayers ? JSON.parse(savedPrayers) : [];
      
      const newPrayer = {
        id: Date.now(),
        text: generatedPrayer,
        date: new Date().toISOString(),
        names,
        intentions,
        instructions,
        audioPath: null  // Will store the local file path when audio is recorded
      };
      
      prayers.push(newPrayer);
      await AsyncStorage.setItem('savedPrayers', JSON.stringify(prayers));
      setIsSaved(true);
    } catch (error) {
      console.error('Error saving prayer:', error);
    }
  };

  // Only generate once when component mounts
  useEffect(() => {
    console.log('Initial prayer generation');
    generatePrayer();
  }, []); // Empty dependency array means it only runs once

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Oración Generada</Text>
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Image 
              source={require('../../assets/cross.png')} 
              style={styles.loadingImage}
            />
            <Text style={styles.loadingText}>Generando oración...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setIsLoading(true);
                setError('');
                generatePrayer();
              }}
            >
              <Text style={styles.retryButtonText}>Intentar de nuevo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.prayerContainer}>
              <ScrollView style={styles.prayerScroll}>
                <Text style={styles.prayerText}>{generatedPrayer}</Text>
              </ScrollView>
            </View>
            
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => {
                  setIsLoading(true);
                  generatePrayer();
                }}
              >
                <Ionicons name="refresh" size={24} color="white" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.iconButton}
                onPress={savePrayer}
              >
                <Ionicons 
                  name={isSaved ? "bookmark" : "bookmark-outline"} 
                  size={24} 
                  color={isSaved ? "#FFD700" : "white"} 
                />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => {
                  // Share functionality will be added later
                  console.log('Share button pressed');
                }}
              >
                <Ionicons name="share-social" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 16,
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingImage: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.light.primary,
    padding: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  prayerContainer: {
    height: '60%',
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  prayerScroll: {
    flex: 1,
  },
  prayerText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#333',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  iconButton: {
    backgroundColor: Colors.light.primary,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
