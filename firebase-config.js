// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// TODO: Add your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDRRORZeAxarCsaziQzbfiUtbxNlM8OIgY",
  authDomain: "nm-dev-gb-vertexai-ga.firebaseapp.com",
  projectId: "nm-dev-gb-vertexai-ga",
  storageBucket: "nm-dev-gb-vertexai-ga.firebasestorage.app",
  messagingSenderId: "875291608176",
  appId: "1:875291608176:web:82d79794fd900abccee0b5",
  measurementId: "G-E27BW46NV1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Firestore service
export const db = getFirestore(app);
