import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChange, getSession, signIn, signUp, signOut } from '../services/authService';

const GUEST_STORAGE_KEY = '@auth_guest_user';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing Supabase session, then fall back to persisted guest
    const restoreAuth = async () => {
      try {
        const sess = await getSession(); // returns null on network error (won't throw)
        if (sess?.user) {
          setSession(sess);
          setUser(sess.user);
        } else {
          // No Supabase session — check for persisted guest
          const guestJson = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
          if (guestJson) {
            setUser(JSON.parse(guestJson));
          }
        }
      } catch {
        // Unexpected error — still try to restore a saved guest before giving up
        try {
          const guestJson = await AsyncStorage.getItem(GUEST_STORAGE_KEY);
          if (guestJson) setUser(JSON.parse(guestJson));
        } catch { /* nothing we can do */ }
      } finally {
        setLoading(false);
      }
    };

    restoreAuth();

    // Listen for Supabase auth changes (login / logout events).
    // Guard: do NOT overwrite a guest user — only handle real Supabase sessions.
    const { data: { subscription } } = onAuthStateChange((_event, sess) => {
      // If we currently have a guest user, ignore Supabase events
      // (Supabase fires SIGNED_OUT with a null session when it can't reach the server)
      setUser(prev => {
        if (prev?.isGuest) return prev; // keep guest unchanged
        return sess?.user || null;
      });
      setSession(sess?.user ? sess : null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const handleSignIn = async (email, password) => {
    const data = await signIn(email, password);
    return data;
  };

  const handleSignUp = async (email, password) => {
    const data = await signUp(email, password);
    return data;
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setSession(null);
    // Clear persisted guest state on explicit sign-out
    await AsyncStorage.removeItem(GUEST_STORAGE_KEY).catch(() => {});
  };

  const handleGuestSignIn = async () => {
    const guestUser = {
      id: 'guest-user',
      email: 'guest@traffic-optimizer.local',
      created_at: new Date().toISOString(),
      isGuest: true,
    };
    // Persist guest session so it survives app restarts
    await AsyncStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser)).catch(() => {});
    setUser(guestUser);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      guestSignIn: handleGuestSignIn,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
