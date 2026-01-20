import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';

interface MenuItemProps {
  item: {
    item_id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    image_url?: string;
    is_popular?: boolean;
  };
  onAdd: () => void;
  quantity?: number;
  onRemove?: () => void;
}

export const MenuItemCard: React.FC<MenuItemProps> = ({
  item,
  onAdd,
  quantity = 0,
  onRemove,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {item.is_popular && (
          <View style={styles.popularTag}>
            <Ionicons name="flame" size={12} color={COLORS.accent} />
            <Text style={styles.popularText}>Popular</Text>
          </View>
        )}
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
      </View>
      <View style={styles.rightSection}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="restaurant-outline" size={24} color={COLORS.textTertiary} />
          </View>
        )}
        {quantity > 0 ? (
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={onRemove}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="remove" size={18} color={COLORS.accent} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityBtn}
              onPress={onAdd}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add" size={18} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addButton} onPress={onAdd}>
            <Ionicons name="add" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  content: {
    flex: 1,
    marginRight: SIZES.md,
  },
  popularTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  popularText: {
    fontSize: 12,
    color: COLORS.accent,
    ...FONTS.medium,
    marginLeft: 4,
  },
  name: {
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
    marginBottom: SIZES.xs,
  },
  description: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SIZES.sm,
  },
  price: {
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  rightSection: {
    alignItems: 'center',
  },
  image: {
    width: 100,
    height: 80,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.backgroundSecondary,
  },
  imagePlaceholder: {
    width: 100,
    height: 80,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.sm,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
    backgroundColor: COLORS.accentLight,
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
  },
  quantityBtn: {
    padding: 4,
  },
  quantityText: {
    fontSize: 16,
    color: COLORS.accent,
    ...FONTS.semiBold,
    marginHorizontal: SIZES.sm,
    minWidth: 20,
    textAlign: 'center',
  },
});
