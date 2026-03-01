import { supabase } from './supabase';

/**
 * Upload the user's avatar image to Supabase Storage.
 * Image is stored at: avatars/{userId}/avatar.jpg
 * Returns the public URL on success.
 */
export const uploadAvatar = async (userId, localUri) => {
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
  const { data, error } = await supabase
    .from('search_history')
    .select('destination_name, best_duration_min')
    .eq('user_id', userId);

  if (error) return { totalSearches: 0, distinctDestinations: 0, timeSavedMins: 0 };

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
