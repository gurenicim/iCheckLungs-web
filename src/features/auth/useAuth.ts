import { useState, useEffect } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';

const googleProvider = new GoogleAuthProvider();

async function ensureUserProfile(user: User) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email ?? '',
      plan: 'trial',
      scansLimit: 3,
      scansRemaining: 3,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    getRedirectResult(auth).catch((err) => {
      setRedirectError(err?.message ?? 'Google sign-in failed');
    });
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) await ensureUserProfile(u);
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

  const register = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password);

  const googleSignIn = () => signInWithRedirect(auth, googleProvider);

  const signOut = () => firebaseSignOut(auth);

  return { user, loading, redirectError, signIn, register, googleSignIn, signOut };
}
