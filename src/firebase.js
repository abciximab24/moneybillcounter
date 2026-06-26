import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyARVY1R4pdr7b8L6Wf3h_yHJQ6_kz6lofA",
  authDomain: "moneybillcounter.firebaseapp.com",
  projectId: "moneybillcounter",
  storageBucket: "moneybillcounter.firebasestorage.app",
  messagingSenderId: "298141152151",
  appId: "1:298141152151:web:c68f6c58f09ff74e708ad2",
  measurementId: "G-6NTV5XBHDT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

export default app;
