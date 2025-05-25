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
    console.log('=== PROFILE AUTH - SIGN IN ATTEMPT ===');
    console.log('Email:', signInEmail);
    
    if (!signInEmail.trim() || !signInPassword) {
      Alert.alert('Error', 'Please enter both email and password');
      setIsSignInLoading(false);
      return;
    }
    
    try {
      const result = await signIn(signInEmail.trim(), signInPassword);
      console.log('=== PROFILE AUTH - SIGN IN SUCCESS ===');
      console.log('User signed in:', result.user.uid);
      
      setSignInEmail('');
      setSignInPassword('');
      Alert.alert('Success', 'Signed in successfully!');
    } catch (error: any) {
      console.log('=== PROFILE AUTH - SIGN IN ERROR ===');
      console.error('Error:', error.code, error.message);
      
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
    console.log('=== PROFILE AUTH - SIGN UP ATTEMPT ===');
    console.log('Email:', signUpEmail);
    
    if (!signUpEmail.trim() || !signUpPassword) {
      Alert.alert('Error', 'Please enter both email and password');
      setIsSignUpLoading(false);
      return;
    }
    
    try {
      const result = await signUp(signUpEmail.trim(), signUpPassword);
      console.log('=== PROFILE AUTH - SIGN UP SUCCESS ===');
      console.log('User created and registered:', result.user.uid);
      
      setSignUpEmail('');
      setSignUpPassword('');
      Alert.alert('Success', 'Account created successfully!');
    } catch (error: any) {
      console.log('=== PROFILE AUTH - SIGN UP ERROR ===');
      console.error('Error:', error.code, error.message);
      
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
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profile</Text>
          <Text style={styles.headerSubtitle}>Manage your spiritual journey</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="person-circle" size={32} color="rgba(255,255,255,0.8)" />
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Authentication Status Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#667eea" />
            <Text style={styles.sectionTitle}>Authentication Status</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusIndicator,
              { backgroundColor: isAuthenticated ? '#27ae60' : '#e74c3c' }
            ]} />
            <Text style={styles.statusLabel}>Status:</Text>
            <Text style={[
              styles.statusValue, 
              { color: isAuthenticated ? '#27ae60' : '#e74c3c' }
            ]}>
              {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </Text>
          </View>
        </View>

        {/* User Details Section */}
        {isAuthenticated && user && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#667eea" />
              <Text style={styles.sectionTitle}>User Details</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email:</Text>
              <Text style={styles.detailValue}>{user.email || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>User ID:</Text>
              <Text style={styles.detailValue} numberOfLines={1}>{user.uid || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email Verified:</Text>
              <View style={styles.verificationContainer}>
                <View style={[
                  styles.verificationDot,
                  { backgroundColor: user.emailVerified ? '#27ae60' : '#f39c12' }
                ]} />
                <Text style={[
                  styles.detailValue,
                  { color: user.emailVerified ? '#27ae60' : '#f39c12' }
                ]}>
                  {user.emailVerified ? 'Yes' : 'No'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Actions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings" size={20} color="#667eea" />
            <Text style={styles.sectionTitle}>Actions</Text>
          </View>
          {isAuthenticated ? (
            <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton} activeOpacity={0.8}>
              <LinearGradient
                colors={['#e74c3c', '#c0392b']}
                style={styles.signOutButtonGradient}
              >
                <Ionicons name="log-out" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Sign Out</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.authContainer}>
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
                        style={styles.authButtonGradient}
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
                        placeholder="Password"
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
                        style={styles.authButtonGradient}
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
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    backdropFilter: 'blur(10px)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
    color: '#718096',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#2d3748',
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  verificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    justifyContent: 'flex-end',
  },
  verificationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
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
  signOutButtonGradient: {
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
  authContainer: {
    gap: 0,
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
  authButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
