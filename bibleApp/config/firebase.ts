// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import Constants from 'expo-constants';

// Your web app's Firebase configuration with correct Android App ID
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.FIREBASE_API_KEY || "AIzaSyC_mTxm8DLT35-qgzzc2PZMn-zGYxRWD7Q",
  authDomain: Constants.expoConfig?.extra?.FIREBASE_AUTH_DOMAIN || "bendiga-4d926.firebaseapp.com",
  projectId: Constants.expoConfig?.extra?.FIREBASE_PROJECT_ID || "bendiga-4d926",
  storageBucket: Constants.expoConfig?.extra?.FIREBASE_STORAGE_BUCKET || "bendiga-4d926.firebasestorage.app",
  messagingSenderId: Constants.expoConfig?.extra?.FIREBASE_MESSAGING_SENDER_ID || "301087180608",
  appId: Constants.expoConfig?.extra?.FIREBASE_APP_ID || "1:301087180608:android:85697bbbbf6a18c8de1ca5", // Use Android App ID as fallback
  measurementId: Constants.expoConfig?.extra?.FIREBASE_MEASUREMENT_ID || "G-ZW07R7D1ZD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, storage, auth };