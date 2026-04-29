import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Upload the user's avatar image to Supabase Storage.
 * Image is stored at: avatars/{userId}/avatar.jpg
 * Returns the public URL on success.
 */
export const uploadAvatar = async (userId, localUri) => {
  if (userId === 'guest-user') {
    return localUri; // Mock online storage with local path
  }
  // 1. Fetch the image as a blob from the local file URI
  const response = await fetch(localUri);
  const blob = await response.blob();

  // 2. Convert blob to ArrayBuffer for Supabase upload
  const arrayBuffer = await new Response(blob).arrayBuffer();

  const filePath = `${userId}/avatar.jpg`;

  // 3. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: true, // Overwrite existing avatar
    });

  if (uploadError) throw uploadError;

  // 4. Get the public URL
  const { data } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

/**
 * Compute user stats from their search_history.
 * Returns: { totalSearches, distinctDestinations, timeSavedMins }
 */
export const getUserStats = async (userId) => {
  let data = [];
  
  if (userId === 'guest-user') {
    try {
      const json = await AsyncStorage.getItem('@guest_history');
      data = json ? JSON.parse(json) : [];
    } catch (e) {
      return { totalSearches: 0, distinctDestinations: 0, timeSavedMins: 0 };
    }
  } else {
    const { data: remoteData, error } = await supabase
      .from('search_history')
      .select('destination_name, best_duration_min')
      .eq('user_id', userId);

    if (error) return { totalSearches: 0, distinctDestinations: 0, timeSavedMins: 0 };
    data = remoteData || [];
  }

  const totalSearches = data.length;
  const distinctDestinations = new Set(data.map(h => h.destination_name)).size;
  // Estimate: if best route ETA > 0, we saved ~5 mins vs worst alternative
  const timeSavedMins = data.reduce((acc, curr) => acc + (curr.best_duration_min > 0 ? 5 : 0), 0);

  return { totalSearches, distinctDestinations, timeSavedMins };
};

/**
 * Save a route search to the user's history
 */
export const saveSearch = async (userId, searchData) => {
  if (userId === 'guest-user') {
    try {
      const existingJson = await AsyncStorage.getItem('@guest_history');
      const history = existingJson ? JSON.parse(existingJson) : [];
      const newSearch = {
        id: Math.random().toString(),
        user_id: userId,
        origin_name: searchData.originName || 'My Location',
        destination_name: searchData.destinationName,
        origin_lat: searchData.originLat,
        origin_lon: searchData.originLon,
        dest_lat: searchData.destLat,
        dest_lon: searchData.destLon,
        route_count: searchData.routeCount || 0,
        best_duration_min: searchData.bestDurationMin || 0,
        searched_at: new Date().toISOString()
      };
      history.unshift(newSearch);
      await AsyncStorage.setItem('@guest_history', JSON.stringify(history));
      return newSearch;
    } catch (e) {
      return null;
    }
  }

  const { data, error } = await supabase
    .from('search_history')
    .insert({
      user_id: userId,
      origin_name: searchData.originName || 'My Location',
      destination_name: searchData.destinationName,
      origin_lat: searchData.originLat,
      origin_lon: searchData.originLon,
      dest_lat: searchData.destLat,
      dest_lon: searchData.destLon,
      route_count: searchData.routeCount || 0,
      best_duration_min: searchData.bestDurationMin || 0,
    });
  if (error) {
    console.warn('Failed to save search:', error.message);
    return null;
  }
  return data;
};

/**
 * Get the user's search history (most recent first)
 */
export const getSearchHistory = async (userId, limit = 10) => {
  if (userId === 'guest-user') {
    try {
      const existingJson = await AsyncStorage.getItem('@guest_history');
      const history = existingJson ? JSON.parse(existingJson) : [];
      return history.slice(0, limit);
    } catch (e) {
      return [];
    }
  }

  const { data, error } = await supabase
    .from('search_history')
    .select('*')
    .eq('user_id', userId)
    .order('searched_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('Failed to fetch search history:', error.message);
    return [];
  }
  return data || [];
};

/**
 * Delete a search from history
 */
export const deleteSearch = async (searchId) => {
  // Guest handling:
  try {
    const existingJson = await AsyncStorage.getItem('@guest_history');
    if (existingJson) {
      const history = JSON.parse(existingJson);
      const updated = history.filter(h => h.id !== searchId);
      await AsyncStorage.setItem('@guest_history', JSON.stringify(updated));
    }
  } catch (e) {}

  const { error } = await supabase
    .from('search_history')
    .delete()
    .eq('id', searchId);
  if (error) {
    console.warn('Failed to delete search:', error.message);
  }
};

/**
 * Get user profile
 */
export const getProfile = async (userId) => {
  if (userId === 'guest-user') {
    try {
      const json = await AsyncStorage.getItem('@guest_profile');
      if (json) return JSON.parse(json);
      return {
        id: 'guest-user',
        display_name: 'Guest Explorer',
        bio: 'Offline Mode',
        avatar_url: null
      };
    } catch (e) {
      return null;
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle(); // maybeSingle() returns null instead of throwing when no row found
  if (error) {
    console.warn('getProfile error:', error.message, error.code);
    return null;
  }
  return data;
};

/**
 * Update user profile display name
 */
export const updateProfile = async (userId, updates) => {
  if (userId === 'guest-user') {
    try {
      const json = await AsyncStorage.getItem('@guest_profile');
      const current = json ? JSON.parse(json) : {
        id: 'guest-user',
        display_name: 'Guest Explorer',
        bio: 'Offline Mode',
        avatar_url: null
      };
      const updated = { ...current, ...updates };
      await AsyncStorage.setItem('@guest_profile', JSON.stringify(updated));
      return updated;
    } catch (e) {
      return null;
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) {
    console.warn('Failed to update profile:', error.message);
    return null;
  }
  return data;
};
