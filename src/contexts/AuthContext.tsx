"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  emailVerified: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  emailVerified: false,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);
  const router = useRouter();

  const fetchUserData = async (fbUser: FirebaseUser) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDoc.exists()) {
        setUser({ id: userDoc.id, ...userDoc.data() } as User);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        setEmailVerified(fbUser.emailVerified);
        await fetchUserData(fbUser);
      } else {
        setUser(null);
        setEmailVerified(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setEmailVerified(false);
    router.push('/login');
  };

  const refreshUser = async () => {
    const fbUser = auth.currentUser;
    if (fbUser) {
      await fbUser.reload();
      setEmailVerified(fbUser.emailVerified);
      await fetchUserData(fbUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, emailVerified, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
