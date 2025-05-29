import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../constants/ApiConfig';
import { UsernameAvailability, UserProfile } from '../../types/profile';

interface UsernameEditorProps {
  userProfile: UserProfile;
  onUpdate: () => void;
}

export function UsernameEditor({ userProfile, onUpdate }: UsernameEditorProps) {
  const { user } = useAuthContext();
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<UsernameAvailability>({
    isValid: false,
    isAvailable: null,
    message: ''
  });

  const validateUsername = (value: string): { isValid: boolean; message: string } => {
    const trimmed = value.trim();
    
    if (!trimmed) {
      return { isValid: false, message: '' };
    }
    
    if (trimmed.length < 3) {
      return { isValid: false, message: 'Username must be at least 3 characters' };
    }
    
    if (trimmed.length > 20) {
      return { isValid: false, message: 'Username must be 20 characters or less' };
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return { isValid: false, message: 'Only letters, numbers, and underscores allowed' };
    }
    
    if (!/^[a-zA-Z]/.test(trimmed)) {
      return { isValid: false, message: 'Username must start with a letter' };
    }
    
    if (/__{2,}/.test(trimmed)) {
      return { isValid: false, message: 'No consecutive underscores allowed' };
    }
    
    return { isValid: true, message: '' };
  };

  const checkUsernameAvailability = async (value: string) => {
    const validation = validateUsername(value);
    
    if (!validation.isValid) {
      setUsernameAvailability({
        isValid: false,
        isAvailable: null,
        message: validation.message
      });
      return;
    }

    setIsCheckingAvailability(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/username/${value.trim()}/available`);
      const data = await response.json();
      
      setUsernameAvailability({
        isValid: true,
        isAvailable: data.available,
        message: data.available ? 'Username is available!' : 'Username is already taken'
      });
    } catch (error) {
      setUsernameAvailability({
        isValid: true,
        isAvailable: null,
        message: 'Unable to check availability'
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (!username.trim()) {
      setUsernameAvailability({ isValid: false, isAvailable: null, message: '' });
      return;
    }

    const timeoutId = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/\s/g, '');
    setUsername(cleaned);
  };

  const handleUpdateUsername = async () => {
    if (!usernameAvailability.isValid || !usernameAvailability.isAvailable) {
      Alert.alert('Invalid Username', usernameAvailability.message);
      return;
    }

    setIsUpdatingUsername(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user?.uid}/username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim()
        })
      });

      const data = await response.json();

      if (response.ok) {
        setIsEditingUsername(false);
        Alert.alert('Success', 'Username updated successfully!');
        onUpdate();
      } else if (response.status === 422) {
        Alert.alert('Username Taken', 'This username was just taken by someone else. Please choose another one.');
        checkUsernameAvailability(username);
      } else {
        throw new Error(data.error || 'Failed to update username');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update username. Please try again.');
    } finally {
      setIsUpdatingUsername(false);
    }
  };

  const handleCancelUsernameEdit = () => {
    setIsEditingUsername(false);
    setUsername('');
  };

  return (
    <>
      <View style={styles.settingItem}>
        <Ionicons name="person" size={20} color="#667eea" />
        <Text style={styles.settingLabel}>Username</Text>
        {!isEditingUsername ? (
          <View style={styles.usernameDisplayRow}>
            <Text style={styles.settingValue}>
              {userProfile.username ? `@${userProfile.username}` : 'Not set'}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setIsEditingUsername(true);
                setUsername(userProfile.username || '');
              }}
              style={styles.editIconButton}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={16} color="#667eea" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.usernameEditRow}>
            <View style={styles.usernameInputContainer}>
              <TextInput
                value={username}
                onChangeText={handleUsernameChange}
                style={[
                  styles.usernameInput,
                  usernameAvailability.isValid && usernameAvailability.isAvailable && styles.inputValid,
                  !usernameAvailability.isValid && username.length > 0 && styles.inputInvalid
                ]}
                placeholder="Enter username"
                placeholderTextColor="#a0aec0"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {isCheckingAvailability && (
                <Ionicons name="hourglass" size={16} color="#a0aec0" style={styles.checkingIcon} />
              )}
            </View>
            <View style={styles.usernameActions}>
              <TouchableOpacity 
                onPress={handleCancelUsernameEdit}
                style={styles.cancelIconButton}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={16} color="#718096" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleUpdateUsername}
                style={[
                  styles.saveIconButton,
                  (!usernameAvailability.isValid || !usernameAvailability.isAvailable || isUpdatingUsername) && styles.disabledIconButton
                ]}
                disabled={!usernameAvailability.isValid || !usernameAvailability.isAvailable || isUpdatingUsername}
                activeOpacity={0.8}
              >
                {isUpdatingUsername ? (
                  <Ionicons name="hourglass" size={16} color="#fff" />
                ) : (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {isEditingUsername && username.length > 0 && (
        <View style={[
          styles.validationMessage,
          usernameAvailability.isValid && usernameAvailability.isAvailable && styles.validationMessageSuccess,
          !usernameAvailability.isValid && styles.validationMessageError
        ]}>
          <Text style={[
            styles.validationText,
            usernameAvailability.isValid && usernameAvailability.isAvailable && styles.validationSuccess,
            !usernameAvailability.isValid && styles.validationError
          ]}>
            {usernameAvailability.message}
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2d3748',
    marginLeft: 12,
    flex: 1,
  },
  settingValue: {
    fontSize: 14,
    color: '#718096',
  },
  usernameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIconButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },
  usernameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  usernameInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  usernameInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: '#2d3748',
  },
  inputValid: {
    borderColor: '#27ae60',
  },
  inputInvalid: {
    borderColor: '#e74c3c',
  },
  checkingIcon: {
    marginLeft: 8,
  },
  usernameActions: {
    flexDirection: 'row',
    gap: 4,
  },
  cancelIconButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#f1f5f9',
  },
  saveIconButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#27ae60',
  },
  disabledIconButton: {
    backgroundColor: '#a0aec0',
  },
  validationMessage: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  validationText: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  validationSuccess: {
    color: '#27ae60',
  },
  validationError: {
    color: '#e74c3c',
  },
  validationMessageSuccess: {
    backgroundColor: '#f0fff4',
    borderColor: '#27ae60',
    borderWidth: 1,
  },
  validationMessageError: {
    backgroundColor: '#fef2f2',
    borderColor: '#e74c3c',
    borderWidth: 1,
  },
}); 