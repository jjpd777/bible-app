import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, UserCredential } from 'firebase/auth';
import { auth } from '../config/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    try {
      console.log('Starting sign in process for:', email);
      console.log('Auth object exists:', !!auth);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      console.log('Sign in successful - User ID:', userCredential.user.uid);
      console.log('Sign in successful - Email verified:', userCredential.user.emailVerified);
      console.log('Sign in successful - Last sign in:', userCredential.user.metadata.lastSignInTime);
      
      return userCredential;
    } catch (error: any) {
      console.error('Sign in failed - Error code:', error.code);
      console.error('Sign in failed - Error message:', error.message);
      console.error('Sign in failed - Full error:', JSON.stringify(error, null, 2));
      throw error;
    }
  };

  const signUp = async (email: string, password: string): Promise<UserCredential> => {
    try {
      console.log('Starting sign up process for:', email);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Sign up successful - User ID:', userCredential.user.uid);
      console.log('Sign up successful - Email verified:', userCredential.user.emailVerified);
      console.log('User created at:', userCredential.user.metadata.creationTime);
      return userCredential;
    } catch (error: any) {
      console.error('Sign up failed:', error.code, error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Starting sign out process');
      await firebaseSignOut(auth);
      console.log('Sign out successful');
    } catch (error: any) {
      console.error('Sign out failed:', error.code, error.message);
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