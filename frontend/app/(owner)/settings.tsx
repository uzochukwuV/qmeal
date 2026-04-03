import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OWNER_COLORS, OWNER_SIZES, OWNER_FONTS } from '../../src/constants/ownerTheme';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

export default function OwnerSettings() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisine_type: '',
    address: '',
    delivery_time_min: '',
    delivery_time_max: '',
    delivery_fee: '',
    is_open: true,
  });

  const fetchRestaurant = useCallback(async () => {
    try {
      const res = await apiClient.get('/owner/restaurant');
      setRestaurant(res.data);
      setFormData({
        name: res.data.name || '',
        description: res.data.description || '',
        cuisine_type: res.data.cuisine_type || '',
        address: res.data.address || '',
        delivery_time_min: res.data.delivery_time_min?.toString() || '',
        delivery_time_max: res.data.delivery_time_max?.toString() || '',
        delivery_fee: res.data.delivery_fee?.toString() || '',
        is_open: res.data.is_open ?? true,
      });
    } catch (err) {
      console.error('Error fetching restaurant:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRestaurant(); }, [fetchRestaurant]);

  const saveChanges = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description,
        cuisine_type: formData.cuisine_type,
        address: formData.address,
        is_open: formData.is_open,
      };
      if (formData.delivery_time_min) payload.delivery_time_min = parseInt(formData.delivery_time_min);
      if (formData.delivery_time_max) payload.delivery_time_max = parseInt(formData.delivery_time_max);
      if (formData.delivery_fee) payload.delivery_fee = parseFloat(formData.delivery_fee);

      await apiClient.patch('/owner/restaurant', payload);
      Alert.alert('Success', 'Restaurant details updated');
    } catch (err) {
      Alert.alert('Error', 'Failed to update restaurant details');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) { /* ignore */ }
    await logout();
    router.replace('/(auth)/login');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={OWNER_COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>

          {/* Restaurant Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardIcon}>
              <Ionicons name="storefront" size={28} color={OWNER_COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoCardTitle}>{restaurant?.name}</Text>
              <Text style={styles.infoCardSubtitle}>{restaurant?.cuisine_type} Cuisine</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={14} color="#F59E0B" />
                <Text style={styles.ratingText}>{restaurant?.rating?.toFixed(1)} ({restaurant?.review_count} reviews)</Text>
              </View>
            </View>
          </View>

          {/* Open/Closed Toggle */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <View style={[styles.statusIndicator, { backgroundColor: formData.is_open ? OWNER_COLORS.success : OWNER_COLORS.danger }]} />
                <View>
                  <Text style={styles.toggleLabel}>Restaurant Status</Text>
                  <Text style={styles.toggleSublabel}>{formData.is_open ? 'Accepting orders' : 'Not accepting orders'}</Text>
                </View>
              </View>
              <Switch
                value={formData.is_open}
                onValueChange={(val) => setFormData({ ...formData, is_open: val })}
                trackColor={{ false: OWNER_COLORS.border, true: OWNER_COLORS.success + '60' }}
                thumbColor={formData.is_open ? OWNER_COLORS.success : OWNER_COLORS.textTertiary}
              />
            </View>
          </View>

          {/* Edit Restaurant Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Restaurant Details</Text>

            <Text style={styles.inputLabel}>Restaurant Name</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Restaurant name"
              placeholderTextColor={OWNER_COLORS.textTertiary}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Describe your restaurant..."
              placeholderTextColor={OWNER_COLORS.textTertiary}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Cuisine Type</Text>
            <TextInput
              style={styles.input}
              value={formData.cuisine_type}
              onChangeText={(text) => setFormData({ ...formData, cuisine_type: text })}
              placeholder="e.g. Italian"
              placeholderTextColor={OWNER_COLORS.textTertiary}
            />

            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={styles.input}
              value={formData.address}
              onChangeText={(text) => setFormData({ ...formData, address: text })}
              placeholder="Restaurant address"
              placeholderTextColor={OWNER_COLORS.textTertiary}
            />
          </View>

          {/* Delivery Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Settings</Text>

            <View style={styles.formRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Min Time (min)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.delivery_time_min}
                  onChangeText={(text) => setFormData({ ...formData, delivery_time_min: text })}
                  placeholder="20"
                  placeholderTextColor={OWNER_COLORS.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.inputLabel}>Max Time (min)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.delivery_time_max}
                  onChangeText={(text) => setFormData({ ...formData, delivery_time_max: text })}
                  placeholder="45"
                  placeholderTextColor={OWNER_COLORS.textTertiary}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Delivery Fee ($)</Text>
            <TextInput
              style={styles.input}
              value={formData.delivery_fee}
              onChangeText={(text) => setFormData({ ...formData, delivery_fee: text })}
              placeholder="2.99"
              placeholderTextColor={OWNER_COLORS.textTertiary}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Save Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={saveChanges}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={OWNER_COLORS.white} />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <View style={styles.section}>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={OWNER_COLORS.danger} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
            <Text style={styles.versionText}>Qmeal Business v1.0</Text>
          </View>

          <View style={{ height: 48 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: OWNER_COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: OWNER_SIZES.lg,
    paddingTop: OWNER_SIZES.md,
    paddingBottom: OWNER_SIZES.md,
  },
  headerTitle: { fontSize: 24, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: OWNER_COLORS.surface,
    marginHorizontal: OWNER_SIZES.md,
    borderRadius: OWNER_SIZES.radiusLg,
    padding: OWNER_SIZES.md,
    alignItems: 'center',
    gap: OWNER_SIZES.md,
    borderWidth: 1,
    borderColor: OWNER_COLORS.border,
  },
  infoCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: OWNER_COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardTitle: { fontSize: 18, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold },
  infoCardSubtitle: { fontSize: 13, color: OWNER_COLORS.textSecondary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 13, color: OWNER_COLORS.textSecondary },
  section: {
    paddingHorizontal: OWNER_SIZES.md,
    marginTop: OWNER_SIZES.lg,
  },
  sectionTitle: {
    fontSize: 18,
    color: OWNER_COLORS.textPrimary,
    ...OWNER_FONTS.bold,
    marginBottom: OWNER_SIZES.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: OWNER_COLORS.surface,
    padding: OWNER_SIZES.md,
    borderRadius: OWNER_SIZES.radiusMd,
    borderWidth: 1,
    borderColor: OWNER_COLORS.border,
  },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: OWNER_SIZES.md },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  toggleLabel: { fontSize: 15, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.semiBold },
  toggleSublabel: { fontSize: 12, color: OWNER_COLORS.textTertiary, marginTop: 2 },
  inputLabel: {
    fontSize: 13,
    color: OWNER_COLORS.textSecondary,
    ...OWNER_FONTS.semiBold,
    marginBottom: 6,
    marginTop: OWNER_SIZES.md,
  },
  input: {
    backgroundColor: OWNER_COLORS.surface,
    borderWidth: 1,
    borderColor: OWNER_COLORS.border,
    borderRadius: OWNER_SIZES.radiusMd,
    padding: OWNER_SIZES.md,
    color: OWNER_COLORS.textPrimary,
    fontSize: 15,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row' },
  saveBtn: {
    backgroundColor: OWNER_COLORS.accent,
    padding: OWNER_SIZES.md,
    borderRadius: OWNER_SIZES.radiusMd,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: OWNER_COLORS.white, fontSize: 16, ...OWNER_FONTS.bold },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: OWNER_SIZES.md,
    backgroundColor: OWNER_COLORS.dangerLight,
    borderRadius: OWNER_SIZES.radiusMd,
  },
  logoutText: { fontSize: 16, color: OWNER_COLORS.danger, ...OWNER_FONTS.semiBold },
  versionText: {
    textAlign: 'center',
    color: OWNER_COLORS.textTertiary,
    fontSize: 12,
    marginTop: OWNER_SIZES.md,
  },
});
