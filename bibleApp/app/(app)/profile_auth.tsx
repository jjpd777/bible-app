import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, SafeAreaView, Modal, ActivityIndicator, Platform, Image } from 'react-native';
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

interface Character {
  id: string;
  character_name: string;
  religion_category: string;
  religion_branch: string;
  character_system_prompt: string;
  active: boolean;
  public: boolean;
  creator_id: string;
  inserted_at: string;
  updated_at: string;
}

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
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loadingCharacters, setLoadingCharacters] = useState(false);
  const [wasAuthenticated, setWasAuthenticated] = useState(false);

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
      console.log('=== STARTING SIGNUP PROCESS ===');
      
      // First, create the Firebase user
      const firebaseUser = await signUp(signUpEmail.trim(), signUpPassword);
      console.log('Firebase user created:', firebaseUser?.uid);
      
      if (!firebaseUser?.uid) {
        throw new Error('No Firebase UID available after signup');
      }
      
      // Now use ProfileService to register in backend
      console.log('=== ATTEMPTING BACKEND REGISTRATION ===');
      const userProfile = await ProfileService.createUserProfile(
        firebaseUser.uid,
        signUpEmail.trim()
      );
      
      if (!userProfile) {
        throw new Error('Failed to create user profile in backend');
      }
      
      console.log('✅ Backend registration successful!', userProfile);
      
      // Clear form and show success
      setSignUpEmail('');
      setSignUpPassword('');
      setShowAuthModal(false);
      Alert.alert('Success', 'Account created successfully!');
      
      // Refresh the profile data
      await fetchUserProfile();
      
    } catch (error: any) {
      console.error('=== SIGNUP ERROR ===', error);
      
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
      const response = await fetch(`${API_BASE_URL}/users/username/${value.trim()}/available`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
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
          'ngrok-skip-browser-warning': 'true'
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
      console.log('=== FETCHING PROFILE DEBUG ===');
      console.log('Platform:', Platform.OS);
      console.log('Firebase UID:', user.uid);
      console.log('User email:', user.email);
      console.log('API_BASE_URL:', API_BASE_URL);
      console.log('Full URL:', `${API_BASE_URL}/users/${user.uid}`);
      
      const profile = await ProfileService.fetchUserProfile(user.uid);
      console.log('=== PROFILE FETCH RESULT ===');
      console.log('Fetched profile:', profile);
      console.log('Profile type:', typeof profile);
      console.log('Profile is null:', profile === null);
      console.log('Profile is undefined:', profile === undefined);
      
      if (!profile) {
        console.log('Profile is falsy - checking if user exists in backend...');
        
        // Let's try a direct fetch to see what the backend actually returns
        try {
          console.log('=== DIRECT BACKEND CHECK ===');
          const directResponse = await fetch(`${API_BASE_URL}/users/${user.uid}`, {
            headers: {
              'ngrok-skip-browser-warning': 'true'
            }
          });
          console.log('Direct response status:', directResponse.status);
          const directData = await directResponse.text();
          console.log('Direct response data:', directData);
          
          if (directResponse.ok && directData) {
            const parsedDirectData = JSON.parse(directData);
            console.log('Direct parsed data:', parsedDirectData);
            setUserProfile(parsedDirectData || {});
          } else {
            console.log('User might not exist in backend database');
            setUserProfile({});
          }
        } catch (directError) {
          console.error('Direct fetch error:', directError);
          setUserProfile({});
        }
      } else {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('=== PROFILE FETCH ERROR ===');
      console.error('Error details:', error);
      setUserProfile({});
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

  const fetchUserCharacters = useCallback(async () => {
    if (!user?.uid) {
      setCharacters([]);
      return;
    }

    setLoadingCharacters(true);
    try {
      const url = `${API_BASE_URL}/religious_characters/user/${user.uid}?page=1&page_size=50`;
      const response = await fetch(url, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setCharacters([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setCharacters(result.data || []);
    } catch (error) {
      console.error('Error fetching characters:', error);
      setCharacters([]);
    } finally {
      setLoadingCharacters(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    fetchUserCharacters();
  }, [fetchUserCharacters]);

  // Track authentication state changes
  useEffect(() => {
    if (isAuthenticated) {
      setWasAuthenticated(true);
    }
  }, [isAuthenticated]);

  // Only close modal when user signs out (was authenticated, now isn't)
  useEffect(() => {
    if (!isAuthenticated && wasAuthenticated && showAuthModal) {
      // User just signed out - close the modal
      const timer = setTimeout(() => {
        setShowAuthModal(false);
        setWasAuthenticated(false); // Reset the flag
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, wasAuthenticated, showAuthModal]);

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
            {/* Abbreviated Profile Card */}
            <View style={styles.profileCard}>
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
                  <View style={styles.avatarBadge}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>
                    {isLoadingProfile ? 'Loading...' : userProfile?.username ? `@${userProfile.username}` : 'Welcome!'}
                  </Text>
                  <Text style={styles.profileEmail}>{user?.email}</Text>
                  <View style={styles.badgeContainer}>
                    {userProfile?.is_admin && (
                      <View style={styles.adminBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#667eea" />
                        <Text style={styles.adminText}>Admin</Text>
                      </View>
                    )}
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Active</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.profileMenuButton}
                  onPress={() => setShowAuthModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="#a0aec0" />
                </TouchableOpacity>
              </View>

              {/* Abbreviated Bio Display */}
              {!isLoadingProfile && (
                <View style={styles.bioPreview}>
                  <Text style={styles.bioPreviewText} numberOfLines={2}>
                    {userProfile?.biography || 'No bio yet'}
                  </Text>
                </View>
              )}
            </View>

            {/* Create Character Button - Now outside */}
            <TouchableOpacity 
              onPress={() => router.push('/character_creation')}
              style={styles.createCharacterButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#27ae60', '#2ecc71']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconContainer}>
                    <Ionicons name="person-add" size={20} color="#fff" />
                  </View>
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.buttonText}>Create Character</Text>
                    <Text style={styles.buttonSubtext}>Start a new conversation</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Characters Section */}
            <View style={styles.charactersCard}>
              <View style={styles.charactersHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={styles.charactersTitle}>My Characters</Text>
                  <Text style={styles.charactersSubtitle}>Manage your AI companions</Text>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    style={styles.refreshButton}
                    onPress={fetchUserCharacters}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh" size={18} color="#667eea" />
                  </TouchableOpacity>
                  <View style={styles.charactersIcon}>
                    <Ionicons name="people" size={20} color="#667eea" />
                  </View>
                </View>
              </View>
              <UserCharactersList 
                characters={characters}
                loading={loadingCharacters}
                onCharacterSelect={(character) => {
                  console.log('Selected character:', character);
                  router.push(`/character/${character.id}`);
                }}
                onRefresh={fetchUserCharacters}
              />
            </View>
          </>
        ) : (
          <>
            {/* Guest Profile Card */}
          

            {/* Gratitude Feature Preview */}
            <View style={styles.featurePreviewCard}>
              <View style={styles.featureImageContainer}>
                <Image 
                  source={require('../../assets/images/signup_gratitude.png')}
                  style={styles.featureImage}
                  resizeMode="cover"
                />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Gratitude starts here</Text>
                <Text style={styles.featureDescription}>
                  Connect with spiritual guides, explore faith, and cultivate daily gratitude through meaningful conversations
                </Text>
                <View style={styles.featureBenefits}>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
                    <Text style={styles.benefitText}>Personal spiritual guidance</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
                    <Text style={styles.benefitText}>Daily gratitude practices</Text>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#27ae60" />
                    <Text style={styles.benefitText}>Faith-based conversations</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Guest Sign In Button - Outside */}
            <TouchableOpacity 
              onPress={() => setShowAuthModal(true)}
              style={styles.guestSignInButton}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.buttonContent}>
                  <View style={styles.buttonIconContainer}>
                    <Ionicons name="log-in" size={20} color="#fff" />
                  </View>
                  <View style={styles.buttonTextContainer}>
                    <Text style={styles.buttonText}>Start Your Journey</Text>
                    <Text style={styles.buttonSubtext}>Join the community</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.8)" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </>
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
  webContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    maxWidth: 428,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
    gap: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 428,
    ...Platform.select({
      web: {
        filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.1))',
      },
    }),
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
    fontWeight: '500',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c6f6d5',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#27ae60',
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    color: '#27ae60',
    fontWeight: '600',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c3dafe',
  },
  adminText: {
    fontSize: 11,
    color: '#667eea',
    fontWeight: '600',
    marginLeft: 4,
  },
  profileMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  bioPreview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  bioPreviewText: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  createCharacterButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonGradient: {
    padding: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  charactersCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flex: 1,
    minHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  charactersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  charactersTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a202c',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  charactersSubtitle: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c3dafe',
  },
  charactersIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  guestCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  guestProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guestAvatarContainer: {
    marginRight: 16,
  },
  guestAvatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  guestInfo: {
    flex: 1,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  guestDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    fontWeight: '500',
  },
  guestSignInButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  featurePreviewCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  featureImageContainer: {
    width: '100%',
    marginBottom: 20,
  },
  featureImage: {
    width: '100%',
    height: 200,
  },
  featureContent: {
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a202c',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  featureDescription: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: '500',
  },
  featureBenefits: {
    gap: 12,
    alignSelf: 'stretch',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#4a5568',
    fontWeight: '500',
    flex: 1,
  },
});
