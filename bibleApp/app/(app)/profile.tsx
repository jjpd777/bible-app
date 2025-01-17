import { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View, TextInput, Alert, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../../constants/Colors';

type OnboardingData = {
  prayerNames: string[];
  notificationsEnabled: boolean;
  sleepTime: Date;
  wakeTime: Date;
  alarmFrequency: number;
  prayerFor: string[];
};

export default function ProfileScreen() {
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [editingData, setEditingData] = useState<OnboardingData | null>(null);
  const [newPrayerName, setNewPrayerName] = useState('');
  const [newPrayerFor, setNewPrayerFor] = useState('');
  const [isEditingPrayers, setIsEditingPrayers] = useState(false);
  const [isEditingPrayerFor, setIsEditingPrayerFor] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadOnboardingData();
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

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle-outline" size={80} color="#666" />
        </View>
        <ThemedText style={styles.name}>User Name</ThemedText>
        <ThemedText style={styles.email}>user@example.com</ThemedText>
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
            <ThemedText style={styles.sectionTitle}>Prayer Names</ThemedText>
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
                  placeholder="Add new prayer name"
                />
                <TouchableOpacity style={styles.addButton} onPress={addPrayerName}>
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              {onboardingData?.prayerNames.map((name, index) => (
                <View key={index} style={styles.listItem}>
                  <ThemedText>{name}</ThemedText>
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
                  <ThemedText style={styles.confirmButtonText}>Confirm Changes</ThemedText>
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
            <ThemedText style={styles.sectionTitle}>Prayer Intentions</ThemedText>
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
                  placeholder="Add new intention"
                />
                <TouchableOpacity style={styles.addButton} onPress={addPrayerFor}>
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>
              
              {onboardingData?.prayerFor.map((intention, index) => (
                <View key={index} style={styles.listItem}>
                  <ThemedText>{intention}</ThemedText>
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
                  <ThemedText style={styles.confirmButtonText}>Confirm Changes</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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
    backgroundColor: Colors.light.background,
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
});
