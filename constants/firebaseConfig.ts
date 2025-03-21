// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBJA42ntW__xBj34LbRYdlEUu8X11H6lDA",
  authDomain: "trailmate-71ce9.firebaseapp.com",
  projectId: "trailmate-71ce9",
  storageBucket: "trailmate-71ce9.firebasestorage.app",
  messagingSenderId: "665009128151",
  appId: "1:665009128151:web:dfb041931354c86457e692",
  measurementId: "G-6MKYJPTNZN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);