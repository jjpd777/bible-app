import { useState, useEffect } from 'react';
import { User, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, UserCredential, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileService } from '../services/profileService';

const AUTH_STATE_KEY = '@auth_state';
const HARDCODED_UID = "00000000-0000-0000-0000-000000000001";

export const useAuth = () => {
  console.log('=== useAuth HOOK CALLED ===');
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    console.log('=== useAuth EFFECT STARTING ===');
    
    const initializeAuth = async () => {
      try {
        // First, check and clear any hardcoded UID from storage
        const existingAuth = await AsyncStorage.getItem(AUTH_STATE_KEY);
        if (existingAuth) {
          const authData = JSON.parse(existingAuth);
          if (authData.uid === HARDCODED_UID) {
            console.log('Found hardcoded UID in storage, clearing...');
            await AsyncStorage.removeItem(AUTH_STATE_KEY);
          }
        }

        // Set up Firebase auth state listener
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log('Firebase auth state changed:', firebaseUser?.uid || 'null');
          
          if (firebaseUser) {
            // User is signed in with Firebase
            console.log('Real Firebase user detected:', {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName
            });
            
            // Validate that this is not the hardcoded UID
            if (firebaseUser.uid === HARDCODED_UID) {
              console.error('ERROR: Firebase returned hardcoded UID, this should never happen!');
              setUser(null);
              setLoading(false);
              setIsInitialized(true);
              return;
            }
            
            // Save real Firebase auth data to AsyncStorage
            const authData = {
              isAuthenticated: true,
              uid: firebaseUser.uid, // This is the REAL Firebase UID
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              timestamp: Date.now()
            };
            
            await AsyncStorage.setItem(AUTH_STATE_KEY, JSON.stringify(authData));
            console.log('Real Firebase auth data saved to storage:', authData);
            
            setUser(firebaseUser);
          } else {
            // No Firebase user - check AsyncStorage for cached auth
            console.log('No Firebase user, checking AsyncStorage...');
            const cachedAuth = await AsyncStorage.getItem(AUTH_STATE_KEY);
            
            if (cachedAuth) {
              const authData = JSON.parse(cachedAuth);
              console.log('Cached auth data found:', authData);
              
              // Only use cached data if it has a real Firebase UID (not the hardcoded one)
              if (authData.isAuthenticated && authData.uid && authData.uid !== HARDCODED_UID) {
                // Additional validation - ensure UID looks like a real Firebase UID
                if (authData.uid.length > 10 && !authData.uid.includes('0000-0000-0000')) {
                  const mockUser = {
                    uid: authData.uid,
                    email: authData.email,
                    displayName: authData.displayName || null
                  } as User;
                  
                  console.log('Using cached Firebase user:', mockUser);
                  setUser(mockUser);
                } else {
                  console.log('Cached UID looks suspicious, clearing...');
                  await AsyncStorage.removeItem(AUTH_STATE_KEY);
                  setUser(null);
                }
              } else {
                console.log('Cached auth data is invalid or uses hardcoded UID, clearing...');
                await AsyncStorage.removeItem(AUTH_STATE_KEY);
                setUser(null);
              }
            } else {
              console.log('No cached auth data found');
              setUser(null);
            }
          }
          
          setLoading(false);
          setIsInitialized(true);
        });

        // Return cleanup function
        return unsubscribe;
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
        setIsInitialized(true);
      }
    };

    const unsubscribe = initializeAuth();
    
    // Cleanup on unmount
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);
  
  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    try {
      console.log('=== SIGN IN ATTEMPT ===');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('=== SIGN IN SUCCESS ===');
      console.log('Real Firebase UID:', userCredential.user.uid);
      
      // The onAuthStateChanged listener will handle saving to AsyncStorage
      // and updating the user state
      
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
      console.log('=== FIREBASE SIGN UP SUCCESS ===');
      console.log('Real Firebase UID:', userCredential.user.uid);
      
      // AGGRESSIVE FIX: Immediately register in backend after Firebase signup
      try {
        console.log('=== ATTEMPTING BACKEND REGISTRATION ===');
        const backendProfile = await ProfileService.createUserProfile(
          userCredential.user.uid,
          email.trim()
        );
        
        if (backendProfile) {
          console.log('✅ Backend registration successful:', backendProfile);
        } else {
          console.error('❌ Backend registration returned null');
          // Don't throw error here - Firebase user is created, we can retry backend later
        }
      } catch (backendError) {
        console.error('❌ Backend registration failed:', backendError);
        // Don't throw error here - Firebase user is created, we can retry backend later
        // The user can still use the app, we'll just show them as needing profile setup
      }
      
      // The onAuthStateChanged listener will handle saving to AsyncStorage
      // and updating the user state
      
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
      
      // Sign out from Firebase (this will trigger onAuthStateChanged)
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