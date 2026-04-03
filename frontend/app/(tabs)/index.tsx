import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RestaurantCard } from '../../src/components/RestaurantCard';
import { CuisineFilter } from '../../src/components/CuisineFilter';
import { CartBadge } from '../../src/components/CartBadge';
import { useAuthStore } from '../../src/store/authStore';
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
  delivery_time_min: number;
  delivery_time_max: number;
  delivery_fee: number;
  is_open: boolean;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRestaurants = async (cuisine?: string | null) => {
    try {
      const params: any = {};
      if (cuisine) params.cuisine = cuisine;
      
      const response = await apiClient.get('/restaurants', { params });
      setRestaurants(response.data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  const fetchCuisines = async () => {
    try {
      const response = await apiClient.get('/cuisines');
      setCuisines(response.data.cuisines);
    } catch (error) {
      console.error('Error fetching cuisines:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchRestaurants(), fetchCuisines()]);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRestaurants(selectedCuisine);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchRestaurants(selectedCuisine);
  }, [selectedCuisine]);

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Location & Greeting */}
      <View style={styles.topRow}>
        <View style={styles.locationContainer}>
          <Ionicons name="location" size={20} color={COLORS.accent} />
          <Text style={styles.locationText}>Deliver to</Text>
          <Text style={styles.addressText}>Current Location</Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
        </View>
        <TouchableOpacity style={styles.notificationBtn} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Greeting */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greeting}>Hey, {user?.name?.split(' ')[0] || 'there'}!</Text>
        <Text style={styles.subGreeting}>What would you like to eat?</Text>
      </View>

      {/* Hero Banner */}
      <View style={styles.bannerContainer}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1615719413546-198b25453f85' }}
          style={styles.bannerImage}
        />
        <View style={styles.bannerOverlay}>
          <Text style={styles.bannerTitle}>Free Delivery</Text>
          <Text style={styles.bannerSubtitle}>On your first order</Text>
          <TouchableOpacity style={styles.bannerButton}>
            <Text style={styles.bannerButtonText}>Order Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Restaurants</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/search')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.restaurant_id}
        ListHeaderComponent={
          <>
            {renderHeader()}
            <CuisineFilter
              cuisines={cuisines}
              selected={selectedCuisine}
              onSelect={setSelectedCuisine}
            />
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <RestaurantCard
              restaurant={item}
              onPress={() => router.push(`/restaurant/${item.restaurant_id}`)}
            />
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>No restaurants found</Text>
          </View>
        }
      />
      <CartBadge />
    </SafeAreaView>
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
  header: {
    paddingTop: SIZES.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.md,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  addressText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
    marginLeft: 4,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingContainer: {
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.lg,
  },
  greeting: {
    fontSize: 24,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  subGreeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  bannerContainer: {
    marginHorizontal: SIZES.md,
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
    marginBottom: SIZES.lg,
    height: 160,
    ...SHADOWS.medium,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: SIZES.lg,
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 28,
    color: COLORS.white,
    ...FONTS.bold,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: COLORS.white,
    marginTop: 4,
    marginBottom: SIZES.md,
  },
  bannerButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: COLORS.white,
    fontSize: 14,
    ...FONTS.semiBold,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.accent,
    ...FONTS.medium,
  },
  listContent: {
    paddingBottom: 100,
  },
  cardWrapper: {
    paddingHorizontal: SIZES.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: SIZES.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
  },
});
