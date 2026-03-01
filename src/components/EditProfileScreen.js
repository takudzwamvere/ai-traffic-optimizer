import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Modal, KeyboardAvoidingView,
  Platform, ScrollView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { updateProfile, uploadAvatar } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

export default function EditProfileScreen({ visible, onClose, profile }) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [localAvatarUri, setLocalAvatarUri] = useState(null); // local file picked
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(null); // saved URL
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      setCurrentAvatarUrl(profile.avatar_url || null);
      setLocalAvatarUri(null);
    }
  }, [visible, profile]);

  const handlePickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],   // Force square crop
      quality: 0.7,     // Compress to 70% to keep upload small
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    
    try {
      let avatarUrl = currentAvatarUrl;

      // If user picked a new image, upload it first
      if (localAvatarUri) {
        avatarUrl = await uploadAvatar(user.id, localAvatarUri);
      }

      await updateProfile(user.id, {
        display_name: displayName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      });

      onClose();
    } catch (err) {
      console.warn('Profile save error:', err);
      Alert.alert('Error', 'Could not save profile. Please check your connection and try again.');
    }
    
    setLoading(false);
  };

  // The avatar to display: prioritise newly picked local image, then saved URL, then initials
  const displayInitials = profile?.display_name
    ? profile.display_name.substring(0, 2).toUpperCase()
    : user?.email?.substring(0, 2).toUpperCase() || '??';

  const avatarSource = localAvatarUri
    ? { uri: localAvatarUri }
    : currentAvatarUrl
    ? { uri: currentAvatarUrl }
    : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Text style={styles.saveText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          {/* AVATAR SECTION */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>{displayInitials}</Text>
                </View>
              )}
              {/* Camera badge overlay */}
              <View style={styles.cameraBadge}>
                <Feather name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickImage}>
              <Text style={styles.changePhotoText}>Change Profile Photo</Text>
            </TouchableOpacity>
            <Text style={styles.photoHint}>Square images work best</Text>
          </View>

          {/* DISPLAY NAME */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Display Name</Text>
            <View style={styles.inputContainer}>
              <Feather name="user" size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="How should we call you?"
                placeholderTextColor="#999"
                value={displayName}
                onChangeText={setDisplayName}
              />
            </View>
          </View>

          {/* BIO */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Bio (Optional)</Text>
            <View style={[styles.inputContainer, styles.bioContainer]}>
              <TextInput
                style={[styles.input, styles.bioInput]}
                placeholder="A little bit about your commute..."
                placeholderTextColor="#999"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
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
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  cancelBtn: { padding: 8, marginLeft: -8 },
  cancelText: { fontSize: 16, color: '#6B7B9A' },
  saveBtn: { padding: 8, marginRight: -8, minWidth: 50, alignItems: 'center' },
  saveText: { fontSize: 16, color: COLORS.primary, fontWeight: '700' },
  
  content: { padding: 20 },
  
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarInitials: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changePhotoBtn: {
    backgroundColor: '#E6F0FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 14,
  },
  changePhotoText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  photoHint: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 6,
  },
  
  formGroup: { marginBottom: 24 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    minHeight: 52,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 14,
  },
  bioContainer: {
    minHeight: 100,
    alignItems: 'flex-start',
  },
  bioInput: {
    paddingTop: 14,
  },
});
