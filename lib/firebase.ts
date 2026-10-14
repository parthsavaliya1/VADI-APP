// lib/firebase.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyDKFb4dsMNsH7YYvZBKYjwp3mZEu_IucXA",
  authDomain: "vadi-app-fresh.firebaseapp.com",
  projectId: "vadi-app-fresh",
  storageBucket: "vadi-app-fresh.firebasestorage.app",
  messagingSenderId: "1082226902300",
  appId: "1:1082226902300:android:3c4d7768e6eb4dcbc926d9",
};

// Init app safely
export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Lazy auth (CRITICAL)
let _auth: ReturnType<typeof getAuth> | null = null;

export const getFirebaseAuth = () => {
  if (!_auth) {
    _auth = getAuth(firebaseApp);
  }
  return _auth;
};
