import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../contexts/AuthContext';

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
            {isAuthenticated ? 'Manage your account' : 'Sign in to access all features'}
          </Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="person-circle" size={32} color="rgba(255,255,255,0.8)" />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {isAuthenticated ? (
          /* Authenticated User View */
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
              <Text style={styles.sectionTitle}>Signed In</Text>
            </View>
            
            <View style={styles.userInfo}>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userStatus}>Account Active</Text>
            </View>

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
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="key" size={20} color="#667eea" />
              <Text style={styles.sectionTitle}>Authentication Required</Text>
            </View>

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
});
