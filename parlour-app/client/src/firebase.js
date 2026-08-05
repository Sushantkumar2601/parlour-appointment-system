import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD3HXMiZZlWa4Lsh_ss7c4VvxBIpyHhi6I",
  authDomain: "parlour-book-appointment.firebaseapp.com",
  projectId: "parlour-book-appointment",
  storageBucket: "parlour-book-appointment.firebasestorage.app",
  messagingSenderId: "762243999957",
  appId: "1:762243999957:web:32df52b3c5a964a7355a5c",
  measurementId: "G-E5ZM413ZWL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;