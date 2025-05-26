import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, UserCredential, signInAnonymously } from 'firebase/auth';
import { auth } from '../config/firebase';

import { API_BASE_URL } from '../constants/ApiConfig';


export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendUserSynced, setBackendUserSynced] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('=== AUTH STATE CHANGED ===');
      console.log('User:', user ? `${user.email || 'Anonymous'} (${user.uid})` : 'No user');
      console.log('Is Anonymous:', user?.isAnonymous);
      
      // If no user exists, create an anonymous user immediately
      if (!user) {
        console.log('=== NO USER FOUND - CREATING ANONYMOUS USER ===');
        // Reset backend sync state when no user
        setBackendUserSynced(false);
        try {
          await signInAnonymously(auth);
          console.log('=== ANONYMOUS USER CREATION INITIATED ===');
          // Don't set loading to false here - wait for the auth state change
          return; // Early return to prevent further execution
        } catch (error) {
          console.error('Failed to create anonymous user:', error);
          setLoading(false);
          return;
        }
      }
      
      setUser(user);
      
      // If user exists and we haven't synced with backend yet, ensure they exist in backend
      if (user && !backendUserSynced) {
        try {
          await ensureUserExistsInBackend(user);
          setBackendUserSynced(true);
        } catch (error) {
          console.warn('Failed to sync user with backend:', error);
          // Don't block the user from using the app
          setBackendUserSynced(true); // Set to true to prevent retry loops
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, [backendUserSynced]);

  // New function to ensure user exists in backend (for existing users)
  const ensureUserExistsInBackend = async (firebaseUser: User) => {
    try {
      console.log('=== ENSURING USER EXISTS IN BACKEND ===');
      console.log('User Type:', firebaseUser.isAnonymous ? 'Anonymous' : 'Registered');
      
      // First, try to check if user exists
      const checkResponse = await fetch(`${API_BASE_URL}/api/users/${firebaseUser.uid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (checkResponse.ok) {
        console.log('User already exists in backend');
        return;
      }

      // If user doesn't exist (404), register them
      if (checkResponse.status === 404) {
        console.log('User not found in backend, registering...');
        await registerUserInBackend(firebaseUser, 'AUTH_STATE_SYNC');
      } else {
        console.warn('Unexpected response when checking user existence:', checkResponse.status);
      }
    } catch (error) {
      console.error('Error ensuring user exists in backend:', error);
      throw error;
    }
  };

  // Backend registration function (for sign-up AND auth state sync)
  const registerUserInBackend = async (firebaseUser: User, context: string) => {
    try {
      console.log(`=== BACKEND REGISTRATION CALLED FROM: ${context} ===`);
      console.log('Firebase User ID:', firebaseUser.uid);
      console.log('Firebase User Email:', firebaseUser.email);
      console.log('Is Anonymous:', firebaseUser.isAnonymous);
      
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          username: firebaseUser.isAnonymous 
            ? `Anonymous_${firebaseUser.uid.slice(-6)}` 
            : (firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User'),
          email: firebaseUser.email || null,
        }),
      });

      console.log('Backend response status:', response.status);

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Backend returned non-JSON response:', textResponse);
        throw new Error('Backend returned invalid response format');
      }

      const data = await response.json();
      console.log('Backend response data:', data);
      
      // Handle successful registration
      if (data.success) {
        console.log('User registered successfully in backend:', data.user);
        return data.user;
      }
      
      // Handle case where user already exists - treat as success
      if (response.status === 422 && 
          (data.errors?.firebase_uid?.some((error: string) => error.includes('already been taken')) ||
           data.message?.includes('already') ||
           data.errors?.email?.some((error: string) => error.includes('already been taken')))) {
        console.log('User already exists in backend (422), treating as success...');
        console.log('This is expected behavior when multiple auth state changes occur');
        return null; // Return null but don't throw error - this is success
      }
      
      // Only throw for actual errors
      throw new Error(data.message || 'Registration failed');
    } catch (error) {
      // Check if this is a network error vs our handled "already exists" case
      if (error instanceof Error && error.message.includes('already')) {
        console.log('Caught "already exists" error, treating as success');
        return null;
      }
      console.error(`Error registering user in backend (${context}):`, error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    try {
      console.log('=== SIGN IN FUNCTION CALLED ===');
      console.log('Email:', email);
      console.log('Auth object exists:', !!auth);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('=== SIGN IN SUCCESS ===');
      console.log('User ID:', userCredential.user.uid);
      console.log('Email verified:', userCredential.user.emailVerified);
      console.log('Last sign in:', userCredential.user.metadata.lastSignInTime);
      console.log('Creation time:', userCredential.user.metadata.creationTime);
      
      // ABSOLUTELY NO BACKEND CALLS HERE
      console.log('=== SIGN IN COMPLETE - NO BACKEND CALLS ===');
      
      return userCredential;
    } catch (error: any) {
      console.error('=== SIGN IN ERROR ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
  };

  const signUp = async (email: string, password: string): Promise<UserCredential> => {
    try {
      console.log('=== SIGN UP FUNCTION CALLED ===');
      console.log('Email:', email);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      console.log('=== FIREBASE SIGN UP SUCCESS ===');
      console.log('User ID:', userCredential.user.uid);
      
      // Register user in backend during sign-up
      try {
        console.log('=== ATTEMPTING BACKEND REGISTRATION ===');
        await registerUserInBackend(userCredential.user, 'SIGN_UP');
        console.log('=== BACKEND REGISTRATION SUCCESS ===');
        setBackendUserSynced(true);
      } catch (backendError) {
        console.warn('=== BACKEND REGISTRATION FAILED ===');
        console.warn('Backend error:', backendError);
        console.warn('Firebase user created successfully, continuing...');
        // Don't throw here - Firebase user is created successfully
        // The auth state change will try to sync again
      }
      
      return userCredential;
    } catch (error: any) {
      console.error('=== SIGN UP ERROR ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('=== SIGN OUT FUNCTION CALLED ===');
      
      // Reset backend sync state before signing out
      setBackendUserSynced(false);
      
      await firebaseSignOut(auth);
      console.log('=== SIGN OUT SUCCESS ===');
      console.log('Backend sync state reset for new user');
    } catch (error: any) {
      console.error('=== SIGN OUT ERROR ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user && !user.isAnonymous,
    isAnonymous: user?.isAnonymous || false,
    backendUserSynced,
    signIn,
    signUp,
    signOut
  };
}; 