// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDhATfuTR03Z0MDHK6LdVtePzvnOlw2RYs",
    authDomain: "inmobiliaria-89dca.firebaseapp.com",
    projectId: "inmobiliaria-89dca",
    storageBucket: "inmobiliaria-89dca.firebasestorage.app",
    messagingSenderId: "264339137867",
    appId: "1:264339137867:web:721f347d175208451c34ce",
    measurementId: "G-71P9DV29GB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Providers
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

export default app;
