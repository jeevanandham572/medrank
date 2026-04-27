import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

// TODO: Replace this with your actual Firebase configuration
// 1. Go to Firebase Console (https://console.firebase.google.com/)
// 2. Create a new project
// 3. Add a Web App to the project
// 4. Copy the firebaseConfig object below
// 5. Go to Firestore Database and click "Create database" (Start in Test Mode for development)

const firebaseConfig = {
  apiKey: "AIzaSyAr5t7pMCyTC6FuFNztdIAZb3h_0y5oSmU",
  authDomain: "medrank-d4066.firebaseapp.com",
  projectId: "medrank-d4066",
  storageBucket: "medrank-d4066.firebasestorage.app",
  messagingSenderId: "676396439743",
  appId: "1:676396439743:web:4eae9a0ae2a7dab1e60e0a",
  measurementId: "G-RFQBTPC1GY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { db, auth, provider };
