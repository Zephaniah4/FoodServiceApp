// src/firebase-config.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBdhu2-fURBmtPbX7mzeGpuzMfvVMAJddI",
  authDomain: "food-service-app-slc-dev.firebaseapp.com",
  databaseURL: "https://food-service-app-slc-dev-default-rtdb.firebaseio.com",
  projectId: "food-service-app-slc-dev",
  storageBucket: "food-service-app-slc-dev.firebasestorage.app",
  messagingSenderId: "627559184124",
  appId: "1:627559184124:web:70e8d14a8f670862028979",
  measurementId: "G-KW399PS9HX"
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
export { db, auth };