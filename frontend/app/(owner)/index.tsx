import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OWNER_COLORS, OWNER_SIZES, OWNER_FONTS } from '../../src/constants/ownerTheme';
import apiClient from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';
import { format } from 'date-fns';

interface DashboardStats {
  today_orders: number;
  today_revenue: number;
  total_revenue: number;
  pending_orders: number;
  total_orders: number;
  menu_items: number;
  review_count: number;
  rating: number;
}

interface DashboardData {
  restaurant: any;
  stats: DashboardStats;
}

export default function OwnerDashboard() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, ordersRes] = await Promise.all([
        apiClient.get('/owner/dashboard'),
        apiClient.get('/owner/orders'),
      ]);
      setData(dashRes.data);
      setRecentOrders(ordersRes.data.slice(0, 5));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) { /* ignore */ }
    await logout();
    router.replace('/(auth)/login');
  };

  const statusColors: Record<string, string> = {
    pending: OWNER_COLORS.warning,
    confirmed: OWNER_COLORS.info,
    preparing: OWNER_COLORS.accent,
    ready: OWNER_COLORS.success,
    picked_up: '#8B5CF6',
    delivered: OWNER_COLORS.textTertiary,
    cancelled: OWNER_COLORS.danger,
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

  const stats = data?.stats;
  const restaurant = data?.restaurant;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={OWNER_COLORS.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}</Text>
            <Text style={styles.restaurantName}>{restaurant?.name || 'My Restaurant'}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.statusPill, { backgroundColor: restaurant?.is_open ? OWNER_COLORS.successLight : OWNER_COLORS.dangerLight }]}>
              <View style={[styles.statusDot, { backgroundColor: restaurant?.is_open ? OWNER_COLORS.success : OWNER_COLORS.danger }]} />
              <Text style={[styles.statusPillText, { color: restaurant?.is_open ? OWNER_COLORS.success : OWNER_COLORS.danger }]}>
                {restaurant?.is_open ? 'Open' : 'Closed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: OWNER_COLORS.accentLight }]}>
            <Ionicons name="receipt-outline" size={22} color={OWNER_COLORS.accent} />
            <Text style={[styles.statNumber, { color: OWNER_COLORS.accent }]}>{stats?.today_orders || 0}</Text>
            <Text style={styles.statLabel}>Today's Orders</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: OWNER_COLORS.successLight }]}>
            <Ionicons name="cash-outline" size={22} color={OWNER_COLORS.success} />
            <Text style={[styles.statNumber, { color: OWNER_COLORS.success }]}>${stats?.today_revenue?.toFixed(2) || '0.00'}</Text>
            <Text style={styles.statLabel}>Today's Revenue</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: OWNER_COLORS.warningLight }]}>
            <Ionicons name="time-outline" size={22} color={OWNER_COLORS.warning} />
            <Text style={[styles.statNumber, { color: OWNER_COLORS.warning }]}>{stats?.pending_orders || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: OWNER_COLORS.infoLight }]}>
            <Ionicons name="star-outline" size={22} color={OWNER_COLORS.info} />
            <Text style={[styles.statNumber, { color: OWNER_COLORS.info }]}>{stats?.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.quickStatsRow}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>${stats?.total_revenue?.toFixed(2) || '0.00'}</Text>
            <Text style={styles.quickStatLabel}>Total Revenue</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{stats?.total_orders || 0}</Text>
            <Text style={styles.quickStatLabel}>Total Orders</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>{stats?.menu_items || 0}</Text>
            <Text style={styles.quickStatLabel}>Menu Items</Text>
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity onPress={() => router.push('/(owner)/orders')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentOrders.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color={OWNER_COLORS.textTertiary} />
              <Text style={styles.emptyText}>No orders yet</Text>
              <Text style={styles.emptySubtext}>Orders will appear here when customers place them</Text>
            </View>
          ) : (
            recentOrders.map((order) => (
              <View key={order.order_id} style={styles.orderCard}>
                <View style={styles.orderTop}>
                  <View>
                    <Text style={styles.orderId}>#{order.order_id.slice(0, 8)}</Text>
                    <Text style={styles.orderCustomer}>{order.customer_name}</Text>
                  </View>
                  <View style={[styles.orderStatus, { backgroundColor: (statusColors[order.status] || OWNER_COLORS.textTertiary) + '20' }]}>
                    <Text style={[styles.orderStatusText, { color: statusColors[order.status] || OWNER_COLORS.textTertiary }]}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('_', ' ')}
                    </Text>
                  </View>
                </View>
                <View style={styles.orderBottom}>
                  <Text style={styles.orderItems}>{order.items?.length || 0} items</Text>
                  <Text style={styles.orderTotal}>${order.total?.toFixed(2)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(owner)/menu')}>
              <View style={[styles.actionIcon, { backgroundColor: OWNER_COLORS.accentLight }]}>
                <Ionicons name="add-circle-outline" size={24} color={OWNER_COLORS.accent} />
              </View>
              <Text style={styles.actionLabel}>Add Item</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(owner)/orders')}>
              <View style={[styles.actionIcon, { backgroundColor: OWNER_COLORS.infoLight }]}>
                <Ionicons name="list-outline" size={24} color={OWNER_COLORS.info} />
              </View>
              <Text style={styles.actionLabel}>All Orders</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/(owner)/settings')}>
              <View style={[styles.actionIcon, { backgroundColor: OWNER_COLORS.successLight }]}>
                <Ionicons name="storefront-outline" size={24} color={OWNER_COLORS.success} />
              </View>
              <Text style={styles.actionLabel}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleLogout}>
              <View style={[styles.actionIcon, { backgroundColor: OWNER_COLORS.dangerLight }]}>
                <Ionicons name="log-out-outline" size={24} color={OWNER_COLORS.danger} />
              </View>
              <Text style={styles.actionLabel}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
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
    paddingBottom: OWNER_SIZES.lg,
  },
  greeting: { fontSize: 14, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.medium },
  restaurantName: { fontSize: 22, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusPillText: { fontSize: 12, ...OWNER_FONTS.semiBold },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: OWNER_SIZES.md,
    gap: OWNER_SIZES.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: OWNER_SIZES.md,
    borderRadius: OWNER_SIZES.radiusMd,
    gap: 6,
  },
  statNumber: { fontSize: 24, ...OWNER_FONTS.bold },
  statLabel: { fontSize: 12, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.medium },
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: OWNER_COLORS.surface,
    marginHorizontal: OWNER_SIZES.md,
    marginTop: OWNER_SIZES.md,
    borderRadius: OWNER_SIZES.radiusMd,
    padding: OWNER_SIZES.md,
    alignItems: 'center',
  },
  quickStat: { flex: 1, alignItems: 'center' },
  quickStatValue: { fontSize: 16, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold },
  quickStatLabel: { fontSize: 11, color: OWNER_COLORS.textTertiary, ...OWNER_FONTS.medium, marginTop: 2 },
  quickStatDivider: { width: 1, height: 32, backgroundColor: OWNER_COLORS.border },
  section: {
    paddingHorizontal: OWNER_SIZES.md,
    marginTop: OWNER_SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: OWNER_SIZES.md,
  },
  sectionTitle: { fontSize: 18, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold },
  seeAll: { fontSize: 14, color: OWNER_COLORS.accent, ...OWNER_FONTS.semiBold },
  emptyState: {
    alignItems: 'center',
    paddingVertical: OWNER_SIZES.xl,
    backgroundColor: OWNER_COLORS.surface,
    borderRadius: OWNER_SIZES.radiusMd,
  },
  emptyText: { fontSize: 16, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.semiBold, marginTop: OWNER_SIZES.sm },
  emptySubtext: { fontSize: 13, color: OWNER_COLORS.textTertiary, marginTop: 4, textAlign: 'center', paddingHorizontal: OWNER_SIZES.xl },
  orderCard: {
    backgroundColor: OWNER_COLORS.surface,
    borderRadius: OWNER_SIZES.radiusMd,
    padding: OWNER_SIZES.md,
    marginBottom: OWNER_SIZES.sm,
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 15, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold },
  orderCustomer: { fontSize: 13, color: OWNER_COLORS.textSecondary, marginTop: 2 },
  orderStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  orderStatusText: { fontSize: 12, ...OWNER_FONTS.semiBold },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: OWNER_SIZES.sm,
    paddingTop: OWNER_SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: OWNER_COLORS.border,
  },
  orderItems: { fontSize: 13, color: OWNER_COLORS.textTertiary },
  orderTotal: { fontSize: 16, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold },
  actionsRow: {
    flexDirection: 'row',
    marginTop: OWNER_SIZES.md,
    gap: OWNER_SIZES.md,
  },
  actionBtn: { flex: 1, alignItems: 'center', gap: 8 },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: { fontSize: 12, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.medium },
});
