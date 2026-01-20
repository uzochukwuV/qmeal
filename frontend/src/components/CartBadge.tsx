import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCartStore } from '../store/cartStore';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';

export const CartBadge: React.FC = () => {
  const router = useRouter();
  const { items, getTotal, getItemCount } = useCartStore();
  const itemCount = getItemCount();
  const total = getTotal();

  if (items.length === 0) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/cart')}
      activeOpacity={0.9}
    >
      <View style={styles.left}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount}</Text>
        </View>
        <Text style={styles.text}>View Cart</Text>
      </View>
      <Text style={styles.total}>${total.toFixed(2)}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: SIZES.lg,
    left: SIZES.md,
    right: SIZES.md,
    backgroundColor: COLORS.accent,
    borderRadius: SIZES.radiusMd,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    ...SHADOWS.large,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: COLORS.white,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.sm,
  },
  badgeText: {
    color: COLORS.accent,
    fontSize: 14,
    ...FONTS.bold,
  },
  text: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.semiBold,
  },
  total: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.bold,
  },
});
