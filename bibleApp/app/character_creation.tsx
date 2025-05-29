import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  TextInput, 
  SafeAreaView, 
  ScrollView,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../contexts/AuthContext';
import { API_BASE_URL } from '../constants/ApiConfig';
import { router } from 'expo-router';

interface ReligionOption {
  category: string;
  branches: string[];
}

const RELIGION_OPTIONS: ReligionOption[] = [
  {
    category: 'Christianity',
    branches: ['Catholic', 'Protestant', 'Orthodox', 'Anglican', 'Baptist', 'Methodist', 'Presbyterian', 'Pentecostal', 'Lutheran', 'Other']
  },
  {
    category: 'Islam',
    branches: ['Sunni', 'Shia', 'Sufi', 'Other']
  },
  {
    category: 'Judaism',
    branches: ['Orthodox', 'Conservative', 'Reform', 'Reconstructionist', 'Other']
  },
  {
    category: 'Buddhism',
    branches: ['Theravada', 'Mahayana', 'Vajrayana', 'Zen', 'Pure Land', 'Other']
  },
  {
    category: 'Hinduism',
    branches: ['Vaishnavism', 'Shaivism', 'Shaktism', 'Smartism', 'Other']
  },
  {
    category: 'Other',
    branches: ['Sikhism', 'Jainism', 'Taoism', 'Confucianism', 'Bahá\'í', 'Other']
  }
];

