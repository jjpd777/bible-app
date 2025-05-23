import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>Profile & Authentication</Text>
      
      {/* Authentication Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Status</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Status:</Text>
          <Text style={[
            styles.statusValue, 
            { color: isAuthenticated ? 'green' : 'red' }
          ]}>
            {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
          </Text>
        </View>
      </View>

      {/* User Details Section */}
      {isAuthenticated && user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email:</Text>
            <Text style={styles.detailValue}>{user.email || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>User ID:</Text>
            <Text style={styles.detailValue}>{user.uid || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email Verified:</Text>
            <Text style={[
              styles.detailValue,
              { color: user.emailVerified ? 'green' : 'orange' }
            ]}>
              {user.emailVerified ? 'Yes' : 'No'}
            </Text>
          </View>
        </View>
      )}

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        {isAuthenticated ? (
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.authContainer}>
            {/* Tab Headers */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'signin' && styles.activeTab]}
                onPress={() => setActiveTab('signin')}
              >
                <Text style={[styles.tabText, activeTab === 'signin' && styles.activeTabText]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
                onPress={() => setActiveTab('signup')}
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
                  <TextInput
                    placeholder="Email"
                    value={signInEmail}
                    onChangeText={setSignInEmail}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    placeholder="Password"
                    value={signInPassword}
                    onChangeText={setSignInPassword}
                    secureTextEntry
                    style={styles.input}
                  />
                  <TouchableOpacity 
                    onPress={handleSignIn} 
                    style={[styles.signInButton, isSignInLoading && styles.disabledButton]}
                    disabled={isSignInLoading}
                  >
                    <Text style={styles.buttonText}>
                      {isSignInLoading ? 'Signing In...' : 'Sign In'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.authPane}>
                  <TextInput
                    placeholder="Email"
                    value={signUpEmail}
                    onChangeText={setSignUpEmail}
                    style={styles.input}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <TextInput
                    placeholder="Password"
                    value={signUpPassword}
                    onChangeText={setSignUpPassword}
                    secureTextEntry
                    style={styles.input}
                  />
                  <TouchableOpacity 
                    onPress={handleSignUp} 
                    style={[styles.signUpButton, isSignUpLoading && styles.disabledButton]}
                    disabled={isSignUpLoading}
                  >
                    <Text style={styles.buttonText}>
                      {isSignUpLoading ? 'Creating Account...' : 'Create Account'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  signOutButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  authContainer: {
    gap: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#333',
    fontWeight: 'bold',
  },
  tabContent: {
    minHeight: 200,
  },
  authPane: {
    gap: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  signInButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  signUpButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  notAuthenticatedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
