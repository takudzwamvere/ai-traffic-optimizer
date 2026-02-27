import { supabase } from './supabase';

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
    .single();
  if (error) {
    console.warn('Failed to fetch profile:', error.message);
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
