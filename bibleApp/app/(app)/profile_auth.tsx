import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useAuthContext } from '../../contexts/AuthContext';

export default function ProfileAuth() {
  const { user, signOut, signIn, signUp, isAuthenticated } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert('Success', 'Signed out successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    console.log('=== SIGN IN ATTEMPT ===');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    console.log('Email trimmed:', email.trim());
    console.log('Is email empty?', !email);
    console.log('Is password empty?', !password);
    
    // Basic validation
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      setIsLoading(false);
      return;
    }
    
    try {
      const result = await signIn(email.trim(), password);
      console.log('=== SIGN IN SUCCESS ===');
      console.log('Full result:', JSON.stringify({
        uid: result.user.uid,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
        creationTime: result.user.metadata.creationTime,
        lastSignInTime: result.user.metadata.lastSignInTime
      }, null, 2));
      
      setEmail('');
      setPassword('');
      Alert.alert('Success', 'Signed in successfully!');
    } catch (error: any) {
      console.log('=== SIGN IN ERROR ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error object:', error);
      
      // More user-friendly error messages
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
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    console.log('=== SIGN UP ATTEMPT ===');
    console.log('Email:', email);
    console.log('Password length:', password.length);
    
    try {
      const result = await signUp(email, password);
      console.log('=== SIGN UP SUCCESS ===');
      console.log('Full result:', JSON.stringify({
        uid: result.user.uid,
        email: result.user.email,
        emailVerified: result.user.emailVerified,
        creationTime: result.user.metadata.creationTime
      }, null, 2));
      
      setEmail('');
      setPassword('');
      Alert.alert('Success', 'Account created successfully!');
    } catch (error: any) {
      console.log('=== SIGN UP ERROR ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      Alert.alert('Error', `${error.code}: ${error.message}`);
    } finally {
      setIsLoading(false);
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
          <View style={styles.loginForm}>
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />
            <TouchableOpacity 
              onPress={handleSignIn} 
              style={[styles.signInButton, isLoading && styles.disabledButton]}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleSignUp} 
              style={[styles.signUpButton, isLoading && styles.disabledButton]}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>
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
  loginForm: {
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
