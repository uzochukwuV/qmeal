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
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';
import apiClient, { setAuthToken } from '../../src/api/client';

export default function OwnerRegisterScreen() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password || !restaurantName || !cuisineType || !address) {
      Alert.alert('Missing Fields', 'Please fill in all required fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.post('/auth/register-owner', {
        name,
        email: email.toLowerCase(),
        password,
        restaurant_name: restaurantName,
        cuisine_type: cuisineType,
        description: description || `${cuisineType} restaurant`,
        address,
      });

      const userData = response.data;
      setAuthToken(userData.token);
      await setToken(userData.token);
      setUser({
        user_id: userData.user_id,
        email: userData.email,
        name: userData.name,
        role: 'owner',
        restaurant_id: userData.restaurant_id,
      });

      router.replace('/(owner)');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Registration failed. Please try again.';
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
          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerIcon}>
            <Ionicons name="storefront" size={36} color={COLORS.accent} />
          </View>
          <Text style={styles.title}>Register as Owner</Text>
          <Text style={styles.subtitle}>Set up your restaurant on Qmeal</Text>

          {/* Personal Info */}
          <Text style={styles.sectionLabel}>Your Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="owner@restaurant.com"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 6 characters"
                placeholderTextColor={COLORS.textTertiary}
                secureTextEntry={!showPassword}
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

          {/* Restaurant Info */}
          <Text style={[styles.sectionLabel, { marginTop: SIZES.xl }]}>Restaurant Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Restaurant Name *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="restaurant-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={restaurantName}
                onChangeText={setRestaurantName}
                placeholder="e.g. Bella Italia"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Cuisine Type *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="flame-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={cuisineType}
                onChangeText={setCuisineType}
                placeholder="e.g. Italian, Japanese, Indian"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description</Text>
            <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 12 }]}>
              <Ionicons name="document-text-outline" size={20} color={COLORS.textSecondary} style={{ marginTop: 2 }} />
              <TextInput
                style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your restaurant..."
                placeholderTextColor={COLORS.textTertiary}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="location-outline" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Restaurant address"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={[styles.registerBtn, isLoading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.registerBtnText}>Create Restaurant Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: SIZES.lg, paddingTop: SIZES.md },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    marginBottom: SIZES.md,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: 28,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SIZES.lg,
  },
  sectionLabel: {
    fontSize: 16,
    ...FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  inputGroup: { marginBottom: SIZES.md },
  inputLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    ...FONTS.medium,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.radiusMd,
    paddingHorizontal: SIZES.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  registerBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    marginTop: SIZES.lg,
  },
  btnDisabled: { opacity: 0.7 },
  registerBtnText: {
    color: COLORS.white,
    fontSize: 18,
    ...FONTS.semiBold,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.lg,
  },
  loginText: { fontSize: 14, color: COLORS.textSecondary },
  loginLink: { fontSize: 14, color: COLORS.accent, ...FONTS.semiBold },
});
