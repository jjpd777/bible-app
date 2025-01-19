// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC_mTxm8DLT35-qgzzc2PZMn-zGYxRWD7Q",
  authDomain: "bendiga-4d926.firebaseapp.com",
  projectId: "bendiga-4d926",
  storageBucket: "bendiga-4d926.firebasestorage.app",
  messagingSenderId: "301087180608",
  appId: "1:301087180608:web:36d1aab1efd7a09cde1ca5",
  measurementId: "G-ZW07R7D1ZD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export { app, storage };