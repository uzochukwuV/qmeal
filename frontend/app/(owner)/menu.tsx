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
  TextInput,
  Modal,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OWNER_COLORS, OWNER_SIZES, OWNER_FONTS } from '../../src/constants/ownerTheme';
import apiClient from '../../src/api/client';

interface MenuItemType {
  item_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  is_popular: boolean;
  image_url?: string;
}

const EMPTY_ITEM = {
  name: '',
  description: '',
  price: '',
  category: '',
  is_available: true,
  is_popular: false,
};

export default function OwnerMenu() {
  const [items, setItems] = useState<MenuItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [formData, setFormData] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');

  const fetchMenu = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/owner/menu');
      setItems(res.data);
      const cats = ['All', ...new Set(res.data.map((i: MenuItemType) => i.category))] as string[];
      setCategories(cats);
    } catch (err) {
      console.error('Error fetching menu:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchMenu(); }, [fetchMenu]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMenu();
    setRefreshing(false);
  }, [fetchMenu]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(EMPTY_ITEM);
    setShowModal(true);
  };

  const openEditModal = (item: MenuItemType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      is_available: item.is_available,
      is_popular: item.is_popular,
    });
    setShowModal(true);
  };

  const saveItem = async () => {
    if (!formData.name || !formData.price || !formData.category) {
      Alert.alert('Missing Fields', 'Please fill in name, price, and category');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        is_available: formData.is_available,
        is_popular: formData.is_popular,
      };
      if (editingItem) {
        await apiClient.patch(`/api/owner/menu/${editingItem.item_id}`, payload);
      } else {
        await apiClient.post('/api/owner/menu', payload);
      }
      setShowModal(false);
      await fetchMenu();
    } catch (err) {
      Alert.alert('Error', 'Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItemType) => {
    try {
      await apiClient.patch(`/api/owner/menu/${item.item_id}`, {
        is_available: !item.is_available,
      });
      await fetchMenu();
    } catch (err) {
      Alert.alert('Error', 'Failed to update availability');
    }
  };

  const deleteItem = async (item: MenuItemType) => {
    const doDelete = async () => {
      try {
        await apiClient.delete(`/api/owner/menu/${item.item_id}`);
        await fetchMenu();
      } catch (err) {
        Alert.alert('Error', 'Failed to delete item');
      }
    };
    if (Platform.OS === 'web') {
      doDelete();
      return;
    }
    Alert.alert('Delete Item', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: doDelete },
    ]);
  };

  const filteredItems = activeCategory === 'All'
    ? items
    : items.filter(i => i.category === activeCategory);

  const renderMenuItem = ({ item }: { item: MenuItemType }) => (
    <View style={[styles.menuCard, !item.is_available && styles.menuCardDisabled]}>
      <View style={styles.menuCardContent}>
        <View style={styles.menuCardTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.menuName}>{item.name}</Text>
              {item.is_popular && (
                <View style={styles.popularBadge}>
                  <Ionicons name="flame" size={10} color={OWNER_COLORS.accent} />
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              )}
            </View>
            <Text style={styles.menuDesc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.menuMeta}>
              <Text style={styles.menuPrice}>${item.price.toFixed(2)}</Text>
              <Text style={styles.menuCategory}>{item.category}</Text>
            </View>
          </View>
        </View>
        <View style={styles.menuActions}>
          <TouchableOpacity
            style={styles.availToggle}
            onPress={() => toggleAvailability(item)}
          >
            <View style={[styles.toggleDot, { backgroundColor: item.is_available ? OWNER_COLORS.success : OWNER_COLORS.danger }]} />
            <Text style={[styles.toggleText, { color: item.is_available ? OWNER_COLORS.success : OWNER_COLORS.danger }]}>
              {item.is_available ? 'Available' : 'Unavailable'}
            </Text>
          </TouchableOpacity>
          <View style={styles.menuBtns}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
              <Ionicons name="pencil-outline" size={18} color={OWNER_COLORS.info} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteItem(item)}>
              <Ionicons name="trash-outline" size={18} color={OWNER_COLORS.danger} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

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
        <View>
          <Text style={styles.headerTitle}>Menu</Text>
          <Text style={styles.itemCount}>{items.length} items</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Ionicons name="add" size={20} color={OWNER_COLORS.white} />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Categories */}
      <FlatList
        horizontal
        data={categories}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.categoryChip, activeCategory === item && styles.categoryChipActive]}
            onPress={() => setActiveCategory(item)}
          >
            <Text style={[styles.categoryText, activeCategory === item && styles.categoryTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
      />

      {/* Menu List */}
      <FlatList
        data={filteredItems}
        renderItem={renderMenuItem}
        keyExtractor={(item) => item.item_id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={OWNER_COLORS.accent} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={56} color={OWNER_COLORS.textTertiary} />
            <Text style={styles.emptyTitle}>No menu items</Text>
            <Text style={styles.emptySubtext}>Add your first menu item to get started</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingItem ? 'Edit Item' : 'Add New Item'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color={OWNER_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Form Fields */}
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g. Margherita Pizza"
                placeholderTextColor={OWNER_COLORS.textTertiary}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Brief description..."
                placeholderTextColor={OWNER_COLORS.textTertiary}
                multiline
                numberOfLines={3}
              />

              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Price *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                    placeholder="0.00"
                    placeholderTextColor={OWNER_COLORS.textTertiary}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.inputLabel}>Category *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.category}
                    onChangeText={(text) => setFormData({ ...formData, category: text })}
                    placeholder="e.g. Pizza"
                    placeholderTextColor={OWNER_COLORS.textTertiary}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Available</Text>
                <Switch
                  value={formData.is_available}
                  onValueChange={(val) => setFormData({ ...formData, is_available: val })}
                  trackColor={{ false: OWNER_COLORS.border, true: OWNER_COLORS.success + '60' }}
                  thumbColor={formData.is_available ? OWNER_COLORS.success : OWNER_COLORS.textTertiary}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Mark as Popular</Text>
                <Switch
                  value={formData.is_popular}
                  onValueChange={(val) => setFormData({ ...formData, is_popular: val })}
                  trackColor={{ false: OWNER_COLORS.border, true: OWNER_COLORS.accent + '60' }}
                  thumbColor={formData.is_popular ? OWNER_COLORS.accent : OWNER_COLORS.textTertiary}
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={saveItem}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={OWNER_COLORS.white} />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  itemCount: { fontSize: 14, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.medium },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OWNER_COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: OWNER_SIZES.radiusMd,
    gap: 6,
  },
  addBtnText: { color: OWNER_COLORS.white, fontSize: 14, ...OWNER_FONTS.semiBold },
  categoryList: { maxHeight: 44, marginTop: 4 },
  categoryContent: { paddingHorizontal: OWNER_SIZES.md, gap: 8 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: OWNER_COLORS.surface,
    borderWidth: 1,
    borderColor: OWNER_COLORS.border,
  },
  categoryChipActive: {
    backgroundColor: OWNER_COLORS.accentLight,
    borderColor: OWNER_COLORS.accent,
  },
  categoryText: { fontSize: 13, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.medium },
  categoryTextActive: { color: OWNER_COLORS.accent },
  listContent: { padding: OWNER_SIZES.md, paddingBottom: 100 },
  menuCard: {
    backgroundColor: OWNER_COLORS.surface,
    borderRadius: OWNER_SIZES.radiusLg,
    marginBottom: OWNER_SIZES.md,
    borderWidth: 1,
    borderColor: OWNER_COLORS.border,
    overflow: 'hidden',
  },
  menuCardDisabled: { opacity: 0.6 },
  menuCardContent: { padding: OWNER_SIZES.md },
  menuCardTop: { flexDirection: 'row' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  menuName: { fontSize: 16, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: OWNER_COLORS.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  popularText: { fontSize: 10, color: OWNER_COLORS.accent, ...OWNER_FONTS.semiBold },
  menuDesc: { fontSize: 13, color: OWNER_COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  menuMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: OWNER_SIZES.sm,
    gap: OWNER_SIZES.md,
  },
  menuPrice: { fontSize: 18, color: OWNER_COLORS.accent, ...OWNER_FONTS.bold },
  menuCategory: {
    fontSize: 12,
    color: OWNER_COLORS.textTertiary,
    backgroundColor: OWNER_COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  menuActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: OWNER_SIZES.md,
    paddingTop: OWNER_SIZES.md,
    borderTopWidth: 1,
    borderTopColor: OWNER_COLORS.border,
  },
  availToggle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleDot: { width: 8, height: 8, borderRadius: 4 },
  toggleText: { fontSize: 13, ...OWNER_FONTS.medium },
  menuBtns: { flexDirection: 'row', gap: OWNER_SIZES.sm },
  editBtn: {
    padding: 8,
    backgroundColor: OWNER_COLORS.infoLight,
    borderRadius: 8,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: OWNER_COLORS.dangerLight,
    borderRadius: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: OWNER_SIZES.xxl * 2,
  },
  emptyTitle: { fontSize: 18, color: OWNER_COLORS.textSecondary, ...OWNER_FONTS.semiBold, marginTop: OWNER_SIZES.md },
  emptySubtext: { fontSize: 14, color: OWNER_COLORS.textTertiary, marginTop: 4 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: OWNER_COLORS.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: OWNER_SIZES.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: OWNER_SIZES.lg,
  },
  modalTitle: { fontSize: 20, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.bold },
  inputLabel: {
    fontSize: 13,
    color: OWNER_COLORS.textSecondary,
    ...OWNER_FONTS.semiBold,
    marginBottom: 6,
    marginTop: OWNER_SIZES.md,
  },
  input: {
    backgroundColor: OWNER_COLORS.surface,
    borderWidth: 1,
    borderColor: OWNER_COLORS.border,
    borderRadius: OWNER_SIZES.radiusMd,
    padding: OWNER_SIZES.md,
    color: OWNER_COLORS.textPrimary,
    fontSize: 15,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row' },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: OWNER_SIZES.md,
    backgroundColor: OWNER_COLORS.surface,
    padding: OWNER_SIZES.md,
    borderRadius: OWNER_SIZES.radiusMd,
  },
  switchLabel: { fontSize: 15, color: OWNER_COLORS.textPrimary, ...OWNER_FONTS.medium },
  saveBtn: {
    backgroundColor: OWNER_COLORS.accent,
    padding: OWNER_SIZES.md,
    borderRadius: OWNER_SIZES.radiusMd,
    alignItems: 'center',
    marginTop: OWNER_SIZES.lg,
    marginBottom: OWNER_SIZES.xl,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: OWNER_COLORS.white, fontSize: 16, ...OWNER_FONTS.bold },
});
