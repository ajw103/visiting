// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// TODO: Add your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAO7NRDyNtHXHdMRA3AqgoW63YEYtN6Bbw",
  authDomain: "visiting-reservation.firebaseapp.com",
  projectId: "visiting-reservation",
  storageBucket: "visiting-reservation.firebasestorage.app",
  messagingSenderId: "275395290510",
  appId: "1:275395290510:web:9017ba8061164064ce70df",
  measurementId: "G-S6XC43CBC8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Firestore service
export const db = getFirestore(app);
