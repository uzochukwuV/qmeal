import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OWNER_COLORS, OWNER_SIZES, OWNER_FONTS } from '../../src/constants/ownerTheme';
import apiClient from '../../src/api/client';
import { format } from 'date-fns';

const STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivered'];
const FILTER_OPTIONS = ['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

const statusConfig: Record<string, { color: string; icon: string; label: string }> = {
  pending: { color: OWNER_COLORS.warning, icon: 'time-outline', label: 'Pending' },
  confirmed: { color: OWNER_COLORS.info, icon: 'checkmark-circle-outline', label: 'Confirmed' },
  preparing: { color: OWNER_COLORS.accent, icon: 'flame-outline', label: 'Preparing' },
  ready: { color: OWNER_COLORS.success, icon: 'bag-check-outline', label: 'Ready' },
  picked_up: { color: '#8B5CF6', icon: 'bicycle-outline', label: 'Picked Up' },
  delivered: { color: OWNER_COLORS.textTertiary, icon: 'checkmark-done-outline', label: 'Delivered' },
  cancelled: { color: OWNER_COLORS.danger, icon: 'close-circle-outline', label: 'Cancelled' },
};

export default function OwnerOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const params = activeFilter !== 'all' ? `?status=${activeFilter}` : '';
      const res = await apiClient.get(`/api/owner/orders${params}`);
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, [fetchOrders]);

  const getNextStatus = (currentStatus: string): string | null => {
    const idx = STATUS_FLOW.indexOf(currentStatus);
    if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
    return STATUS_FLOW[idx + 1];
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    try {
      await apiClient.patch(`/api/owner/orders/${orderId}/status`, { status: newStatus });
      await fetchOrders();
    } catch (err) {
      const msg = Platform.OS === 'web' ? 'Failed to update order status' : 'Failed to update';
      Alert.alert('Error', msg);
    } finally {
      setUpdatingOrder(null);
    }
  };

  const confirmStatusChange = (orderId: string, newStatus: string) => {
    if (Platform.OS === 'web') {
      updateOrderStatus(orderId, newStatus);
      return;
    }
    Alert.alert(
      'Update Order',
      `Change status to "${statusConfig[newStatus]?.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateOrderStatus(orderId, newStatus) },
      ]
    );
  };

  const cancelOrder = (orderId: string) => {
    if (Platform.OS === 'web') {
      updateOrderStatus(orderId, 'cancelled');
      return;
    }
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, Cancel', style: 'destructive', onPress: () => updateOrderStatus(orderId, 'cancelled') },
      ]
    );
  };

  const renderOrderCard = ({ item }: { item: any }) => {
    const config = statusConfig[item.status] || statusConfig.pending;
    const nextStatus = getNextStatus(item.status);
    const isUpdating = updatingOrder === item.order_id;
    const isTerminal = item.status === 'delivered' || item.status === 'cancelled';

    return (
      <View style={styles.orderCard}>
        {/* Order Header */}
        <View style={styles.orderHeader}>
          <View style={styles.orderIdRow}>
            <Text style={styles.orderId}>#{item.order_id.slice(0, 8)}</Text>
            <Text style={styles.orderTime}>
              {format(new Date(item.created_at), 'h:mm a')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
            <Ionicons name={config.icon as any} size={14} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        {/* Customer & Address */}
        <View style={styles.customerRow}>
          <View style={styles.customerInfo}>
            <Ionicons name="person-outline" size={14} color={OWNER_COLORS.textSecondary} />
            <Text style={styles.customerName}>{item.customer_name}</Text>
          </View>
          {item.delivery_address && (
            <View style={styles.customerInfo}>
              <Ionicons name="location-outline" size={14} color={OWNER_COLORS.textSecondary} />
              <Text style={styles.addressText} numberOfLines={1}>{item.delivery_address}</Text>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.itemsSection}>
          {item.items?.map((orderItem: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemQty}>{orderItem.quantity}x</Text>
              <Text style={styles.itemName}>{orderItem.name}</Text>
              <Text style={styles.itemPrice}>${(orderItem.price * orderItem.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${item.total?.toFixed(2)}</Text>
        </View>

        {/* Actions */}
        {!isTerminal && (
          <View style={styles.actionsRow}>
            {nextStatus && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: (statusConfig[nextStatus]?.color || OWNER_COLORS.accent) + '20' }]}
                onPress={() => confirmStatusChange(item.order_id, nextStatus)}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color={statusConfig[nextStatus]?.color} />
                ) : (
                  <>
                    <Ionicons name={statusConfig[nextStatus]?.icon as any} size={16} color={statusConfig[nextStatus]?.color} />
                    <Text style={[styles.actionText, { color: statusConfig[nextStatus]?.color }]}>
                      Mark as {statusConfig[nextStatus]?.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {item.status === 'pending' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: OWNER_COLORS.dangerLight }]}
                onPress={() => cancelOrder(item.order_id)}
                disabled={isUpdating}
              >
                <Ionicons name="close-circle-outline" size={16} color={OWNER_COLORS.danger} />
                <Text style={[styles.actionText, { color: OWNER_COLORS.danger }]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={OWNER_COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders</Text>
        <Text style={styles.orderCount}>{orders.length} orders</Text>
      </View>

      {/* Filters */}
      <FlatList
        horizontal
        data={FILTER_OPTIONS}
        showsHorizontalScrollIndicator={false}
        style={styles.filterList}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
            onPress={() => setActiveFilter(item)}
          >
            <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
              {item.charAt(0).toUpperCase() + item.slice(1).replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
      />

      {/* Orders List */}
      <FlatList
        data={orders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.order_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={OWNER_COLORS.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={56} color={OWNER_COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptySubtext}>Orders matching your filter will appear here</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: OWNER_COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: OWNER_SIZES.lg,
    paddingTop: OWNER_SIZES.md,
    paddingBottom: OWNER_SIZES.sm,
  },
  headerTitle: { fontSize: 24, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold },
  orderCount: { fontSize: 14, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.medium },
  filterList: { maxHeight: 44 },
  filterContent: { paddingHorizontal: OWNER_SIZES.md, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: OWNER_COLORS.surface,
    borderWidth: 1,
    borderColor: OWNER_COLORS.border,
  },
  filterChipActive: {
    backgroundColor: OWNER_COLORS.accentLight,
    borderColor: OWNER_COLORS.accent,
  },
  filterText: { fontSize: 13, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.medium },
  filterTextActive: { color: OWNER_COLORS.accent },
  listContent: { padding: OWNER_SIZES.md, paddingBottom: 100 },
  orderCard: {
    backgroundColor: OWNER_COLORS.surface,
    borderRadius: OWNER_SIZES.radiusLg,
    padding: OWNER_SIZES.md,
    marginBottom: OWNER_SIZES.md,
    borderWidth: 1,
    borderColor: OWNER_COLORS.border,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdRow: { flexDirection: 'column' },
  orderId: { fontSize: 16, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold },
  orderTime: { fontSize: 12, color: OWNER_COLORS.textTertiary, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  statusText: { fontSize: 12, ...OWNER_FONTS.semiBold },
  customerRow: {
    marginTop: OWNER_SIZES.md,
    gap: 6,
  },
  customerInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  customerName: { fontSize: 14, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.medium },
  addressText: { fontSize: 13, color: OWNER_COLORS.textSecondary, flex: 1 },
  itemsSection: {
    marginTop: OWNER_SIZES.md,
    paddingTop: OWNER_SIZES.md,
    borderTopWidth: 1,
    borderTopColor: OWNER_COLORS.border,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemQty: {
    fontSize: 13,
    color: OWNER_COLORS.accent,
    ...OWNER_FONTS.bold,
    width: 28,
  },
  itemName: { flex: 1, fontSize: 14, color: OWNER_COLORS.textPrimary },
  itemPrice: { fontSize: 14, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.medium },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: OWNER_SIZES.sm,
    paddingTop: OWNER_SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: OWNER_COLORS.border,
  },
  totalLabel: { fontSize: 15, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.semiBold },
  totalValue: { fontSize: 18, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold },
  actionsRow: {
    flexDirection: 'row',
    gap: OWNER_SIZES.sm,
    marginTop: OWNER_SIZES.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: OWNER_SIZES.radiusMd,
    gap: 6,
  },
  actionText: { fontSize: 13, ...OWNER_FONTS.semiBold },
  emptyState: {
    alignItems: 'center',
    paddingVertical: OWNER_SIZES.xxl * 2,
  },
  emptyTitle: { fontSize: 18, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.semiBold, marginTop: OWNER_SIZES.md },
  emptySubtext: { fontSize: 14, color: OWNER_COLORS.textTertiary, marginTop: 4 },
});
