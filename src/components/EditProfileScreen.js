import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { updateProfile } from '../services/dataService';
import { useAuth } from '../context/AuthContext';

export default function EditProfileScreen({ visible, onClose, profile }) {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
    }
  }, [visible, profile]);

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    
    try {
      await updateProfile(user.id, {
        display_name: displayName.trim(),
        bio: bio.trim(),
        updated_at: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      Alert.alert("Error", "Could not update profile.");
    }
    
    setLoading(false);
  };

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
            {loading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          
          <View style={styles.avatarSection}>
            <View style={styles.avatarPlaceholder}>
              <Feather name="camera" size={28} color="#999" />
            </View>
            <TouchableOpacity style={styles.changePhotoBtn}>
              <Text style={styles.changePhotoText}>Change Profile Photo</Text>
            </TouchableOpacity>
            <Text style={styles.photoHint}>*Supabase Storage upload pending setup</Text>
          </View>

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
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8ECF0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  changePhotoBtn: {
    backgroundColor: '#E6F0FF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  changePhotoText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  photoHint: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 8,
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
  }
});
