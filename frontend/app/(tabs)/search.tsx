import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { RestaurantCard } from '../../src/components/RestaurantCard';
import { SearchBar } from '../../src/components/SearchBar';
import { CuisineFilter } from '../../src/components/CuisineFilter';
import { CartBadge } from '../../src/components/CartBadge';
import apiClient from '../../src/api/client';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';

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

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const androidStatusBarHeight =
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const topInset = Math.max(insets.top, androidStatusBarHeight);
  const [searchQuery, setSearchQuery] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRestaurants = async () => {
    setIsLoading(true);
    try {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;
      if (selectedCuisine) params.cuisine = selectedCuisine;
      
      const response = await apiClient.get('/restaurants', { params });
      setRestaurants(response.data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    fetchCuisines();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchRestaurants();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCuisine]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
        translucent={false}
      />
      <View style={[styles.topSpacer, { height: topInset }]} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Find your favorite restaurants</Text>
      </View>

      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search restaurants, cuisines..."
      />

      {/* Cuisine Filter */}
      <View style={styles.filterRow}>
        <CuisineFilter
          cuisines={cuisines}
          selected={selectedCuisine}
          onSelect={setSelectedCuisine}
        />
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={restaurants}
          keyExtractor={(item) => item.restaurant_id}
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>
                {searchQuery || selectedCuisine
                  ? 'No restaurants found'
                  : 'Start searching for restaurants'}
              </Text>
            </View>
          }
        />
      )}
      <CartBadge />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topSpacer: {
    width: '100%',
    backgroundColor: COLORS.background,
  },
  filterRow: {
    flexGrow: 0,
    flexShrink: 0,
  },
  header: {
    paddingHorizontal: SIZES.md,
    paddingTop: SIZES.md,
    paddingBottom: SIZES.lg,
  },
  title: {
    fontSize: 28,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  cardWrapper: {
    paddingHorizontal: SIZES.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SIZES.xxl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SIZES.md,
    textAlign: 'center',
  },
});
