import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, UserCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

import { API_BASE_URL } from '../constants/ApiConfig';


export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('=== AUTH STATE CHANGED ===');
      console.log('User:', user ? `${user.email} (${user.uid})` : 'No user');
      console.log('Previous user state:', user ? 'Had user' : 'No previous user');
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Backend registration function (ONLY for sign-up)
  const registerUserInBackend = async (firebaseUser: User, context: string) => {
    try {
      console.log(`=== BACKEND REGISTRATION CALLED FROM: ${context} ===`);
      console.log('Firebase User ID:', firebaseUser.uid);
      console.log('Firebase User Email:', firebaseUser.email);
      
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebase_uid: firebaseUser.uid,
          username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email,
        }),
      });

      console.log('Backend response status:', response.status);
      console.log('Backend response headers:', Object.fromEntries(response.headers.entries()));

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Backend returned non-JSON response:', textResponse);
        throw new Error('Backend returned invalid response format');
      }

      const data = await response.json();
      console.log('Backend response data:', data);
      
      if (data.success) {
        console.log('User registered successfully in backend:', data.user);
        return data.user;
      } else {
        if (data.message?.includes('already') || data.errors?.email?.includes('already been taken')) {
          console.log('User already exists in backend, continuing...');
          return null;
        }
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
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
      console.log('Email verified:', userCredential.user.emailVerified);
      console.log('Creation time:', userCredential.user.metadata.creationTime);
      
      // ONLY register user in backend during sign-up
      try {
        console.log('=== ATTEMPTING BACKEND REGISTRATION ===');
        await registerUserInBackend(userCredential.user, 'SIGN_UP');
        console.log('=== BACKEND REGISTRATION SUCCESS ===');
      } catch (backendError) {
        console.warn('=== BACKEND REGISTRATION FAILED ===');
        console.warn('Backend error:', backendError);
        console.warn('Firebase user created successfully, continuing...');
        // Don't throw here - Firebase user is created successfully
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
      await firebaseSignOut(auth);
      console.log('=== SIGN OUT SUCCESS ===');
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
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut
  };
}; 