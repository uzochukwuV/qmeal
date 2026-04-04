import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OWNER_COLORS } from '../../src/constants/ownerTheme';
import { api } from '../../src/services/api';

export default function OwnerPayouts() {
  const [data, setData] = useState({
    available_balance: 0,
    history: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/owner/payouts');
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const requestPayout = async () => {
    if (data.available_balance <= 0) {
      Alert.alert('Invalid', 'No balance available to withdraw');
      return;
    }

    try {
      await api.post('/owner/payouts/request', { amount: data.available_balance, method: 'bank_transfer' });
      Alert.alert('Success', 'Payout requested successfully');
      loadPayouts();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to request payout');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.iconContainer, { backgroundColor: item.status === 'completed' ? OWNER_COLORS.success + '20' : OWNER_COLORS.warning + '20' }]}>
          <Ionicons 
            name={item.status === 'completed' ? "checkmark-circle" : "time"} 
            size={20} 
            color={item.status === 'completed' ? OWNER_COLORS.success : OWNER_COLORS.warning} 
          />
        </View>
        <View>
          <Text style={styles.methodText}>Bank Transfer</Text>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.amountText}>${item.amount.toFixed(2)}</Text>
        <Text style={[styles.statusText, { color: item.status === 'completed' ? OWNER_COLORS.success : OWNER_COLORS.warning }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payouts</Text>
      </View>

      <View style={styles.balanceContainer}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>${data.available_balance.toFixed(2)}</Text>
        
        <TouchableOpacity 
          style={[styles.withdrawButton, data.available_balance <= 0 && styles.withdrawButtonDisabled]}
          onPress={requestPayout}
          disabled={data.available_balance <= 0}
        >
          <Text style={styles.withdrawButtonText}>Withdraw Funds</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historyContainer}>
        <Text style={styles.sectionTitle}>Payout History</Text>
        <FlatList
          data={data.history}
          keyExtractor={item => item.payout_id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPayouts} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No payout history</Text>
              </View>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OWNER_COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: OWNER_COLORS.primary,
    borderBottomWidth: 1,
    borderBottomColor: OWNER_COLORS.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: OWNER_COLORS.textPrimary,
  },
  balanceContainer: {
    backgroundColor: OWNER_COLORS.card,
    padding: 24,
    margin: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: OWNER_COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceLabel: {
    fontSize: 16,
    color: OWNER_COLORS.textSecondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: OWNER_COLORS.textPrimary,
    marginBottom: 20,
  },
  withdrawButton: {
    backgroundColor: OWNER_COLORS.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  withdrawButtonDisabled: {
    backgroundColor: OWNER_COLORS.border,
  },
  withdrawButtonText: {
    color: OWNER_COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: OWNER_COLORS.textPrimary,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: OWNER_COLORS.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: OWNER_COLORS.border,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: OWNER_COLORS.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: OWNER_COLORS.textSecondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: OWNER_COLORS.textPrimary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: OWNER_COLORS.textTertiary,
    fontSize: 16,
  },
});
