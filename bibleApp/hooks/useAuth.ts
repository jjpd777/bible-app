import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, UserCredential, signInAnonymously } from 'firebase/auth';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMixpanel } from '@/contexts/MixpanelContext';

import { API_BASE_URL } from '../constants/ApiConfig';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendUserSynced, setBackendUserSynced] = useState(false);
  const [backendUserId, setBackendUserId] = useState<string | null>(null);
  const [persistentUserId, setPersistentUserId] = useState<string | null>(null);
  
  // Use existing Mixpanel context
  const { mixpanel, isInitialized } = useMixpanel();

  useEffect(() => {
    const initializeUser = async () => {
      try {
        // Wait for Mixpanel to be initialized and get persistent user ID
        if (isInitialized && mixpanel) {
          const mixpanelDistinctId = await mixpanel.getDistinctId();
          console.log('=== MIXPANEL PERSISTENT ID ===', mixpanelDistinctId);
          setPersistentUserId(mixpanelDistinctId);

          // Load stored backend user ID
          const storedBackendUserId = await AsyncStorage.getItem('backend_user_id');
          if (storedBackendUserId) {
            console.log('=== LOADED STORED BACKEND USER ID ===', storedBackendUserId);
            setBackendUserId(storedBackendUserId);
          }

          // Ensure user exists in backend with Mixpanel ID as firebase_uid
          if (mixpanelDistinctId) {
            try {
              const backendUser = await ensureUserExistsInBackendWithMixpanel(mixpanelDistinctId);
              if (backendUser && backendUser.id) {
                const userIdString = backendUser.id.toString();
                setBackendUserId(userIdString);
                await AsyncStorage.setItem('backend_user_id', userIdString);
                console.log('=== STORED BACKEND USER ID ===', userIdString);
              }
              setBackendUserSynced(true);
            } catch (error) {
              console.warn('Failed to sync user with backend:', error);
              setBackendUserSynced(true);
            }
          }
        } else {
          console.log('=== WAITING FOR MIXPANEL INITIALIZATION ===');
        }
      } catch (error) {
        console.warn('Failed to initialize user:', error);
      }
    };

    initializeUser();

    // Still handle Firebase auth for actual authentication
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('=== FIREBASE AUTH STATE CHANGED ===');
      console.log('User:', user ? `${user.email || 'Anonymous'} (${user.uid})` : 'No user');
      
      // If no user exists, create an anonymous user
      if (!user) {
        console.log('=== CREATING ANONYMOUS FIREBASE USER ===');
        try {
          await signInAnonymously(auth);
          return;
        } catch (error) {
          console.error('Failed to create anonymous user:', error);
          setLoading(false);
          return;
        }
      }
      
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [isInitialized, mixpanel]); // Re-run when Mixpanel becomes available

  // New function to fetch backend user ID
  const fetchBackendUserId = async (firebaseUser: User) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${firebaseUser.uid}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setBackendUserId(userData.id || userData.user_id || null);
      }
    } catch (error) {
      console.warn('Failed to fetch backend user ID:', error);
    }
  };

  // New function specifically for Mixpanel ID
  const ensureUserExistsInBackendWithMixpanel = async (mixpanelId: string) => {
    try {
      console.log('=== ENSURING USER EXISTS IN BACKEND WITH MIXPANEL ID ===');
      console.log('Mixpanel ID (as firebase_uid):', mixpanelId);
      
      // First, try to check if user exists using Mixpanel ID as firebase_uid
      const checkResponse = await fetch(`${API_BASE_URL}/users/${mixpanelId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (checkResponse.ok) {
        console.log('User already exists in backend with Mixpanel ID');
        const userData = await checkResponse.json();
        return userData;
      }

      // If user doesn't exist (404), register them with Mixpanel ID
      if (checkResponse.status === 404) {
        console.log('User not found in backend, registering with Mixpanel ID...');
        const newUser = await registerUserInBackendWithMixpanel(mixpanelId);
        return newUser;
      } else {
        console.warn('Unexpected response when checking user existence:', checkResponse.status);
        return null;
      }
    } catch (error) {
      console.error('Error ensuring user exists in backend with Mixpanel ID:', error);
      throw error;
    }
  };

  // New function to register user with Mixpanel ID
  const registerUserInBackendWithMixpanel = async (mixpanelId: string) => {
    try {
      console.log('=== REGISTERING USER IN BACKEND WITH MIXPANEL ID ===');
      console.log('Mixpanel ID:', mixpanelId);

      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebase_uid: mixpanelId, // Use Mixpanel ID as firebase_uid
          username: `User_${mixpanelId.slice(-8)}`, // Generate username from last 8 chars
          email: null, // No email initially
          is_admin: false,
        }),
      });

      console.log('Backend registration response status:', response.status);

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
        console.log('User registered successfully in backend with Mixpanel ID:', data.user);
        return data.user;
      }
      
      // Handle case where user already exists - treat as success
      if (response.status === 422 && 
          (data.errors?.firebase_uid?.some((error: string) => error.includes('already been taken')) ||
           data.message?.includes('already'))) {
        console.log('User already exists in backend (422), treating as success...');
        return null; // Return null but don't throw error - this is success
      }
      
      // Only throw for actual errors
      throw new Error(data.message || 'Registration failed');
    } catch (error) {
      console.error('Error registering user in backend with Mixpanel ID:', error);
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
      
      // DON'T clear the backend user ID - keep it persistent
      console.log('=== KEEPING BACKEND USER ID FOR PERSISTENCE ===');
      
      await firebaseSignOut(auth);
      console.log('=== SIGN OUT SUCCESS ===');
    } catch (error: any) {
      console.error('=== SIGN OUT ERROR ===', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    isAuthenticated: !!user && !user.isAnonymous,
    isAnonymous: user?.isAnonymous || false,
    backendUserSynced,
    backendUserId,
    persistentUserId, // Expose Mixpanel ID for debugging
    signIn,
    signUp,
    signOut
  };
}; 