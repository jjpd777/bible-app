import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PrayerGenerator() {
  const [savedPrayerNames, setSavedPrayerNames] = useState<string[]>([]);
  const [selectedPrayerFor, setSelectedPrayerFor] = useState<string[]>([]);
  const [masterText, setMasterText] = useState('');
  const [instructionsText, setInstructionsText] = useState('');

  useEffect(() => {
    const loadPrayerData = async () => {
      try {
        // Load prayer names and intentions from onboardingData
        const onboardingDataString = await AsyncStorage.getItem('onboardingData');
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          setSavedPrayerNames(onboardingData.prayerNames || []);
          setSelectedPrayerFor(onboardingData.prayerFor || []);
        }
      } catch (error) {
        console.error('Error loading prayer data:', error);
      }
    };

    loadPrayerData();
  }, []);

  const appendToMasterText = (text: string) => {
    setMasterText(prev => 
      prev ? `${prev} ${text}` : text
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Instrucciones adicionales</Text>
      <TextInput
        style={[styles.masterInput, styles.instructionsInput]}
        placeholder="Escribe tus instrucciones aquí..."
        multiline
        value={instructionsText}
        onChangeText={setInstructionsText}
      />

      <Text style={styles.heading}>Tu Oración</Text>
      <TextInput
        style={styles.masterInput}
        value={masterText}
        onChangeText={setMasterText}
        placeholder="Your prayer will appear here..."
        multiline
      />

      <View style={styles.section}>
        <Text style={styles.heading}>Prayer Names</Text>
        <View style={styles.flexContainer}>
          {savedPrayerNames.length > 0 ? (
            savedPrayerNames.map((name, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => appendToMasterText(name)}
                style={styles.flexItem}
              >
                <Text style={styles.itemText}>{name}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No prayer names saved</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Prayer Intentions</Text>
        <View style={styles.flexContainer}>
          {selectedPrayerFor.length > 0 ? (
            selectedPrayerFor.map((intention, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => appendToMasterText(intention)}
                style={styles.flexItem}
              >
                <Text style={styles.itemText}>{intention}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No prayer intentions saved</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 24,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  item: {
    fontSize: 16,
    marginBottom: 8,
    paddingLeft: 8,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#999',
    textAlign: 'center',
  },
  masterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  touchableItem: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  flexContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 4,
  },
  flexItem: {
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    padding: 8,
    paddingHorizontal: 12,
    margin: 2,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
  instructionsInput: {
    height: 100,
  },
});
