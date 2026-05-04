import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Added Firestore import
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDsGYist7f2enKCGyHwBwSUw70wM_he1Ao",
  authDomain: "liorea-life.firebaseapp.com",
  databaseURL: "https://liorea-life-default-rtdb.firebaseio.com",
  projectId: "liorea-life",
  storageBucket: "liorea-life.firebasestorage.app",
  messagingSenderId: "993762401976",
  appId: "1:993762401976:web:a341527bbbb950afa2de4d",
  measurementId: "G-L0QS4KTGGX"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getDatabase(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const firestore = getFirestore(app); // Initialize Firestore
const storage = getStorage(app);

let analytics;
if (typeof window !== "undefined") {
  isSupported().then((yes) => {
    if (yes) {
      analytics = getAnalytics(app);
    }
  });
}

export { db, analytics, auth, googleProvider, firestore, storage }; // Export firestore