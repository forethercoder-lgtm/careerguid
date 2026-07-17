import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  projectId: "career-b2ff1",
  appId: "1:358139968746:web:3a7094a9cde52f35b86b93",
  storageBucket: "career-b2ff1.firebasestorage.app",
  apiKey: "AIzaSyA2kUHTzmhpLAJExax-7l8fHB9Pg0jQwYE",
  authDomain: "career-b2ff1.firebaseapp.com",
  messagingSenderId: "358139968746",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
