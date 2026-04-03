import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../src/api/client';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../src/constants/theme';
import { format } from 'date-fns';

interface OrderItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  order_id: string;
  restaurant_name: string;
  items: OrderItem[];
  total: number;
  status: string;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: COLORS.warning,
  confirmed: COLORS.accent,
  preparing: COLORS.accent,
  on_the_way: COLORS.success,
  delivered: COLORS.success,
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  on_the_way: 'On the way',
  delivered: 'Delivered',
};

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const response = await apiClient.get('/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await fetchOrders();
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const renderOrderCard = ({ item }: { item: Order }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      onPress={() => router.push(`/order/${item.order_id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.restaurantName}>{item.restaurant_name}</Text>
          <Text style={styles.orderDate}>
            {format(new Date(item.created_at), 'MMM d, yyyy • h:mm a')}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] }]} />
          <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
            {statusLabels[item.status]}
          </Text>
        </View>
      </View>

      <View style={styles.itemsList}>
        {item.items.slice(0, 2).map((orderItem, index) => (
          <Text key={orderItem.item_id + index} style={styles.itemText}>
            {orderItem.quantity}x {orderItem.name}
          </Text>
        ))}
        {item.items.length > 2 && (
          <Text style={styles.moreItems}>+{item.items.length - 2} more items</Text>
        )}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalText}>Total: ${item.total.toFixed(2)}</Text>
        <View style={styles.viewDetailBtn}>
          <Text style={styles.viewDetailText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.accent} />
        </View>
      </View>
    </TouchableOpacity>
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.subtitle}>Track and manage your orders</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.order_id}
        renderItem={renderOrderCard}
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
            <Ionicons name="receipt-outline" size={64} color={COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptyText}>
              Your order history will appear here
            </Text>
          </View>
        }
      />
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
  listContent: {
    paddingHorizontal: SIZES.md,
    paddingBottom: SIZES.xl,
  },
  orderCard: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    ...SHADOWS.medium,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.md,
  },
  restaurantName: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  orderDate: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    ...FONTS.medium,
  },
  itemsList: {
    paddingVertical: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  itemText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  moreItems: {
    fontSize: 14,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.md,
  },
  totalText: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  reorderBtn: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
  },
  reorderText: {
    color: COLORS.accent,
    fontSize: 14,
    ...FONTS.semiBold,
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
  },
  viewDetailText: {
    color: COLORS.accent,
    fontSize: 14,
    ...FONTS.semiBold,
    marginRight: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: SIZES.xxl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
    marginTop: SIZES.lg,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
    textAlign: 'center',
  },
});
