import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS } from '../../src/constants/adminTheme';
import { api } from '../../src/services/api';

export default function AdminRestaurants() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/restaurants');
      setRestaurants(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurants();
  }, []);

  const toggleRestaurantStatus = async (restaurant_id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/admin/restaurants/${restaurant_id}`, { is_open: !currentStatus });
      Alert.alert('Success', `Restaurant has been ${!currentStatus ? 'opened' : 'closed'}`);
      loadRestaurants();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={[styles.statusBadge, { backgroundColor: item.is_open ? ADMIN_COLORS.success + '20' : ADMIN_COLORS.error + '20' }]}>
          <Text style={[styles.statusText, { color: item.is_open ? ADMIN_COLORS.success : ADMIN_COLORS.error }]}>
            {item.is_open ? 'Active' : 'Suspended/Closed'}
          </Text>
        </View>
      </View>
      
      <View style={styles.details}>
        <Text style={styles.detailText}><Ionicons name="restaurant-outline" /> {item.cuisine_type}</Text>
        <Text style={styles.detailText}><Ionicons name="star-outline" /> {item.rating} ({item.review_count} reviews)</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: item.is_open ? ADMIN_COLORS.error : ADMIN_COLORS.success }]}
          onPress={() => toggleRestaurantStatus(item.restaurant_id, item.is_open)}
        >
          <Text style={styles.actionButtonText}>
            {item.is_open ? 'Suspend' : 'Activate'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Restaurants</Text>
      </View>

      <FlatList
        data={restaurants}
        keyExtractor={item => item.restaurant_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadRestaurants} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ADMIN_COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: ADMIN_COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: ADMIN_COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ADMIN_COLORS.textPrimary,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: ADMIN_COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: ADMIN_COLORS.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  details: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detailText: {
    color: ADMIN_COLORS.textSecondary,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: ADMIN_COLORS.divider,
    paddingTop: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    color: ADMIN_COLORS.white,
    fontWeight: 'bold',
  },
});
