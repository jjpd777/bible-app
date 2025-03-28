import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, TextInput, Alert, ScrollView, Image, Modal } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
const OPENAI_API_KEY = Constants.expoConfig?.extra?.OPENAI_API_KEY;


type OnboardingData = {
  prayerNames: string[];
  notificationsEnabled: boolean;
  sleepTime: Date;
  wakeTime: Date;
  alarmFrequency: number;
  prayerFor: string[];
};

type SavedVerse = {
  content: string;
  reference: string;
  timestamp: number;
};

export default function ProfileScreen() {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [editingData, setEditingData] = useState<OnboardingData | null>(null);
  const [newPrayerName, setNewPrayerName] = useState('');
  const [newPrayerFor, setNewPrayerFor] = useState('');
  const [isEditingPrayers, setIsEditingPrayers] = useState(false);
  const [isEditingPrayerFor, setIsEditingPrayerFor] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>([]);
  const [isViewingSavedVerses, setIsViewingSavedVerses] = useState(false);
  const [savedPrayers, setSavedPrayers] = useState<{ prayer: string; timestamp: number }[]>([]);
  const [isViewingSavedPrayers, setIsViewingSavedPrayers] = useState(false);
  const [editedPrayer, setEditedPrayer] = useState('');
  const [isEditingDailyPrayer, setIsEditingDailyPrayer] = useState(false);
  const [isGeneratingNewPrayer, setIsGeneratingNewPrayer] = useState(false);
  const [editingPrayerId, setEditingPrayerId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadOnboardingData();
    loadSavedVerses();
    loadSavedPrayers();
  }, []);

  const loadOnboardingData = async () => {
    try {
      const data = await AsyncStorage.getItem('onboardingData');
      if (data) {
        setOnboardingData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading onboarding data:', error);
    }
  };

  const loadSavedVerses = async () => {
    try {
      const verses = await AsyncStorage.getItem('savedVerses');
      if (verses) {
        setSavedVerses(JSON.parse(verses));
      }
    } catch (error) {
      console.error('Error loading saved verses:', error);
    }
  };

  const loadSavedPrayers = async () => {
    try {
      const savedPrayersStr = await AsyncStorage.getItem('savedPrayers');
      if (savedPrayersStr) {
        const prayers = JSON.parse(savedPrayersStr);
        setSavedPrayers(prayers);
      }
    } catch (error) {
      console.error('Error loading saved prayers:', error);
    }
  };

  const startEditing = (type: 'prayers' | 'prayerFor') => {
    setEditingData(JSON.parse(JSON.stringify(onboardingData)));
    setHasChanges(false);
    if (type === 'prayers') {
      setIsEditingPrayers(true);
    } else {
      setIsEditingPrayerFor(true);
    }
  };

  const addPrayerName = () => {
    if (!newPrayerName.trim() || !onboardingData) return;
    
    const updatedData = {
      ...onboardingData,
      prayerNames: [...onboardingData.prayerNames, newPrayerName.trim()]
    };
    setOnboardingData(updatedData);
    setNewPrayerName('');
    setHasChanges(true);
  };

  const removePrayerName = (index: number) => {
    if (!onboardingData) return;
    
    const updatedData = {
      ...onboardingData,
      prayerNames: onboardingData.prayerNames.filter((_, i) => i !== index)
    };
    setOnboardingData(updatedData);
    setHasChanges(true);
  };

  const addPrayerFor = () => {
    if (!newPrayerFor.trim() || !onboardingData) return;
    
    const updatedData = {
      ...onboardingData,
      prayerFor: [...onboardingData.prayerFor, newPrayerFor.trim()]
    };
    setOnboardingData(updatedData);
    setNewPrayerFor('');
    setHasChanges(true);
  };

  const removePrayerFor = (index: number) => {
    if (!onboardingData) return;
    
    const updatedData = {
      ...onboardingData,
      prayerFor: onboardingData.prayerFor.filter((_, i) => i !== index)
    };
    setOnboardingData(updatedData);
    setHasChanges(true);
  };

  const handleConfirm = async (type: 'prayers' | 'prayerFor') => {
    if (!onboardingData) return;
    
    try {
      await AsyncStorage.setItem('onboardingData', JSON.stringify(onboardingData));
      setHasChanges(false);
      if (type === 'prayers') {
        setIsEditingPrayers(false);
      } else {
        setIsEditingPrayerFor(false);
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  };

  const handleRemoveVerse = async (reference: string) => {
    try {
      const updatedVerses = savedVerses.filter(verse => verse.reference !== reference);
      await AsyncStorage.setItem('savedVerses', JSON.stringify(updatedVerses));
      setSavedVerses(updatedVerses);
    } catch (error) {
      console.error('Error removing verse:', error);
    }
  };

  const handleRestartOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('onboardingData');
      setOnboardingData(null);
      router.replace('/onboarding/');
    } catch (error) {
      console.error('Error clearing onboarding data:', error);
      Alert.alert('Error', 'Failed to restart onboarding');
    }
  };

  const handleRemovePrayer = async (prayerToRemove: string) => {
    try {
      const updatedPrayers = savedPrayers.filter(item => item.text !== prayerToRemove);
      await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
      setSavedPrayers(updatedPrayers);
    } catch (error) {
      console.error('Error removing prayer:', error);
    }
  };

  const generateNewPrayer = async () => {
    try {
      // Disable button and show waiting state
      setIsGeneratingNewPrayer(true);

      const onboardingDataStr = await AsyncStorage.getItem('onboardingData');
      if (!onboardingDataStr) {
        Alert.alert('Error', 'Could not find prayer preferences');
        return;
      }
      
      const onboardingData = JSON.parse(onboardingDataStr);
      const prompt = `Genera una oracion Cristian usando los siguientes elementos:
        Nombres por orar: ${onboardingData.prayerNames.join(', ')}
        Intenciones de orar: ${onboardingData.prayerFor.join(', ')}
        
        LIMITA LA ORACION A 420 palabras
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
          temperature: 0.9
        })
      });

      const data = await response.json();
      const newPrayer = data.choices?.[0]?.message?.content || '';
      
      // Update the text input with new prayer
      setEditedPrayer(newPrayer);

    } catch (error) {
      console.error('Error generating prayer:', error);
      Alert.alert('Error', 'Failed to generate new prayer');
    } finally {
      // Re-enable button
      setIsGeneratingNewPrayer(false);
    }
  };

  const handleSaveEdits = async () => {
    try {
      // Create updated prayers array with the edited prayer
      const updatedPrayers = savedPrayers.map((prayer, index) => 
        index === editingPrayerId 
          ? { ...prayer, text: editedPrayer }
          : prayer
      );

      // Save to AsyncStorage
      await AsyncStorage.setItem('savedPrayers', JSON.stringify(updatedPrayers));
      
      // Update state
      setSavedPrayers(updatedPrayers);
      setIsEditingDailyPrayer(false);
      setEditingPrayerId(null);
    } catch (error) {
      console.error('Error saving prayer:', error);
      Alert.alert('Error', 'Failed to save prayer');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.push('/prayer-tracker')}
        >
          <Ionicons name="arrow-back" size={28} color={Colors.light.primary} />
        </TouchableOpacity>
        <View style={styles.avatarContainer}>
          <Image 
            source={require('../assets/images/bendiga_01.png')} 
            style={styles.avatar}
          />
        </View>
      </View>

      <ScrollView style={styles.listsContainer} contentContainerStyle={styles.listsContent}>
        {/* Prayer Names Section */}
        <View style={[styles.section, isEditingPrayers && styles.expandedSection]}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => {
              if (!isEditingPrayers) {
                startEditing('prayers');
              } else if (!hasChanges) {
                setIsEditingPrayers(false);
              }
            }}
          >
            <ThemedText style={styles.sectionTitle}>Nombres de Oración</ThemedText>
            <Ionicons 
              name={isEditingPrayers ? "chevron-up" : "create-outline"} 
              size={24} 
              color={Colors.light.primary} 
            />
          </TouchableOpacity>
          
          {isEditingPrayers && (
            <View style={styles.sectionContent}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={newPrayerName}
                  onChangeText={setNewPrayerName}
                  placeholder="Agregar nuevo nombre"
                />
                <TouchableOpacity style={styles.addButton} onPress={addPrayerName}>
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              {onboardingData?.prayerNames.map((name, index) => (
                <View key={index} style={styles.listItem}>
                  <ThemedText style={{ color: Colors.light.text }}>{name}</ThemedText>
                  <TouchableOpacity onPress={() => removePrayerName(index)}>
                    <Ionicons name="close-circle" size={24} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {hasChanges && (
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={() => handleConfirm('prayers')}
                >
                  <ThemedText style={styles.confirmButtonText}>Confirmar Cambios</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Prayer For Section */}
        <View style={[styles.section, isEditingPrayerFor && styles.expandedSection]}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => {
              if (!isEditingPrayerFor) {
                startEditing('prayerFor');
              } else if (!hasChanges) {
                setIsEditingPrayerFor(false);
              }
            }}
          >
            <ThemedText style={styles.sectionTitle}>Intenciones de Oración</ThemedText>
            <Ionicons 
              name={isEditingPrayerFor ? "chevron-up" : "create-outline"} 
              size={24} 
              color={Colors.light.primary} 
            />
          </TouchableOpacity>
          
          {isEditingPrayerFor && (
            <View style={styles.sectionContent}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={newPrayerFor}
                  onChangeText={setNewPrayerFor}
                  placeholder="Agregar nueva intención"
                />
                <TouchableOpacity style={styles.addButton} onPress={addPrayerFor}>
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              {onboardingData?.prayerFor.map((intention, index) => (
                <View key={index} style={styles.listItem}>
                  <ThemedText style={{ color: Colors.light.text }}>{intention}</ThemedText>
                  <TouchableOpacity onPress={() => removePrayerFor(index)}>
                    <Ionicons name="close-circle" size={24} color={Colors.light.error} />
                  </TouchableOpacity>
                </View>
              ))}

              {hasChanges && (
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={() => handleConfirm('prayerFor')}
                >
                  <ThemedText style={styles.confirmButtonText}>Confirmar Cambios</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Saved Verses Section */}
        <View style={[styles.section, isViewingSavedVerses && styles.expandedSection]}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setIsViewingSavedVerses(!isViewingSavedVerses)}
          >
            <ThemedText style={styles.sectionTitle}>Versículos Favoritos</ThemedText>
            <Ionicons 
              name={isViewingSavedVerses ? "chevron-up" : "chevron-down"} 
              size={24} 
              color={Colors.light.primary} 
            />
          </TouchableOpacity>
          
          {isViewingSavedVerses && (
            <View style={styles.sectionContent}>
              {savedVerses.length === 0 ? (
                <ThemedText style={styles.emptyText}>No hay versículos guardados</ThemedText>
              ) : (
                savedVerses.map((verse, index) => (
                  <View key={index} style={styles.verseItem}>
                    <View style={styles.verseContent}>
                      <ThemedText style={[styles.verseText, { color: Colors.light.text }]}>
                        {verse.content}
                      </ThemedText>
                      <ThemedText style={[styles.verseReference, { color: Colors.light.primary }]}>
                        {verse.reference}
                      </ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveVerse(verse.reference)}>
                      <Ionicons name="close-circle" size={24} color={Colors.light.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Saved Prayers Section */}
        <View style={[styles.section, isViewingSavedPrayers && styles.expandedSection]}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setIsViewingSavedPrayers(!isViewingSavedPrayers)}
          >
            <ThemedText style={styles.sectionTitle}>Oraciones Guardadas</ThemedText>
            <Ionicons 
              name={isViewingSavedPrayers ? "chevron-up" : "chevron-down"} 
              size={24} 
              color={Colors.light.primary} 
            />
          </TouchableOpacity>
          
          {isViewingSavedPrayers && (
            <View style={styles.sectionContent}>
              {savedPrayers.length === 0 ? (
                <ThemedText style={styles.emptyText}>No hay oraciones guardadas</ThemedText>
              ) : (
                savedPrayers.map((prayer, index) => (
                  <View 
                    key={index}
                    style={styles.prayerContainer}
                  >
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleRemovePrayer(prayer.text)}
                    >
                      <Ionicons name="close-circle" size={24} color={Colors.light.error} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      onPress={() => {
                        setEditingPrayerId(index);
                        setEditedPrayer(prayer.text);
                        setIsEditingDailyPrayer(true);
                      }}
                    >
                      <View style={styles.prayerContent}>
                        <ThemedText style={styles.prayerText} numberOfLines={3}>
                          {prayer.text}
                        </ThemedText>
                        <ThemedText style={styles.prayerDate}>
                          {new Date(prayer.date).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* Edit Modal */}
              <Modal
                visible={isEditingDailyPrayer}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsEditingDailyPrayer(false)}
              >
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <ThemedText style={styles.modalTitle}>Editar Oración</ThemedText>
                    </View>
                    
                    <TextInput
                      style={styles.editInput}
                      multiline
                      value={editedPrayer}
                      onChangeText={setEditedPrayer}
                    />

                    <View style={styles.modalButtons}>
                      <TouchableOpacity 
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={() => {
                          setIsEditingDailyPrayer(false);
                          setEditingPrayerId(null);
                        }}
                      >
                        <ThemedText style={styles.buttonText}>Cancelar</ThemedText>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.modalButton, styles.saveButton]}
                        onPress={handleSaveEdits}
                      >
                        <ThemedText style={styles.saveButtonText}>Guardar</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={styles.restartButton}
          onPress={handleRestartOnboarding}
        >
          <ThemedText style={styles.restartButtonText}>Reiniciar Configuración</ThemedText>
        </TouchableOpacity> 

      
        {/* <TouchableOpacity style={styles.walletButton}>
          <Image 
            source={require('../assets/images/metalog.png')} 
            style={styles.walletIcon}
          />
          <ThemedText style={styles.walletButtonText}>Conectar Wallet</ThemedText>
        </TouchableOpacity> */}
      </ScrollView>
      
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 60,
    zIndex: 1,
    
  },
  avatarContainer: {
    width: 100,
    height: 180,
 
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    marginTop:22,
    width: 370,
    height: 370,
    resizeMode: 'contain',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  listsContainer: {
    flex: 1,
  },
  listsContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.primary,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  addButton: {
    backgroundColor: Colors.light.primary,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  confirmButton: {
    backgroundColor: Colors.light.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  expandedSection: {
    height: 'auto',
  },
  sectionContent: {
    padding: 15,
  },
  verseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  verseContent: {
    flex: 1,
    marginRight: 10,
  },
  verseText: {
    fontSize: 16,
    marginBottom: 4,
    lineHeight: 22,
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    padding: 20,
  },
  restartButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'red',
  },
  restartButtonText: {
    color: 'red',
    fontWeight: 'bold',
    fontSize: 16,
  },
  walletButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  walletIcon: {
    width: 55,
    height: 55,
    resizeMode: 'contain',
  },
  prayerContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    position: 'relative',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  prayerContent: {
    gap: 8,
    paddingRight: 24,
  },
  prayerText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  prayerDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  editInput: {
    height: 200,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
  },
  buttonText: {
    color: Colors.light.primary,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});
