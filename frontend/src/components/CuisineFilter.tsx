import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';

interface CuisineFilterProps {
  cuisines: string[];
  selected: string | null;
  onSelect: (cuisine: string | null) => void;
}

const cuisineIcons: Record<string, string> = {
  Italian: 'pizza-outline',
  Japanese: 'fish-outline',
  American: 'fast-food-outline',
  Indian: 'flame-outline',
  French: 'wine-outline',
  Mexican: 'leaf-outline',
  Chinese: 'restaurant-outline',
  Mediterranean: 'sunny-outline',
};

export const CuisineFilter: React.FC<CuisineFilterProps> = ({
  cuisines,
  selected,
  onSelect,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[styles.chip, !selected && styles.chipActive]}
        onPress={() => onSelect(null)}
      >
        <Ionicons
          name="apps-outline"
          size={18}
          color={!selected ? COLORS.white : COLORS.textSecondary}
        />
        <Text style={[styles.chipText, !selected && styles.chipTextActive]}>
          All
        </Text>
      </TouchableOpacity>
      {cuisines.map((cuisine) => (
        <TouchableOpacity
          key={cuisine}
          style={[styles.chip, selected === cuisine && styles.chipActive]}
          onPress={() => onSelect(selected === cuisine ? null : cuisine)}
        >
          <Ionicons
            name={(cuisineIcons[cuisine] as any) || 'restaurant-outline'}
            size={18}
            color={selected === cuisine ? COLORS.white : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.chipText,
              selected === cuisine && styles.chipTextActive,
            ]}
          >
            {cuisine}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  container: {
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.md,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.radiusFull,
    marginRight: SIZES.sm,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.medium,
    marginLeft: SIZES.xs,
  },
  chipTextActive: {
    color: COLORS.white,
  },
});
