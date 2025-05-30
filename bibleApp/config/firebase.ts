// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Use the same Firebase configuration for all platforms
// This ensures consistent authentication across web and mobile
const firebaseConfig = {
  apiKey: Platform.OS === 'web' 
    ? (Constants.expoConfig?.extra?.FIREBASE_WEB_API_KEY || "AIzaSyAo5JXA6w43YS1K4RiZb4p758_uSPYLFhE")
    : (Constants.expoConfig?.extra?.FIREBASE_API_KEY || "AIzaSyC_mTxm8DLT35-qgzzc2PZMn-zGYxRWD7Q"),
  authDomain: "bendiga-4d926.firebaseapp.com",
  projectId: "bendiga-4d926",
  storageBucket: "bendiga-4d926.firebasestorage.app",
  messagingSenderId: "301087180608",
  appId: Platform.OS === 'web'
    ? (Constants.expoConfig?.extra?.FIREBASE_WEB_APP_ID || "1:301087180608:web:36d1aab1efd7a09cde1ca5")
    : (Constants.expoConfig?.extra?.FIREBASE_APP_ID || "1:301087180608:android:85697bbbbf6a18c8de1ca5"),
  measurementId: "G-ZW07R7D1ZD"
};

console.log('Firebase config for platform:', Platform.OS, {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey.substring(0, 10) + '...' // Don't log full API key
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);

// Initialize Analytics only on web (optional)
let analytics;
if (Platform.OS === 'web') {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    console.log('Analytics not available:', error);
  }
}

export { app, storage, auth, analytics };