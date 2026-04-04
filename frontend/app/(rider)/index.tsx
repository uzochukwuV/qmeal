import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RIDER_COLORS } from '../../src/constants/riderTheme';
import { api } from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';

export default function RiderDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    today_deliveries: 0,
    total_earnings: 0,
    active_delivery: null as any
  });
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rider/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const updateDeliveryStatus = async (orderId: string, newStatus: string) => {
    try {
      await api.patch(`/rider/orders/${orderId}/status`, { status: newStatus });
      Alert.alert('Success', `Status updated to ${newStatus}`);
      loadDashboard();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const StatCard = ({ title, value, icon }: any) => (
    <View style={styles.statCard}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={24} color={RIDER_COLORS.accent} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hey, {user?.name?.split(' ')[0]}</Text>
          <Text style={styles.headerTitle}>Rider Dashboard</Text>
        </View>
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>Online</Text>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDashboard} />}
      >
        <View style={styles.statsGrid}>
          <StatCard 
            title="Today's Deliveries" 
            value={stats.today_deliveries} 
            icon="bicycle" 
          />
          <StatCard 
            title="Today's Earnings" 
            value={`$${stats.total_earnings.toFixed(2)}`} 
            icon="cash" 
          />
        </View>

        <Text style={styles.sectionTitle}>Active Delivery</Text>
        
        {stats.active_delivery ? (
          <View style={styles.activeCard}>
            <View style={styles.activeHeader}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{stats.active_delivery.status.toUpperCase()}</Text>
              </View>
              <Text style={styles.feeText}>${stats.active_delivery.delivery_fee.toFixed(2)}</Text>
            </View>
            
            <View style={styles.locationContainer}>
              <View style={styles.locationRow}>
                <Ionicons name="storefront" size={20} color={RIDER_COLORS.textSecondary} />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>Pickup</Text>
                  <Text style={styles.locationAddress}>{stats.active_delivery.pickup_location.address}</Text>
                </View>
              </View>
              
              <View style={styles.locationLine} />
              
              <View style={styles.locationRow}>
                <Ionicons name="location" size={20} color={RIDER_COLORS.error} />
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>Dropoff</Text>
                  <Text style={styles.locationAddress}>{stats.active_delivery.dropoff_location.address}</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionButtons}>
              {stats.active_delivery.status === 'accepted' && (
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => updateDeliveryStatus(stats.active_delivery.order_id, 'picked_up')}
                >
                  <Text style={styles.buttonText}>Confirm Pickup</Text>
                </TouchableOpacity>
              )}
              {stats.active_delivery.status === 'picked_up' && (
                <TouchableOpacity 
                  style={styles.primaryButton}
                  onPress={() => updateDeliveryStatus(stats.active_delivery.order_id, 'on_the_way')}
                >
                  <Text style={styles.buttonText}>Start Delivery</Text>
                </TouchableOpacity>
              )}
              {stats.active_delivery.status === 'on_the_way' && (
                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: RIDER_COLORS.success }]}
                  onPress={() => updateDeliveryStatus(stats.active_delivery.order_id, 'delivered')}
                >
                  <Text style={styles.buttonText}>Mark Delivered</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="bicycle-outline" size={64} color={RIDER_COLORS.textTertiary} />
            <Text style={styles.emptyText}>No active deliveries</Text>
            <Text style={styles.emptySubtext}>Check the Available tab to find new orders.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RIDER_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: RIDER_COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: RIDER_COLORS.border,
  },
  greeting: {
    fontSize: 14,
    color: RIDER_COLORS.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: RIDER_COLORS.textPrimary,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: RIDER_COLORS.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: RIDER_COLORS.success,
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: RIDER_COLORS.success,
  },
  scrollContent: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: RIDER_COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: RIDER_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: RIDER_COLORS.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: RIDER_COLORS.textPrimary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: RIDER_COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: RIDER_COLORS.textPrimary,
    marginBottom: 16,
  },
  activeCard: {
    backgroundColor: RIDER_COLORS.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: RIDER_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    backgroundColor: RIDER_COLORS.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: RIDER_COLORS.accentDark,
    fontWeight: 'bold',
    fontSize: 12,
  },
  feeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: RIDER_COLORS.success,
  },
  locationContainer: {
    marginBottom: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: RIDER_COLORS.textTertiary,
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: '500',
    color: RIDER_COLORS.textPrimary,
  },
  locationLine: {
    width: 2,
    height: 24,
    backgroundColor: RIDER_COLORS.divider,
    marginLeft: 9,
    marginVertical: 4,
  },
  actionButtons: {
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: RIDER_COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: RIDER_COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
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
    textAlign: 'center',
  },
});
