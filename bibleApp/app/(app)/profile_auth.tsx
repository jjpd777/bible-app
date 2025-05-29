import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, SafeAreaView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../contexts/AuthContext';
import { API_BASE_URL } from '../../constants/ApiConfig';

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
  const [userProfile, setUserProfile] = useState({});
  const [biography, setBiography] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

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

  React.useEffect(() => {
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

  // Fetch user profile data from backend
  const fetchUserProfile = async () => {
    if (!user?.uid) return;
    
    setIsLoadingProfile(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.uid}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched user data:', data);
        
        if (data.success && data.user) {
          const userData = data.user;
          setUserProfile(userData);
          
          // Set form values, handling null values
          setBiography(userData.biography || '');
          setAvatarUrl(userData.avatar_url || '');
        } else {
          console.log('User data not found in response');
          setUserProfile({});
        }
      } else if (response.status === 404) {
        console.log('User not found in backend, will be created on first profile update');
        setUserProfile({});
      } else {
        console.error('Failed to fetch user profile:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Fetch user profile when user changes or component mounts
  React.useEffect(() => {
    if (isAuthenticated && user?.uid) {
      fetchUserProfile();
    } else {
      // Reset state when user signs out
      setUserProfile({});
      setBiography('');
      setAvatarUrl('');
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
          /* User Profile View */
          <View style={styles.section}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>
                    {userProfile.username ? userProfile.username.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </LinearGradient>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {isLoadingProfile ? 'Loading...' : userProfile.username ? `@${userProfile.username}` : 'Welcome!'}
                </Text>
                <Text style={styles.profileEmail}>{user?.email}</Text>
                {userProfile.is_admin && (
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
                {/* Username Display */}
                <View style={styles.fieldDisplay}>
                  <Text style={styles.fieldLabel}>Username</Text>
                  <Text style={styles.fieldValue}>
                    {userProfile.username ? `@${userProfile.username}` : 'No username set'}
                  </Text>
                </View>

                {/* Biography Display */}
                <View style={styles.fieldDisplay}>
                  <Text style={styles.fieldLabel}>Biography</Text>
                  <Text style={styles.fieldValue}>
                    {userProfile.biography || 'No biography added yet'}
                  </Text>
                </View>

                {/* Avatar URL Display (if exists) */}
                {userProfile.avatar_url && (
                  <View style={styles.fieldDisplay}>
                    <Text style={styles.fieldLabel}>Avatar URL</Text>
                    <Text style={styles.fieldValue}>
                      {userProfile.avatar_url}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Profile Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Bookmarks</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Notes</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Highlights</Text>
              </View>
            </View>
          </View>
        ) : (
          /* Guest Profile View */
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

      {/* Authentication Modal */}
      <Modal
        visible={showAuthModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {isAuthenticated ? 'Account Settings' : 'Authentication'}
            </Text>
            <TouchableOpacity 
              onPress={() => setShowAuthModal(false)}
              style={styles.closeButton}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#2d3748" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {isAuthenticated ? (
              /* Account Settings */
              <View style={styles.accountSettings}>
                <View style={styles.settingItem}>
                  <Ionicons name="mail" size={20} color="#667eea" />
                  <Text style={styles.settingLabel}>Email</Text>
                  <Text style={styles.settingValue}>{user?.email}</Text>
                </View>

                {/* Username Setting */}
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

                {/* Username validation message */}
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
                
                <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton} activeOpacity={0.8}>
                  <LinearGradient
                    colors={['#e74c3c', '#c0392b']}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="log-out" size={18} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.buttonText}>Sign Out</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              /* Authentication Forms */
              <View style={styles.authSection}>
                {/* Tab Headers */}
                <View style={styles.tabContainer}>
                  <TouchableOpacity 
                    style={[styles.tab, activeTab === 'signin' && styles.activeTab]}
                    onPress={() => setActiveTab('signin')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabText, activeTab === 'signin' && styles.activeTabText]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
                    onPress={() => setActiveTab('signup')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>
                      Create Account
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Tab Content */}
                <View style={styles.tabContent}>
                  {activeTab === 'signin' ? (
                    <View style={styles.authPane}>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="mail" size={18} color="#a0aec0" style={styles.inputIcon} />
                        <TextInput
                          placeholder="Email"
                          value={signInEmail}
                          onChangeText={setSignInEmail}
                          style={styles.input}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          placeholderTextColor="#a0aec0"
                        />
                      </View>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed" size={18} color="#a0aec0" style={styles.inputIcon} />
                        <TextInput
                          placeholder="Password"
                          value={signInPassword}
                          onChangeText={setSignInPassword}
                          secureTextEntry
                          style={styles.input}
                          placeholderTextColor="#a0aec0"
                        />
                      </View>
                      <TouchableOpacity 
                        onPress={handleSignIn} 
                        style={[styles.authButton, isSignInLoading && styles.disabledButton]}
                        disabled={isSignInLoading}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={isSignInLoading ? ['#a0aec0', '#a0aec0'] : ['#667eea', '#764ba2']}
                          style={styles.buttonGradient}
                        >
                          {isSignInLoading ? (
                            <Ionicons name="hourglass" size={18} color="#fff" style={styles.buttonIcon} />
                          ) : (
                            <Ionicons name="log-in" size={18} color="#fff" style={styles.buttonIcon} />
                          )}
                          <Text style={styles.buttonText}>
                            {isSignInLoading ? 'Signing In...' : 'Sign In'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.authPane}>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="mail" size={18} color="#a0aec0" style={styles.inputIcon} />
                        <TextInput
                          placeholder="Email"
                          value={signUpEmail}
                          onChangeText={setSignUpEmail}
                          style={styles.input}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          placeholderTextColor="#a0aec0"
                        />
                      </View>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="lock-closed" size={18} color="#a0aec0" style={styles.inputIcon} />
                        <TextInput
                          placeholder="Password (min 6 characters)"
                          value={signUpPassword}
                          onChangeText={setSignUpPassword}
                          secureTextEntry
                          style={styles.input}
                          placeholderTextColor="#a0aec0"
                        />
                      </View>
                      <TouchableOpacity 
                        onPress={handleSignUp} 
                        style={[styles.authButton, isSignUpLoading && styles.disabledButton]}
                        disabled={isSignUpLoading}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={isSignUpLoading ? ['#a0aec0', '#a0aec0'] : ['#27ae60', '#2ecc71']}
                          style={styles.buttonGradient}
                        >
                          {isSignUpLoading ? (
                            <Ionicons name="hourglass" size={18} color="#fff" style={styles.buttonIcon} />
                          ) : (
                            <Ionicons name="person-add" size={18} color="#fff" style={styles.buttonIcon} />
                          )}
                          <Text style={styles.buttonText}>
                            {isSignUpLoading ? 'Creating Account...' : 'Create Account'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
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
    marginLeft: 8,
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
});
