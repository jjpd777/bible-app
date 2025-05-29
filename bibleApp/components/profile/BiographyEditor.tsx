import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../constants/ApiConfig';
import { UserProfile } from '../../types/profile';

interface BiographyEditorProps {
  userProfile: UserProfile;
  onUpdate: () => void;
}

export function BiographyEditor({ userProfile, onUpdate }: BiographyEditorProps) {
  const { user } = useAuthContext();
  const [tempBiography, setTempBiography] = useState('');
  const [isEditingBiography, setIsEditingBiography] = useState(false);
  const [isUpdatingBiography, setIsUpdatingBiography] = useState(false);

  const startEditingBiography = () => {
    setTempBiography(userProfile?.biography || '');
    setIsEditingBiography(true);
  };

  const handleCancelBiographyEdit = () => {
    setIsEditingBiography(false);
    setTempBiography('');
  };

  const handleUpdateBiography = async () => {
    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    if (tempBiography.trim() === (userProfile?.biography || '').trim()) {
      setIsEditingBiography(false);
      return;
    }

    setIsUpdatingBiography(true);
    
    try {
      console.log('Updating biography for Firebase UID:', user.uid);
      const response = await fetch(`${API_BASE_URL}/users/${user.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          biography: tempBiography.trim()
        })
      });

      if (response.ok) {
        setIsEditingBiography(false);
        Alert.alert('Success', 'Biography updated successfully!');
        onUpdate();
      } else {
        const data = await response.json();
        console.error('Biography update failed:', data);
        throw new Error(data.error || 'Failed to update biography');
      }
    } catch (error: any) {
      console.error('Biography update error:', error);
      Alert.alert('Error', error.message || 'Failed to update biography. Please try again.');
    } finally {
      setIsUpdatingBiography(false);
    }
  };

  return (
    <View style={styles.biographySection}>
      {!isEditingBiography ? (
        <View style={styles.biographyDisplay}>
          <Text style={styles.biographyLabel}>Bio</Text>
          <TouchableOpacity 
            onPress={startEditingBiography}
            style={styles.biographyDisplayContainer}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.biographyDisplayText,
              !userProfile?.biography && styles.placeholderText
            ]}>
              {userProfile?.biography || 'Tap to add a bio...'}
            </Text>
            <View style={styles.editIconContainer}>
              <Ionicons name="pencil" size={14} color="#a0aec0" />
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.biographyEditCard}>
          <View style={styles.editHeader}>
            <Text style={styles.editTitle}>Edit Bio</Text>
            <Text style={styles.editSubtitle}>Tell others about yourself</Text>
          </View>
          <View style={styles.biographyEditWrapper}>
            <View style={styles.inputContainer}>
              <TextInput
                value={tempBiography}
                onChangeText={setTempBiography}
                style={styles.biographyTextInput}
                placeholder="Write something about yourself..."
                placeholderTextColor="#a0aec0"
                multiline
                maxLength={50}
                autoFocus
              />
              <Text style={[
                styles.charCounter,
                tempBiography.length > 45 && styles.charCounterWarning
              ]}>
                {tempBiography.length}/50
              </Text>
            </View>
            <View style={styles.biographyButtonRow}>
              <TouchableOpacity 
                onPress={handleCancelBiographyEdit}
                style={styles.discardButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color="#718096" />
                <Text style={styles.discardButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleUpdateBiography}
                style={[styles.saveButton, isUpdatingBiography && styles.saveButtonDisabled]}
                disabled={isUpdatingBiography}
                activeOpacity={0.8}
              >
                {isUpdatingBiography ? (
                  <Ionicons name="hourglass" size={16} color="#fff" />
                ) : (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
                <Text style={styles.saveButtonText}>
                  {isUpdatingBiography ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  biographySection: {
    marginBottom: 4,
  },
  biographyDisplay: {
    // Simple display without card styling
  },
  biographyLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  biographyDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  biographyDisplayText: {
    fontSize: 16,
    color: '#2d3748',
    flex: 1,
    fontWeight: '500',
    lineHeight: 24,
  },
  placeholderText: {
    color: '#a0aec0',
    fontStyle: 'italic',
  },
  editIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  biographyEditCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  editHeader: {
    marginBottom: 16,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 4,
  },
  editSubtitle: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  biographyEditWrapper: {
    gap: 16,
  },
  inputContainer: {
    position: 'relative',
  },
  biographyTextInput: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    color: '#2d3748',
    minHeight: 100,
    textAlignVertical: 'top',
    fontWeight: '500',
    lineHeight: 24,
  },
  charCounter: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 12,
    color: '#a0aec0',
    fontWeight: '500',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  charCounterWarning: {
    color: '#e53e3e',
  },
  biographyButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  discardButtonText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: '#667eea',
    gap: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
}); 