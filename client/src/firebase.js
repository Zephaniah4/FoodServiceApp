// src/firebase-config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getCurrentLocationKey } from './locationConfig';

const planoDallasConfig = {
  apiKey: "AIzaSyAuKJnKt7mm3jhIGVndV6WUdOL-MJ4egOE",
  authDomain: "food-service-app-slc.firebaseapp.com",
  projectId: "food-service-app-slc",
  storageBucket: "food-service-app-slc.firebasestorage.app",
  messagingSenderId: "196570350035",
  appId: "1:196570350035:web:3d545b683c1bb03750af26",
};

function getLocationFirebaseConfig(locationKey) {
  if (locationKey === 'planoDallas') {
    return planoDallasConfig;
  }

  const upperKey = locationKey.toUpperCase();
  const config = {
    apiKey: process.env[`REACT_APP_FIREBASE_${upperKey}_API_KEY`],
    authDomain: process.env[`REACT_APP_FIREBASE_${upperKey}_AUTH_DOMAIN`],
    projectId: process.env[`REACT_APP_FIREBASE_${upperKey}_PROJECT_ID`],
    storageBucket: process.env[`REACT_APP_FIREBASE_${upperKey}_STORAGE_BUCKET`],
    messagingSenderId: process.env[`REACT_APP_FIREBASE_${upperKey}_MESSAGING_SENDER_ID`],
    appId: process.env[`REACT_APP_FIREBASE_${upperKey}_APP_ID`],
  };

  const missingKeys = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing Firebase config for location "${locationKey}". Missing keys: ${missingKeys.join(', ')}`
    );
  }

  return config;
}

const locationKey = getCurrentLocationKey();
const firebaseConfig = getLocationFirebaseConfig(locationKey);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
export { db, auth };