import React, { createContext, useContext, ReactNode } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';

const AuthContext = createContext<ReturnType<typeof useAuth> | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  console.log('=== AuthProvider RENDERING ===');
  const auth = useAuth();
  
  console.log('AuthProvider - Auth state:', {
    hasUser: !!auth.user,
    userUid: auth.user?.uid || 'null',
    loading: auth.loading,
    isInitialized: auth.isInitialized,
    isAuthenticated: auth.isAuthenticated
  });
  
  // Show loading screen until auth is initialized
  if (!auth.isInitialized) {
    console.log('AuthProvider - Not initialized yet, showing loading screen');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  
  console.log('AuthProvider - Initialized, rendering children');
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#667eea',
    fontWeight: '500',
  },
});

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}; 