import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChange, getSession, signIn, signUp, signOut } from '../services/authService';

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
    // Check for existing session
    getSession().then((sess) => {
      setSession(sess);
      setUser(sess?.user || null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user || null);
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
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
