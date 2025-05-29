import { useState, useEffect } from 'react';
import { User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, UserCredential } from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_STATE_KEY = '@auth_state';

export const useAuth = () => {
  console.log('=== useAuth HOOK CALLED ===');
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('=== useAuth EFFECT STARTING ===');
    
    const initializeAuth = async () => {
      try {
        // Check AsyncStorage first
        const cachedAuth = await AsyncStorage.getItem(AUTH_STATE_KEY);
        console.log('Cached auth from storage:', cachedAuth);
        
        if (cachedAuth) {
          const authData = JSON.parse(cachedAuth);
          console.log('Parsed auth data:', authData);
          
          if (authData.isAuthenticated && authData.uid) {
            // Create a mock user object for UI purposes
            const mockUser = {
              uid: authData.uid,
              email: authData.email,
              displayName: authData.displayName || null
            } as User;
            
            console.log('Setting user from cache:', mockUser);
            setUser(mockUser);
          }
        }
        
        setLoading(false);
        setIsInitialized(true);
        console.log('Auth initialization complete');
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, []);
  
  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    try {
      console.log('=== SIGN IN ATTEMPT ===');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('=== SIGN IN SUCCESS ===');
      
      // Immediately save to AsyncStorage
      const authData = {
        isAuthenticated: true,
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authData));
      console.log('Auth data saved to storage:', authData);
      
      setUser(userCredential.user);
      
      return userCredential;
    } catch (error: any) {
      console.error('=== SIGN IN ERROR ===', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string): Promise<UserCredential> => {
    try {
      console.log('=== SIGN UP ATTEMPT ===');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('=== SIGN UP SUCCESS ===');
      
      // Immediately save to AsyncStorage
      const authData = {
        isAuthenticated: true,
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authData));
      console.log('Auth data saved to storage:', authData);
      
      setUser(userCredential.user);
      
      return userCredential;
    } catch (error: any) {
      console.error('=== SIGN UP ERROR ===', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('=== SIGN OUT ATTEMPT ===');
      
      // Clear AsyncStorage first
      await AsyncStorage.removeItem(AUTH_STATE_KEY);
      console.log('Auth data cleared from storage');
      
      // Clear local state
      setUser(null);
      
      // Sign out from Firebase
      await firebaseSignOut(auth);
      console.log('=== SIGN OUT SUCCESS ===');
    } catch (error: any) {
      console.error('=== SIGN OUT ERROR ===', error);
      throw error;
    }
  };

  console.log('=== useAuth RETURNING STATE ===');
  console.log('Final state:', {
    hasUser: !!user,
    userUid: user?.uid || 'null',
    loading,
    isInitialized,
    isAuthenticated: !!user
  });

  return {
    user,
    loading,
    isInitialized,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut
  };
}; 