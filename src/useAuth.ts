import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, sendPasswordResetEmail } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, googleProvider } from './firebaseSetup';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Listen for login/logout events automatically
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (isLogin: boolean) => {
    setAuthMessage(null);
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) { 
      setAuthMessage(err.message.replace('Firebase:', '').trim()); 
    }
  };

  const handleGoogle = async () => { 
    try { await signInWithPopup(auth, googleProvider); } 
    catch (err: any) { setAuthMessage(err.message); } 
  };

  const handlePasswordReset = async () => {
    if (!email) {
        setAuthMessage("Please enter your email address first.");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        setAuthMessage("Password reset email sent! Check your inbox.");
    } catch (error: any) {
        setAuthMessage("Error sending reset email: " + error.message);
    }
  };

  return {
    user, email, setEmail, password, setPassword, isLoginView, setIsLoginView,
    showPassword, setShowPassword, authMessage, handleAuth,
    handleGoogle, handlePasswordReset
  };
}