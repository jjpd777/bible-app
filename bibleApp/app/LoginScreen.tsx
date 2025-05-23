import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useAuthContext } from '../contexts/AuthContext';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, signUp } = useAuthContext();

  const handleSignIn = async () => {
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSignUp = async () => {
    try {
      await signUp(email, password);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      <TouchableOpacity onPress={handleSignIn} style={{ backgroundColor: 'blue', padding: 15, marginBottom: 10 }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSignUp} style={{ backgroundColor: 'green', padding: 15 }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
}; 