export default function CharacterCreation() {
  const { user, isAuthenticated } = useAuthContext();
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [characterName, setCharacterName] = useState('');
  const [characterLabel, setCharacterLabel] = useState('');
  const [religionCategory, setReligionCategory] = useState('');
  const [religionBranch, setReligionBranch] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [gratitudePrompt, setGratitudePrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isActive, setIsActive] = useState(true);
  
  // UI state
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);

  const validateForm = (): boolean => {
    if (!characterName.trim()) {
      Alert.alert('Validation Error', 'Character name is required');
      return false;
    }
    
    if (!characterLabel.trim()) {
      Alert.alert('Validation Error', 'Character label is required');
      return false;
    }
    
    if (!religionCategory) {
      Alert.alert('Validation Error', 'Please select a religion category');
      return false;
    }
    
    if (!religionBranch) {
      Alert.alert('Validation Error', 'Please select a religion branch');
      return false;
    }
    
    if (!systemPrompt.trim()) {
      Alert.alert('Validation Error', 'System prompt is required');
      return false;
    }
    
    if (systemPrompt.trim().length < 50) {
      Alert.alert('Validation Error', 'System prompt should be at least 50 characters');
      return false;
    }
    
    return true;
  };

  const handleCreateCharacter = async () => {
    if (!isAuthenticated || !user?.uid) {
      Alert.alert('Error', 'You must be signed in to create a character');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch(`${API_BASE_URL}/religious_characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          character_name: characterName.trim(),
          character_label: characterLabel.trim(),
          religion_category: religionCategory,
          religion_branch: religionBranch,
          character_system_prompt: systemPrompt.trim(),
          character_gratitude_prompt: gratitudePrompt.trim() || '',
          character_image_prompt: imagePrompt.trim() || '',
          character_image_url: imageUrl.trim() || '',
          active: isActive,
          public: isPublic,
          creator_id: user.uid
        })
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success', 
          'Character created successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        throw new Error(data.error || 'Failed to create character');
      }
    } catch (error: any) {
      console.error('Error creating character:', error);
      Alert.alert('Error', error.message || 'Failed to create character. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const getAvailableBranches = (): string[] => {
    const selectedReligion = RELIGION_OPTIONS.find(r => r.category === religionCategory);
    return selectedReligion?.branches || [];
  };

  const resetBranchSelection = () => {
    setReligionBranch('');
    setShowBranchPicker(false);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unauthenticatedContainer}>
          <Ionicons name="lock-closed" size={64} color="#a0aec0" />
          <Text style={styles.unauthenticatedTitle}>Sign In Required</Text>
          <Text style={styles.unauthenticatedText}>
            You need to be signed in to create a character
          </Text>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.backgroundGradient}
      />
      
      {/* Debug Info */}
      <View style={styles.debugContainer}>
        <Text style={styles.debugText}>
          Debug - User ID: {user?.uid || 'NOT FOUND'}
        </Text>
      </View>
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Create Character</Text>
          <Text style={styles.headerSubtitle}>Bring a religious figure to life</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            {/* Basic Information */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Character Name *</Text>
                <TextInput
                  value={characterName}
                  onChangeText={setCharacterName}
                  style={styles.textInput}
                  placeholder="e.g., Saint Francis of Assisi"
                  placeholderTextColor="#a0aec0"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Character Label *</Text>
                <TextInput
                  value={characterLabel}
                  onChangeText={setCharacterLabel}
                  style={styles.textInput}
                  placeholder="e.g., The Gentle Saint"
                  placeholderTextColor="#a0aec0"
                />
              </View>
            </View>

            {/* Religion Selection */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Religious Background</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Religion Category *</Text>
                <TouchableOpacity
                  onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  style={styles.pickerButton}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pickerButtonText, !religionCategory && styles.placeholderText]}>
                    {religionCategory || 'Select a religion category'}
                  </Text>
                  <Ionicons 
                    name={showCategoryPicker ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#a0aec0" 
                  />
                </TouchableOpacity>
                
                {showCategoryPicker && (
                  <View style={styles.pickerOptions}>
                    {RELIGION_OPTIONS.map((religion) => (
                      <TouchableOpacity
                        key={religion.category}
                        onPress={() => {
                          setReligionCategory(religion.category);
                          setShowCategoryPicker(false);
                          resetBranchSelection();
                        }}
                        style={styles.pickerOption}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.pickerOptionText}>{religion.category}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>

              {religionCategory && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Religion Branch *</Text>
                  <TouchableOpacity
                    onPress={() => setShowBranchPicker(!showBranchPicker)}
                    style={styles.pickerButton}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.pickerButtonText, !religionBranch && styles.placeholderText]}>
                      {religionBranch || 'Select a branch'}
                    </Text>
                    <Ionicons 
                      name={showBranchPicker ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color="#a0aec0" 
                    />
                  </TouchableOpacity>
                  
                  {showBranchPicker && (
                    <View style={styles.pickerOptions}>
                      {getAvailableBranches().map((branch) => (
                        <TouchableOpacity
                          key={branch}
                          onPress={() => {
                            setReligionBranch(branch);
                            setShowBranchPicker(false);
                          }}
                          style={styles.pickerOption}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.pickerOptionText}>{branch}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Character Prompts */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Character Personality</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>System Prompt *</Text>
                <Text style={styles.inputDescription}>
                  Describe how this character should behave and respond
                </Text>
                <TextInput
                  value={systemPrompt}
                  onChangeText={setSystemPrompt}
                  style={[styles.textInput, styles.textArea]}
                  placeholder="You are [Character Name], known for... Speak with..."
                  placeholderTextColor="#a0aec0"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.charCounter}>{systemPrompt.length} characters</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gratitude Prompt</Text>
                <Text style={styles.inputDescription}>
                  Optional: How should this character express gratitude?
                </Text>
                <TextInput
                  value={gratitudePrompt}
                  onChangeText={setGratitudePrompt}
                  style={[styles.textInput, styles.textArea]}
                  placeholder="When expressing gratitude, this character..."
                  placeholderTextColor="#a0aec0"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Image Settings */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Character Image</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Image URL</Text>
                <TextInput
                  value={imageUrl}
                  onChangeText={setImageUrl}
                  style={styles.textInput}
                  placeholder="https://example.com/character-image.jpg"
                  placeholderTextColor="#a0aec0"
                  keyboardType="url"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Image Generation Prompt</Text>
                <Text style={styles.inputDescription}>
                  Describe how this character should look for AI image generation
                </Text>
                <TextInput
                  value={imagePrompt}
                  onChangeText={setImagePrompt}
                  style={[styles.textInput, styles.textArea]}
                  placeholder="A serene portrait of [character] wearing..."
                  placeholderTextColor="#a0aec0"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Settings */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Character Settings</Text>
              
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Public Character</Text>
                  <Text style={styles.switchDescription}>
                    Allow other users to chat with this character
                  </Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: '#e2e8f0', true: '#667eea' }}
                  thumbColor={isPublic ? '#fff' : '#f4f3f4'}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.switchLabel}>Active Character</Text>
                  <Text style={styles.switchDescription}>
                    Character is available for conversations
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: '#e2e8f0', true: '#27ae60' }}
                  thumbColor={isActive ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>

            {/* Create Button */}
            <TouchableOpacity 
              onPress={handleCreateCharacter}
              style={[styles.createButton, isCreating && styles.disabledButton]}
              disabled={isCreating}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isCreating ? ['#a0aec0', '#a0aec0'] : ['#667eea', '#764ba2']}
                style={styles.buttonGradient}
              >
                {isCreating ? (
                  <Ionicons name="hourglass" size={18} color="#fff" style={styles.buttonIcon} />
                ) : (
                  <Ionicons name="add-circle" size={18} color="#fff" style={styles.buttonIcon} />
                )}
                <Text style={styles.buttonText}>
                  {isCreating ? 'Creating Character...' : 'Create Character'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 8,
  },
  section: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 6,
  },
  inputDescription: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 8,
    lineHeight: 16,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2d3748',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'right',
    marginTop: 4,
  },
  pickerButton: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#a0aec0',
    fontWeight: '400',
  },
  pickerOptions: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  switchInfo: {
    flex: 1,
    marginRight: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 2,
  },
  switchDescription: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 16,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  unauthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  unauthenticatedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d3748',
    marginTop: 20,
    marginBottom: 12,
  },
  unauthenticatedText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
  },
  debugContainer: {
    backgroundColor: 'rgba(255, 255, 0, 0.8)',
    padding: 10,
    margin: 10,
    borderRadius: 8,
    marginTop: 50,
  },
  debugText: {
    fontSize: 12,
    color: '#000',
    fontWeight: '600',
    textAlign: 'center',
  },
}); 