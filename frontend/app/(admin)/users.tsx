import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS } from '../../src/constants/adminTheme';
import { api } from '../../src/services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const changeRole = async (user_id: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${user_id}`, { role: newRole });
      Alert.alert('Success', `User role changed to ${newRole}`);
      loadUsers();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update user role');
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name ? item.name[0].toUpperCase() : 'U'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: ADMIN_COLORS.accent + '20' }]}>
          <Text style={[styles.roleText, { color: ADMIN_COLORS.accent }]}>{item.role}</Text>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: ADMIN_COLORS.accent }]}
          onPress={() => {
            Alert.alert(
              'Change Role',
              `Change ${item.name}'s role to:`,
              [
                { text: 'Customer', onPress: () => changeRole(item.user_id, 'customer') },
                { text: 'Rider', onPress: () => changeRole(item.user_id, 'rider') },
                { text: 'Owner', onPress: () => changeRole(item.user_id, 'owner') },
                { text: 'Admin', onPress: () => changeRole(item.user_id, 'admin') },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }}
        >
          <Text style={styles.actionButtonText}>Change Role</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manage Users</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={item => item.user_id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadUsers} />}
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
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ADMIN_COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: ADMIN_COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: ADMIN_COLORS.textPrimary,
  },
  email: {
    fontSize: 14,
    color: ADMIN_COLORS.textSecondary,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
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
