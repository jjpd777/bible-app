import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY;

export default function PrayerGenerator() {
  const [savedPrayerNames, setSavedPrayerNames] = useState<string[]>([]);
  const [selectedPrayerFor, setSelectedPrayerFor] = useState<string[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [selectedIntentions, setSelectedIntentions] = useState<string[]>([]);
  const [generatedPrayer, setGeneratedPrayer] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [showIntentions, setShowIntentions] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isPrayerSaved, setIsPrayerSaved] = useState(false);

  useEffect(() => {
    console.log("THE KEY", OPENAI_API_KEY)
    const loadPrayerData = async () => {
      try {
        const onboardingDataString = await AsyncStorage.getItem('onboardingData');
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          const names = onboardingData.prayerNames || [];
          const intentions = onboardingData.prayerFor || [];
          setSavedPrayerNames(names);
          setSelectedPrayerFor(intentions);
          // Initially select all names and intentions
          setSelectedNames(names);
          setSelectedIntentions(intentions);
        }
      } catch (error) {
        console.error('Error loading prayer data:', error);
      }
    };

    loadPrayerData();
  }, []);

  const toggleName = (name: string) => {
    setSelectedNames(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const toggleIntention = (intention: string) => {
    setSelectedIntentions(prev => 
      prev.includes(intention) ? prev.filter(i => i !== intention) : [...prev, intention]
    );
  };

  const savePrayer = async () => {
    try {
      const savedPrayers = await AsyncStorage.getItem('savedPrayers') || '[]';
      const prayers = JSON.parse(savedPrayers);

      // Check if the prayer is already saved
      const existingPrayerIndex = prayers.findIndex(p => p.prayer === generatedPrayer);
      
      if (existingPrayerIndex !== -1) {
        // If prayer is already saved, remove it
        prayers.splice(existingPrayerIndex, 1);
        setIsPrayerSaved(false); // Update state to indicate prayer is unsaved
        alert('Prayer unsaved successfully!');
      } else {
        // If prayer is not saved, save it
        prayers.push({
          prayer: generatedPrayer,
          timestamp: new Date().toISOString(),
        });
        setIsPrayerSaved(true); // Update state to indicate prayer is saved
        alert('Prayer saved successfully!');
      }

      await AsyncStorage.setItem('savedPrayers', JSON.stringify(prayers));
    } catch (error) {
      console.error('Error saving prayer:', error);
      alert('Failed to save or unsave prayer');
    }
  };

  const generatePrayer = async () => {
    setIsGenerating(true);
    try {
      const prompt = `Genera una oracion Cristian usando los siguientes elementos:
        Nombres por rezar: ${selectedNames.join(', ')}
        Intenciones de rezar: ${selectedIntentions.join(', ')}
        
        LIMITA LA ORACION A 220 palabras
        `;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: "system", content: "You are a helpful assistant that writes Christian prayers." },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      if (data.choices && data.choices[0]) {
        setGeneratedPrayer(data.choices[0].message.content);
        setHasGenerated(true);
        setIsPrayerSaved(false);
      }
    } catch (error) {
      console.error('Error generating prayer:', error);
      alert('Failed to generate prayer. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: generatedPrayer,
        title: 'Share my prayer'
      });
    } catch (error) {
      alert('Failed to share prayer');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity 
        style={styles.dropdown}
        onPress={() => setShowNames(!showNames)}
      >
        <Text style={styles.dropdownText}>Prayer Names ({selectedNames.length} selected)</Text>
        <Ionicons 
          name={showNames ? 'chevron-up' : 'chevron-down'} 
          size={24} 
          color="#333"
        />
      </TouchableOpacity>

      {showNames && (
        <View style={styles.dropdownContent}>
          <View style={styles.flexContainer}>
            {savedPrayerNames.map((name, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => toggleName(name)}
                style={[
                  styles.flexItem,
                  selectedNames.includes(name) && styles.selectedItem
                ]}
              >
                <Text style={[
                  styles.itemText,
                  selectedNames.includes(name) && styles.selectedItemText
                ]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <TouchableOpacity 
        style={styles.dropdown}
        onPress={() => setShowIntentions(!showIntentions)}
      >
        <Text style={styles.dropdownText}>Prayer Intentions ({selectedIntentions.length} selected)</Text>
        <Ionicons 
          name={showIntentions ? 'chevron-up' : 'chevron-down'} 
          size={24} 
          color="#333"
        />
      </TouchableOpacity>

      {showIntentions && (
        <View style={styles.dropdownContent}>
          <View style={styles.flexContainer}>
            {selectedPrayerFor.map((intention, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => toggleIntention(intention)}
                style={[
                  styles.flexItem,
                  selectedIntentions.includes(intention) && styles.selectedItem
                ]}
              >
                <Text style={[
                  styles.itemText,
                  selectedIntentions.includes(intention) && styles.selectedItemText
                ]}>{intention}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!hasGenerated && (
        <TouchableOpacity 
          style={styles.generateButton}
          onPress={generatePrayer}
          disabled={isGenerating}
        >
          <Text style={styles.generateButtonText}>
            {isGenerating ? 'Generating...' : 'Generate Prayer'}
          </Text>
        </TouchableOpacity>
      )}

      {generatedPrayer && (
        <View style={styles.prayerContainer}>
          <View style={styles.prayerActions}>
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={savePrayer}>
              <Ionicons 
                name={isPrayerSaved ? "bookmark" : "bookmark-outline"}
                size={24} 
                color={isPrayerSaved ? "#34C759" : "#333"}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={generatePrayer} disabled={isGenerating}>
              {isGenerating ? (
                <Ionicons name="timer-outline" size={24} color="#5856D6" />
              ) : (
                <Ionicons name="refresh" size={24} color="#5856D6" />
              )}
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.masterInput}
            value={generatedPrayer}
            onChangeText={setGeneratedPrayer}
            multiline
            scrollEnabled={true}
          />
        </View>
      )}
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
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    textAlignVertical: 'top',
    fontSize: 16,
    height: '100%',
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
  generateButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  selectedItem: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 16,
  },
  saveButton: {
    backgroundColor: '#34C759',
  },
  regenerateButton: {
    backgroundColor: '#5856D6',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dropdownContent: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  prayerContainer: {
    marginTop: 16,
    height: 500,
  },
  prayerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  selectedItemText: {
    color: '#fff',
  },
});
