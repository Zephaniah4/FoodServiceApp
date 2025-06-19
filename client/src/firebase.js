// src/firebase-config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
   apiKey: "AIzaSyAuKJnKt7mm3jhIGVndV6WUdOL-MJ4egOE",
  authDomain: "food-service-app-slc.firebaseapp.com",
  projectId: "food-service-app-slc",
  storageBucket: "food-service-app-slc.firebasestorage.app",
  messagingSenderId: "196570350035",
  appId: "1:196570350035:web:3d545b683c1bb03750af26"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
export { db, auth };