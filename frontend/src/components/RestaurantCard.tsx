import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, SHADOWS, FONTS } from '../constants/theme';

interface Restaurant {
  restaurant_id: string;
  name: string;
  description: string;
  cuisine_type: string;
  rating: number;
  review_count: number;
  price_level: number;
  image_url?: string;
  delivery_time_min: number;
  delivery_time_max: number;
  delivery_fee: number;
  is_open: boolean;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: () => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  onPress,
}) => {
  const priceLevel = '$'.repeat(restaurant.price_level);

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={14} color={COLORS.star} />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={14} color={COLORS.star} />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={14} color={COLORS.star} />
        );
      }
    }
    return stars;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{
          uri:
            restaurant.image_url ||
            'https://images.unsplash.com/photo-1615719413546-198b25453f85',
        }}
        style={styles.image}
      />
      {!restaurant.is_open && (
        <View style={styles.closedOverlay}>
          <Text style={styles.closedText}>Currently Closed</Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <View style={styles.priceTag}>
            <Text style={styles.priceText}>{priceLevel}</Text>
          </View>
        </View>
        <Text style={styles.cuisine}>{restaurant.cuisine_type}</Text>
        <View style={styles.ratingRow}>
          <View style={styles.stars}>{renderStars(restaurant.rating)}</View>
          <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({restaurant.review_count})</Text>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              {restaurant.delivery_time_min}-{restaurant.delivery_time_max} min
            </Text>
          </View>
          <View style={styles.dot} />
          <View style={styles.infoItem}>
            <Ionicons name="bicycle-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>
              ${restaurant.delivery_fee.toFixed(2)} delivery
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.md,
    ...SHADOWS.medium,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.backgroundSecondary,
  },
  closedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closedText: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.semiBold,
  },
  content: {
    padding: SIZES.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  name: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
    flex: 1,
    marginRight: SIZES.sm,
  },
  priceTag: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  priceText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    ...FONTS.medium,
  },
  cuisine: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  stars: {
    flexDirection: 'row',
    marginRight: SIZES.xs,
  },
  ratingText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
    marginRight: SIZES.xs,
  },
  reviewCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textTertiary,
    marginHorizontal: SIZES.sm,
  },
});
