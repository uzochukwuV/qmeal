import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { RIDER_COLORS } from '../../src/constants/riderTheme';
import { api } from '../../src/services/api';

export default function RiderAvailableOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rider/available-orders');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const acceptOrder = async (orderId: string) => {
    try {
      await api.post(`/rider/orders/${orderId}/accept`);
      Alert.alert('Success', 'Order accepted successfully');
      router.replace('/(rider)');
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.response?.data?.detail || 'Failed to accept order');
      loadOrders(); // Refresh list if it failed
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.restaurantInfo}>
          <Ionicons name="storefront-outline" size={20} color={RIDER_COLORS.textSecondary} style={styles.icon} />
          <Text style={styles.restaurantName} numberOfLines={1}>{item.restaurant_name}</Text>
        </View>
        <Text style={styles.feeText}>${item.delivery_fee.toFixed(2)}</Text>
      </View>
      
      <View style={styles.details}>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={RIDER_COLORS.error} style={styles.icon} />
          <Text style={styles.addressText} numberOfLines={1}>{item.delivery_address}</Text>
        </View>
        
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="fast-food-outline" size={14} color={RIDER_COLORS.textTertiary} />
            <Text style={styles.metaText}>{item.items.reduce((acc: number, curr: any) => acc + curr.quantity, 0)} items</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={RIDER_COLORS.textTertiary} />
            <Text style={styles.metaText}>{item.status}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.acceptButton}
        onPress={() => acceptOrder(item.order_id)}
      >
        <Text style={styles.acceptButtonText}>Accept Delivery</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Available Deliveries</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => item.order_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadOrders} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={RIDER_COLORS.textTertiary} />
              <Text style={styles.emptyText}>No available orders</Text>
              <Text style={styles.emptySubtext}>Waiting for new requests...</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RIDER_COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: RIDER_COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: RIDER_COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: RIDER_COLORS.textPrimary,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: RIDER_COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: RIDER_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  icon: {
    marginRight: 8,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: RIDER_COLORS.textPrimary,
  },
  feeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: RIDER_COLORS.success,
  },
  details: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressText: {
    fontSize: 14,
    color: RIDER_COLORS.textSecondary,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RIDER_COLORS.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: RIDER_COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  acceptButton: {
    backgroundColor: RIDER_COLORS.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: RIDER_COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: RIDER_COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: RIDER_COLORS.textTertiary,
  },
});
