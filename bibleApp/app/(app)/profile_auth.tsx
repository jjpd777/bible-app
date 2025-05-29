import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, SafeAreaView, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../constants/ApiConfig';
import { useRouter } from 'expo-router';
import { AuthModal } from '../../components/profile/AuthModal';
import { BiographyEditor } from '../../components/profile/BiographyEditor';
import { UserCharactersList } from '../../components/profile/UserCharactersList';
import { ProfileService } from '../../services/profileService';
import { UserProfile } from '../../types/profile';

type AuthTab = 'signin' | 'signup';

export default function ProfileAuth() {
  const { user, signOut, signIn, signUp, isAuthenticated } = useAuthContext();
  const [activeTab, setActiveTab] = useState<AuthTab>('signin');
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [isSignInLoading, setIsSignInLoading] = useState(false);
  const [isSignUpLoading, setIsSignUpLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isUpdatingUsername, setIsUpdatingUsername] = useState(false);
  const [hasUsername, setHasUsername] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [usernameAvailability, setUsernameAvailability] = useState<{
    isValid: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({
    isValid: false,
    isAvailable: null,
    message: ''
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [biography, setBiography] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [tempBiography, setTempBiography] = useState('');
  const [isEditingBiography, setIsEditingBiography] = useState(false);
  const [isUpdatingBiography, setIsUpdatingBiography] = useState(false);
  const router = useRouter();

  console.log('=== ProfileAuth RENDERING ===');
  console.log('ProfileAuth - Auth state:', {
    hasUser: !!user,
    userUid: user?.uid || 'null',
    userEmail: user?.email || 'null',
    isAuthenticated
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowAuthModal(false);
      Alert.alert('Success', 'Signed out successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSignIn = async () => {
    setIsSignInLoading(true);
    
    if (!signInEmail.trim() || !signInPassword) {
      Alert.alert('Error', 'Please enter both email and password');
      setIsSignInLoading(false);
      return;
    }
    
    try {
      await signIn(signInEmail.trim(), signInPassword);
      setSignInEmail('');
      setSignInPassword('');
      setShowAuthModal(false);
      Alert.alert('Success', 'Signed in successfully!');
    } catch (error: any) {
      let userMessage = error.message;
      if (error.code === 'auth/user-not-found') {
        userMessage = 'No account found with this email address';
      } else if (error.code === 'auth/wrong-password') {
        userMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        userMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        userMessage = 'Too many failed attempts. Please try again later';
      }
      
      Alert.alert('Sign In Error', userMessage);
    } finally {
      setIsSignInLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsSignUpLoading(true);
    
    if (!signUpEmail.trim() || !signUpPassword) {
      Alert.alert('Error', 'Please enter both email and password');
      setIsSignUpLoading(false);
      return;
    }
    
    try {
      await signUp(signUpEmail.trim(), signUpPassword);
      setSignUpEmail('');
      setSignUpPassword('');
      setShowAuthModal(false);
      Alert.alert('Success', 'Account created successfully!');
    } catch (error: any) {
      let userMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        userMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        userMessage = 'Password should be at least 6 characters';
      } else if (error.code === 'auth/invalid-email') {
        userMessage = 'Invalid email address';
      }
      
      Alert.alert('Sign Up Error', userMessage);
    } finally {
      setIsSignUpLoading(false);
    }
  };

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
        setHasUsername(true);
        setIsEditingUsername(false);
        Alert.alert('Success', 'Username updated successfully!');
        await fetchUserProfile();
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

  const fetchUserProfile = async () => {
    if (!user?.uid) {
      console.log('No Firebase UID available');
      return;
    }
    
    setIsLoadingProfile(true);
    try {
      console.log('Fetching profile for Firebase UID:', user.uid);
      const profile = await ProfileService.fetchUserProfile(user.uid);
      console.log('Fetched profile:', profile);
      setUserProfile(profile || {});
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      fetchUserProfile();
    } else {
      setUserProfile({});
    }
  }, [isAuthenticated, user?.uid]);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.backgroundGradient}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>
            {isAuthenticated ? 'Your personal space' : 'Create your profile'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.headerIcon}
          onPress={() => setShowAuthModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isAuthenticated ? "settings" : "log-in"} 
            size={24} 
            color="rgba(255,255,255,0.9)" 
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isAuthenticated ? (
          <>
            {/* Profile Card */}
            <View style={styles.section}>
              {/* Profile Header */}
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>
                      {userProfile?.username ? userProfile.username.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </LinearGradient>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {isLoadingProfile ? 'Loading...' : userProfile?.username ? `@${userProfile.username}` : 'Welcome!'}
                  </Text>
                  {userProfile?.is_admin && (
                    <View style={styles.adminBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="#667eea" />
                      <Text style={styles.adminText}>Admin</Text>
                    </View>
                  )}
                  <View style={styles.statusBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#27ae60" />
                    <Text style={styles.statusText}>Active</Text>
                  </View>
                </View>
              </View>

              {/* Profile Information Display */}
              {isLoadingProfile ? (
                <View style={styles.loadingContainer}>
                  <Ionicons name="hourglass" size={20} color="#a0aec0" />
                  <Text style={styles.loadingText}>Loading profile...</Text>
                </View>
              ) : (
                <View style={styles.profileDetails}>
                  <BiographyEditor 
                    userProfile={userProfile}
                    onUpdate={fetchUserProfile}
                  />

                  {userProfile?.avatar_url && (
                    <View style={styles.fieldDisplay}>
                      <Text style={styles.fieldLabel}>Avatar URL</Text>
                      <Text style={styles.fieldValue}>
                        {userProfile.avatar_url}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <TouchableOpacity 
                onPress={() => router.push('/character_creation')}
                style={styles.createCharacterButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#27ae60', '#2ecc71']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="person-add" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Create Character</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Characters Section - Now outside the profile card */}
            <View style={styles.charactersCard}>
              <View style={styles.charactersHeader}>
                <Text style={styles.charactersTitle}>My Characters</Text>
              </View>
              <UserCharactersList 
                onCharacterSelect={(character) => {
                  console.log('Selected character:', character);
                  // Handle character selection here - maybe navigate to character detail
                  // router.push(`/character/${character.id}`);
                }}
              />
            </View>
          </>
        ) : (
          <View style={styles.section}>
            <View style={styles.guestProfile}>
              <View style={styles.guestAvatarContainer}>
                <Ionicons name="person-circle" size={80} color="#a0aec0" />
              </View>
              <Text style={styles.guestTitle}>Welcome to Bible App</Text>
              <Text style={styles.guestDescription}>
                Sign in to save your progress, bookmarks, and personalize your reading experience
              </Text>
              <TouchableOpacity 
                onPress={() => setShowAuthModal(true)}
                style={styles.guestSignInButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="log-in" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>Get Started</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        userProfile={userProfile}
        onProfileUpdate={fetchUserProfile}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
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
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  userInfo: {
    marginBottom: 24,
  },
  userEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '500',
  },
  signOutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
  },
  activeTabText: {
    color: '#2d3748',
    fontWeight: '600',
  },
  tabContent: {
    minHeight: 200,
  },
  authPane: {
    gap: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
  },
  authButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  usernamePrompt: {
    marginBottom: 20,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
  },
  promptDescription: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  promptButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  usernameDisplay: {
    marginBottom: 20,
  },
  usernameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usernameInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usernameLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginRight: 8,
  },
  usernameValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
  },
  editButton: {
    padding: 8,
  },
  usernameEditor: {
    marginBottom: 20,
  },
  editorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  validationMessage: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  validationText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  validationSuccess: {
    color: '#27ae60',
  },
  validationError: {
    color: '#e74c3c',
  },
  validationWarning: {
    color: '#f39c12',
  },
  guidelines: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  guidelinesText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  inputValid: {
    borderColor: '#27ae60',
  },
  inputInvalid: {
    borderColor: '#e74c3c',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '600',
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  guestProfile: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  guestAvatarContainer: {
    marginBottom: 24,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 12,
    textAlign: 'center',
  },
  guestDescription: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  guestSignInButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  accountSettings: {
    gap: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  authSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
    marginLeft: 8,
  },
  profileDetails: {
    gap: 16,
    marginBottom: 24,
  },
  fieldDisplay: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fieldLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '500',
    lineHeight: 22,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  adminText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    marginLeft: 4,
  },
  usernameDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIconButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  usernameEditRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  usernameInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  usernameInput: {
    flex: 1,
    fontSize: 14,
    color: '#2d3748',
    fontWeight: '500',
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
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  saveIconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#27ae60',
  },
  disabledIconButton: {
    backgroundColor: '#a0aec0',
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
  biographySection: {
    marginTop: 16,
  },
  biographyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  biographyDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  biographyDisplayText: {
    flex: 1,
    fontSize: 14,
    color: '#2d3748',
    lineHeight: 20,
  },
  biographyEditWrapper: {
    gap: 12,
  },
  biographyTextInput: {
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCounter: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'right',
  },
  biographyButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  discardButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  discardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#718096',
  },
  createCharacterButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    marginTop: 20,
  },
  charactersCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    flex: 1,
    minHeight: 300,
  },
  charactersHeader: {
    marginBottom: 16,
  },
  charactersTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
    letterSpacing: -0.3,
  },
});
