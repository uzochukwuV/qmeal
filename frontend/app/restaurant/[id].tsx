import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SectionList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { MenuItemCard } from '../../src/components/MenuItem';
import { StarRating } from '../../src/components/StarRating';
import { CartBadge } from '../../src/components/CartBadge';
import { useCartStore } from '../../src/store/cartStore';
import apiClient from '../../src/api/client';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../src/constants/theme';

interface Restaurant {
  restaurant_id: string;
  name: string;
  description: string;
  cuisine_type: string;
  rating: number;
  review_count: number;
  price_level: number;
  image_url?: string;
  address: string;
  latitude: number;
  longitude: number;
  delivery_time_min: number;
  delivery_time_max: number;
  delivery_fee: number;
  is_open: boolean;
}

interface MenuItem {
  item_id: string;
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
  is_popular: boolean;
}

interface Review {
  review_id: string;
  user_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews' | 'info'>('menu');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  
  const { items, addItem, updateQuantity } = useCartStore();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [restaurantRes, menuRes, reviewsRes] = await Promise.all([
        apiClient.get(`/restaurants/${id}`),
        apiClient.get(`/restaurants/${id}/menu`),
        apiClient.get(`/restaurants/${id}/reviews`),
      ]);
      
      setRestaurant(restaurantRes.data);
      setMenuItems(menuRes.data);
      setReviews(reviewsRes.data);
      
      // Check if favorited
      try {
        const favRes = await apiClient.get(`/favorites/check/${id}`);
        setIsFavorite(favRes.data.is_favorite);
      } catch (e) {
        // User might not be authenticated
      }
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const toggleFavorite = async () => {
    if (!restaurant) return;
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await apiClient.delete(`/favorites/${restaurant.restaurant_id}`);
      } else {
        await apiClient.post(`/favorites/${restaurant.restaurant_id}`);
      }
      setIsFavorite(!isFavorite);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const getItemQuantity = (itemId: string) => {
    const cartItem = items.find((i) => i.item_id === itemId);
    return cartItem?.quantity || 0;
  };

  const handleAddItem = (item: MenuItem) => {
    if (!restaurant) return;
    addItem({
      item_id: item.item_id,
      name: item.name,
      price: item.price,
      quantity: 1,
      restaurant_id: restaurant.restaurant_id,
      restaurant_name: restaurant.name,
    });
  };

  const handleRemoveItem = (itemId: string) => {
    const quantity = getItemQuantity(itemId);
    updateQuantity(itemId, quantity - 1);
  };

