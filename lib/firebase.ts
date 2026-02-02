// lib/firebase.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
  apiKey: "AIzaSyDgvW6n-ynOgqL1K7t_GL9_PixaFN4dVoA",
  authDomain: "vadi-9b6fb.firebaseapp.com",
  projectId: "vadi-9b6fb",
  storageBucket: "vadi-9b6fb.appspot.com",
  messagingSenderId: "120139932928",
  appId: "1:120139932928:web:b209ed796deaba53c57fe5",
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
