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
      <Text style={styles.biographyLabel}>Bio</Text>
      {!isEditingBiography ? (
        <TouchableOpacity 
          onPress={startEditingBiography}
          style={styles.biographyDisplayContainer}
          activeOpacity={0.7}
        >
          <Text style={styles.biographyDisplayText}>
            {userProfile?.biography || 'Tap to add a bio...'}
          </Text>
          <Ionicons name="pencil" size={16} color="#a0aec0" />
        </TouchableOpacity>
      ) : (
        <View style={styles.biographyEditWrapper}>
          <TextInput
            value={tempBiography}
            onChangeText={setTempBiography}
            style={styles.biographyTextInput}
            placeholder="Write something about yourself..."
            placeholderTextColor="#999"
            multiline
            maxLength={50}
            autoFocus
          />
          <Text style={styles.charCounter}>{tempBiography.length}/50</Text>
          <View style={styles.biographyButtonRow}>
            <TouchableOpacity 
              onPress={handleCancelBiographyEdit}
              style={styles.discardButton}
            >
              <Text style={styles.discardButtonText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleUpdateBiography}
              style={styles.saveButton}
              disabled={isUpdatingBiography}
            >
              <Text style={styles.saveButtonText}>
                {isUpdatingBiography ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  biographySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  biographyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 12,
  },
  biographyDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  biographyDisplayText: {
    fontSize: 14,
    color: '#718096',
    flex: 1,
    fontStyle: 'italic',
  },
  biographyEditWrapper: {
    gap: 12,
  },
  biographyTextInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2d3748',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 12,
    color: '#a0aec0',
    textAlign: 'right',
  },
  biographyButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  discardButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  discardButtonText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#667eea',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
}); 