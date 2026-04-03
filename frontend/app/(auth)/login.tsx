import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import apiClient, { setAuthToken } from '../../src/api/client';

export default function LoginScreen() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [isEmailMode, setIsEmailMode] = useState(true);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (isEmailMode && !email) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }
    if (!isEmailMode && !phone) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/login', {
        email: isEmailMode ? email.toLowerCase() : undefined,
        phone: !isEmailMode ? phone : undefined,
        password,
      });

      const userData = response.data;
      setAuthToken(userData.token);
      await setToken(userData.token);
      setUser({
        user_id: userData.user_id,
        email: userData.email,
        phone: userData.phone,
        name: userData.name,
        picture: userData.picture,
        role: userData.role || 'customer',
        restaurant_id: userData.restaurant_id,
      });
      
      // Route based on role
      if (userData.role === 'owner') {
        router.replace('/(owner)');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.detail || 'Login failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="restaurant" size={48} color={COLORS.accent} />
            </View>
            <Text style={styles.appName}>Qmeal</Text>
            <Text style={styles.tagline}>Welcome back!</Text>
          </View>

          {/* Login Type Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, isEmailMode && styles.toggleBtnActive]}
              onPress={() => setIsEmailMode(true)}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={isEmailMode ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.toggleText, isEmailMode && styles.toggleTextActive]}>
                Email
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isEmailMode && styles.toggleBtnActive]}
              onPress={() => setIsEmailMode(false)}
            >
              <Ionicons
                name="call-outline"
                size={18}
                color={!isEmailMode ? COLORS.white : COLORS.textSecondary}
              />
              <Text style={[styles.toggleText, !isEmailMode && styles.toggleTextActive]}>
                Phone
              </Text>
            </TouchableOpacity>
          </View>

          {/* Input Fields */}
          <View style={styles.inputContainer}>
            {isEmailMode ? (
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={COLORS.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            ) : (
              <View style={styles.inputWrapper}>
                <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor={COLORS.textTertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          {/* Owner Login Link */}
          <TouchableOpacity 
            style={styles.ownerLinkContainer}
            onPress={() => router.push('/(auth)/owner-register')}
          >
            <Ionicons name="storefront-outline" size={18} color={COLORS.accent} />
            <Text style={styles.ownerLinkText}>Are you a restaurant owner?</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.xl,
    paddingBottom: SIZES.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  appName: {
    fontSize: 36,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: SIZES.xs,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.radiusMd,
    padding: 4,
    marginBottom: SIZES.lg,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSm,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.accent,
  },
  toggleText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.medium,
    marginLeft: SIZES.xs,
  },
  toggleTextActive: {
    color: COLORS.white,
  },
  inputContainer: {
    marginBottom: SIZES.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    height: 56,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
    ...FONTS.regular,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: SIZES.lg,
  },
  forgotText: {
    fontSize: 14,
    color: COLORS.accent,
    ...FONTS.medium,
  },
  loginBtn: {
    backgroundColor: COLORS.accent,
    height: 56,
    borderRadius: SIZES.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.lg,
    ...SHADOWS.medium,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: COLORS.white,
    fontSize: 18,
    ...FONTS.semiBold,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    color: COLORS.accent,
    ...FONTS.semiBold,
  },
  ownerLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.xl,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.accentLight,
    borderRadius: SIZES.radiusMd,
    gap: 8,
  },
  ownerLinkText: {
    fontSize: 14,
    color: COLORS.accent,
    ...FONTS.semiBold,
  },
});
