// firebase-config.js — Amplicue Web Store v3
// Replace the values below with YOUR Firebase project credentials.
// See SETUP.md for full instructions.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider,
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, limit,
  onSnapshot, getDocs,
  increment, arrayUnion, arrayRemove,
  serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";


// ── YOUR CONFIG ──────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyClqXcRV1iEskLM7xQgMqgdwTJUVBmZhJc",
  authDomain:        "the-admin-app-store-setup.firebaseapp.com",
  projectId:         "the-admin-app-store-setup",
  storageBucket:     "the-admin-app-store-setup.firebasestorage.app",
  messagingSenderId: "996506111041",
  appId:             "1:996506111041:web:711919298569a70c188ac0",
  measurementId:     "G-S3YJLG5VN2"
};

// ── ADMIN EMAILS (also enforce in Firestore rules) ───────────────
export const ADMIN_EMAILS = [
  "oloweayomide229@gmail.com",
  "amplicue@gmail.com"
];
export const isAdminEmail = (email) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());

// ── INIT ─────────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ── RE-EXPORTS ───────────────────────────────────────────────────
export {
  signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
  doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  collection, query, where, orderBy, limit,
  onSnapshot, getDocs,
  increment, arrayUnion, arrayRemove,
  serverTimestamp, runTransaction
};
