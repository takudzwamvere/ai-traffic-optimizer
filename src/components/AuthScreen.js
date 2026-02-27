import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        Alert.alert('Account Created', 'You can now sign in with your credentials.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER (Back arrow & Title) */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>{isLogin ? 'Login' : 'Sign Up'}</Text>
        </View>

        {/* FORM */}
        <View style={styles.formContainer}>
          {/* ERROR DISPLAY */}
          {error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color="#D32F2F" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* EMAIL INPUT */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* PASSWORD INPUT */}
          <View style={[styles.inputContainer, styles.passwordContainer]}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* CONFIRM PASSWORD (Signup only) */}
          {!isLogin && (
            <View style={[styles.inputContainer, styles.passwordContainer]}>
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
          )}

          {isLogin && (
            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
            )}
          </TouchableOpacity>

          {/* TOGGLE MODE */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => {
              setIsLogin(!isLogin);
              setError('');
              setConfirmPassword('');
            }}
          >
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.toggleLink}>{isLogin ? 'Sign up' : 'Login'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A36A8', // Deep blue from mockup
    letterSpacing: 0.5,
  },
  formContainer: {
    width: '100%',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 13,
    flex: 1,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#3949AB', // Blue border
    borderRadius: 4,
    marginBottom: 16,
    paddingHorizontal: 14,
    height: 52,
  },
  passwordContainer: {
    backgroundColor: '#F5F7FA', // Slight gray as per mockup
    borderColor: 'transparent',
    borderWidth: 0,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    color: '#1A36A8',
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#3953C8', // Mockup blue button
    borderRadius: 4,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#3953C8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: {
    backgroundColor: '#B0C4DE',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  toggleLink: {
    color: '#1A36A8',
    fontWeight: '700',
  },
});
