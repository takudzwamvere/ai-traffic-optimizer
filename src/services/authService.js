import { supabase } from './supabase';

/**
 * Sign up a new user with email and password
 */
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

/**
 * Sign in with email and password
 */
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Get the current authenticated user
 */
export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

/**
 * Get the current session
 */
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
};

/**
 * Listen for auth state changes
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};
