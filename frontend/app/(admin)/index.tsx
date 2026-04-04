import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS } from '../../src/constants/adminTheme';
import { api } from '../../src/services/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_restaurants: 0,
    total_orders: 0,
    total_revenue: 0
  });
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const StatCard = ({ title, value, icon, color }: any) => (
    <View style={styles.statCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
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
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} />}
      >
        <Text style={styles.sectionTitle}>Platform Overview</Text>
        
        <View style={styles.statsGrid}>
          <StatCard 
            title="Total Users" 
            value={stats.total_users} 
            icon="people" 
            color="#1877F2" 
          />
          <StatCard 
            title="Restaurants" 
            value={stats.total_restaurants} 
            icon="business" 
            color="#FF9F43" 
          />
          <StatCard 
            title="Total Orders" 
            value={stats.total_orders} 
            icon="receipt" 
            color="#42B72A" 
          />
          <StatCard 
            title="Total Revenue" 
            value={`$${stats.total_revenue.toFixed(2)}`} 
            icon="cash" 
            color="#9C27B0" 
          />
        </View>

      </ScrollView>
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
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: ADMIN_COLORS.textPrimary,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  statCard: {
    width: '47%',
    backgroundColor: ADMIN_COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: ADMIN_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ADMIN_COLORS.textPrimary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    color: ADMIN_COLORS.textSecondary,
  },
});