  // Group menu items by category
  const menuSections = menuItems.reduce((acc, item) => {
    const existingSection = acc.find((s) => s.title === item.category);
    if (existingSection) {
      existingSection.data.push(item);
    } else {
      acc.push({ title: item.category, data: [item] });
    }
    return acc;
  }, [] as { title: string; data: MenuItem[] }[]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Restaurant not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={{
            uri: restaurant.image_url || 'https://images.unsplash.com/photo-1615719413546-198b25453f85',
          }}
          style={styles.heroImage}
        />
        <View style={styles.heroOverlay} />
        <SafeAreaView style={styles.heroContent}>
          <View style={styles.heroHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.heroActions}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={toggleFavorite}
                disabled={favoriteLoading}
              >
                {favoriteLoading ? (
                  <ActivityIndicator size="small" color={COLORS.accent} />
                ) : (
                  <Ionicons 
                    name={isFavorite ? "heart" : "heart-outline"} 
                    size={24} 
                    color={isFavorite ? COLORS.accent : COLORS.textPrimary} 
                  />
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="share-outline" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>

      {/* Restaurant Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <Text style={styles.cuisineType}>{restaurant.cuisine_type}</Text>
        
        <View style={styles.ratingRow}>
          <StarRating rating={restaurant.rating} size={18} />
          <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({restaurant.review_count} reviews)</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>
              {restaurant.delivery_time_min}-{restaurant.delivery_time_max} min
            </Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Ionicons name="bicycle-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>
              ${restaurant.delivery_fee.toFixed(2)}
            </Text>
          </View>
          <View style={styles.metaDot} />
          <View style={styles.metaItem}>
            <Text style={styles.metaText}>
              {'$'.repeat(restaurant.price_level)}
            </Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['menu', 'reviews', 'info'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {activeTab === 'menu' && (
        <SectionList
          sections={menuSections}
          keyExtractor={(item) => item.item_id}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <MenuItemCard
              item={item}
              quantity={getItemQuantity(item.item_id)}
              onAdd={() => handleAddItem(item)}
              onRemove={() => handleRemoveItem(item.item_id)}
            />
          )}
          contentContainerStyle={styles.menuList}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      {activeTab === 'reviews' && (
        <ScrollView style={styles.reviewsContainer} showsVerticalScrollIndicator={false}>
          {reviews.length === 0 ? (
            <View style={styles.emptyReviews}>
              <Ionicons name="chatbubble-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>No reviews yet</Text>
            </View>
          ) : (
            reviews.map((review) => (
              <View key={review.review_id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerInfo}>
                    <View style={styles.reviewerAvatar}>
                      <Text style={styles.reviewerInitial}>
                        {review.user_name.charAt(0)}
                      </Text>
                    </View>
                    <Text style={styles.reviewerName}>{review.user_name}</Text>
                  </View>
                  <StarRating rating={review.rating} size={14} />
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === 'info' && (
        <ScrollView style={styles.infoContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>About</Text>
            <Text style={styles.infoDescription}>{restaurant.description}</Text>
          </View>
          
          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>Location</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.accent} />
              <Text style={styles.addressText}>{restaurant.address}</Text>
            </View>
            {/* Google Maps */}
            {Platform.OS !== 'web' ? (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  provider={PROVIDER_GOOGLE}
                  initialRegion={{
                    latitude: restaurant.latitude,
                    longitude: restaurant.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  <Marker
                    coordinate={{
                      latitude: restaurant.latitude,
                      longitude: restaurant.longitude,
                    }}
                    title={restaurant.name}
                    description={restaurant.address}
                  />
                </MapView>
                <View style={styles.mapOverlay}>
                  <Text style={styles.mapNote}>Google Maps API key required for full functionality</Text>
                </View>
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Ionicons name="map-outline" size={48} color={COLORS.textTertiary} />
                <Text style={styles.mapPlaceholderText}>Map View</Text>
                <Text style={styles.mapNote}>Available on mobile devices</Text>
              </View>
            )}
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoSectionTitle}>Hours</Text>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursDay}>Mon - Sun</Text>
              <Text style={styles.hoursTime}>10:00 AM - 10:00 PM</Text>
            </View>
          </View>
        </ScrollView>
      )}

      <CartBadge />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContainer: {
    height: 250,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  heroContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  heroActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SIZES.sm,
    ...SHADOWS.medium,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    marginTop: -24,
    marginHorizontal: SIZES.md,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    ...SHADOWS.medium,
  },
  restaurantName: {
    fontSize: 24,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  cuisineType: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
  },
  ratingText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
    marginLeft: SIZES.sm,
  },
  reviewCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.textTertiary,
    marginHorizontal: SIZES.sm,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SIZES.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SIZES.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  tabTextActive: {
    color: COLORS.accent,
    ...FONTS.semiBold,
  },
  sectionHeader: {
    backgroundColor: COLORS.background,
    padding: SIZES.md,
  },
  sectionTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  menuList: {
    paddingBottom: 100,
  },
  reviewsContainer: {
    flex: 1,
    padding: SIZES.md,
  },
  emptyReviews: {
    alignItems: 'center',
    paddingTop: SIZES.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
  },
  reviewCard: {
    backgroundColor: COLORS.card,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.sm,
  },
  reviewerInitial: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.bold,
  },
  reviewerName: {
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  reviewComment: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  infoContainer: {
    flex: 1,
    padding: SIZES.md,
  },
  infoSection: {
    backgroundColor: COLORS.card,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.md,
    ...SHADOWS.small,
  },
  infoSectionTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.bold,
    marginBottom: SIZES.sm,
  },
  infoDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: SIZES.sm,
    flex: 1,
  },
  mapContainer: {
    height: 180,
    borderRadius: SIZES.radiusMd,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: SIZES.sm,
  },
  mapPlaceholder: {
    height: 150,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
    ...FONTS.medium,
  },
  mapNote: {
    fontSize: 12,
    color: COLORS.white,
    textAlign: 'center',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SIZES.xs,
  },
  hoursDay: {
    fontSize: 14,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  hoursTime: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
