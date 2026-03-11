import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function register(email, password, name) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    // Crear perfil en Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name,
      email,
      hourlyRate: 6000, // Valor por hora default (pesos colombianos)
      createdAt: new Date().toISOString(),
    });
    // Crear config default
    await setDoc(doc(db, 'config', user.uid), {
      hourlyRate: 6000,
      nightSurcharge: 1.35,
      sundaySurcharge: 2.0,
      holidaySurcharge: 2.0,
      extraDaySurcharge: 1.25,
      extraNightSurcharge: 1.75,
    });
    return user;
  }

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function logout() {
    return signOut(auth);
  }

  async function recoverPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  async function loadUserProfile(uid) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setUserProfile(docSnap.data());
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userProfile,
    register,
    login,
    logout,
    recoverPassword,
    loadUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
