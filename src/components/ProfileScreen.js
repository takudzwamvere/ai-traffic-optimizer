import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Image } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { getProfile, getSearchHistory, getUserStats } from '../services/dataService';
import EditProfileScreen from './EditProfileScreen';

export default function ProfileScreen({ visible, onClose }) {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ totalSearches: 0, distinctDestinations: 0, timeSavedMins: 0 });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [profData, histData, statsData] = await Promise.all([
        getProfile(user.id),
        getSearchHistory(user.id, 10),
        getUserStats(user.id),
      ]);
      setProfile(profData);
      setHistory(histData || []);
      setStats(statsData);
    } catch (err) {
      console.warn('Error loading profile data', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (visible && user?.id) {
      loadData();
    }
  }, [visible, user?.id]);

  if (!user) return null;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          onClose();
          signOut();
        }
      }
    ]);
  };

  // Stats come directly from the Supabase getUserStats() call
  const { totalSearches, distinctDestinations, timeSavedMins } = stats;

  const initials = profile?.display_name 
    ? profile.display_name.substring(0, 2).toUpperCase() 
    : user.email?.substring(0, 2).toUpperCase() || '??';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Feather name="chevron-down" size={28} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* PROFILE INFO */}
            <View style={styles.profileCard}>
              {/* Avatar: show real image or initials fallback */}
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              <Text style={styles.name}>{profile?.display_name || 'Traffic Explorer'}</Text>
              <Text style={styles.email}>{user.email}</Text>
              {profile?.bio ? (
                <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
              ) : null}
              <Text style={styles.joined}>Member since {new Date(user.created_at).toLocaleDateString()}</Text>
            </View>

            {/* ACTIVITY STATS */}
            <Text style={styles.sectionTitle}>Activity</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Feather name="navigation" size={20} color={COLORS.primary} />
                <Text style={styles.statValue}>{totalSearches}</Text>
                <Text style={styles.statLabel}>Searches</Text>
              </View>
              <View style={styles.statBox}>
                <Feather name="map-pin" size={20} color={COLORS.warning} />
                <Text style={styles.statValue}>{distinctDestinations}</Text>
                <Text style={styles.statLabel}>Destinations</Text>
              </View>
              <View style={styles.statBox}>
                <Feather name="clock" size={20} color={COLORS.primary} />
                <Text style={styles.statValue}>{timeSavedMins}m</Text>
                <Text style={styles.statLabel}>Time Saved</Text>
              </View>
            </View>

            {/* RECENT SEARCHES */}
            <Text style={styles.sectionTitle}>Recent Routes</Text>
            <View style={styles.historyCard}>
              {history.length === 0 ? (
                <Text style={styles.emptyText}>No routes saved yet.</Text>
              ) : (
                history.slice(0, 4).map((item, index) => (
                  <View key={item.id} style={[styles.historyItem, index === history.length-1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.historyIcon}>
                      <MaterialIcons name="directions-car" size={18} color={COLORS.primary} />
                    </View>
                    <View style={styles.historyDetails}>
                      <Text style={styles.historyDest} numberOfLines={1}>{item.destination_name}</Text>
                      <Text style={styles.historyOrigin} numberOfLines={1}>From: {item.origin_name}</Text>
                    </View>
                    <Text style={styles.historyTime}>{new Date(item.searched_at).toLocaleDateString()}</Text>
                  </View>
                ))
              )}
            </View>

            {/* LOGOUT */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.8}>
              <Feather name="log-out" size={18} color={COLORS.danger} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            <View style={{height: 40}} />
          </ScrollView>
        )}
      </View>

      {/* EDIT PROFILE MODAL */}
      <EditProfileScreen 
        visible={isEditing} 
        onClose={() => {
          setIsEditing(false);
          loadData(); // Refresh on close
        }} 
        profile={profile} 
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E8ECF0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeBtn: {
    padding: 8,
    marginLeft: -8,
  },
  editBtn: {
    padding: 8,
    marginRight: -8,
  },
  editBtnText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7B9A',
    marginBottom: 12,
  },
  joined: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
    marginTop: 4,
  },
  bio: {
    fontSize: 13,
    color: '#6B7B9A',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 16,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7B9A',
    fontWeight: '500',
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    paddingVertical: 20,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyDest: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  historyOrigin: {
    fontSize: 13,
    color: '#888',
  },
  historyTime: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '500',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 20,
    gap: 8,
  },
  logoutText: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '700',
  },
});
