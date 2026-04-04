import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RIDER_COLORS } from '../../src/constants/riderTheme';
import { api } from '../../src/services/api';

export default function RiderHistory() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rider/deliveries');
      setDeliveries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.feeText}>${item.delivery_fee.toFixed(2)}</Text>
      </View>
      
      <View style={styles.details}>
        <View style={styles.locationRow}>
          <Ionicons name="storefront-outline" size={16} color={RIDER_COLORS.textSecondary} style={styles.icon} />
          <Text style={styles.locationText} numberOfLines={1}>{item.pickup_location.address}</Text>
        </View>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={16} color={RIDER_COLORS.error} style={styles.icon} />
          <Text style={styles.locationText} numberOfLines={1}>{item.dropoff_location.address}</Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'delivered' ? RIDER_COLORS.success + '20' : RIDER_COLORS.warning + '20' }]}>
          <Text style={[styles.statusText, { color: item.status === 'delivered' ? RIDER_COLORS.success : RIDER_COLORS.warning }]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery History</Text>
      </View>

      <FlatList
        data={deliveries}
        keyExtractor={item => item.delivery_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadHistory} />}
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
    marginBottom: 12,
    borderWidth: 1,
    borderColor: RIDER_COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    color: RIDER_COLORS.textSecondary,
    fontWeight: '500',
  },
  feeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: RIDER_COLORS.success,
  },
  details: {
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    color: RIDER_COLORS.textPrimary,
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
