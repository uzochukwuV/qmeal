import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import apiClient from '../../src/api/client';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../src/constants/theme';

interface OrderItem {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  order_id: string;
  restaurant_id: string;
  restaurant_name: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  delivery_address: string;
  payment_status: string;
  created_at: string;
  rider_id?: string;
  rider?: {
    name: string;
    phone: string;
    vehicle_type: string;
  };
}

const statusSteps = ['confirmed', 'preparing', 'on_the_way', 'delivered'];
const statusLabels: Record<string, string> = {
  pending: 'Order Pending',
  confirmed: 'Order Confirmed',
  preparing: 'Preparing Your Food',
  on_the_way: 'On The Way',
  delivered: 'Delivered',
};

const statusIcons: Record<string, string> = {
  pending: 'time-outline',
  confirmed: 'checkmark-circle-outline',
  preparing: 'restaurant-outline',
  on_the_way: 'bicycle-outline',
  delivered: 'checkmark-done-circle-outline',
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = async () => {
    try {
      const response = await apiClient.get(`/orders/${id}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await fetchOrder();
    setIsLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrder();
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    if (id) {
      loadData();
      // Poll for updates every 30 seconds
      const interval = setInterval(fetchOrder, 30000);
      return () => clearInterval(interval);
    }
  }, [id]);

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    const index = statusSteps.indexOf(order.status);
    return index >= 0 ? index : 0;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStep = getCurrentStepIndex();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Order Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIconContainer}>
              <Ionicons
                name={statusIcons[order.status] as any}
                size={32}
                color={COLORS.white}
              />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>{statusLabels[order.status]}</Text>
              <Text style={styles.statusSubtitle}>
                {order.status === 'delivered'
                  ? 'Your order has been delivered'
                  : order.status === 'on_the_way'
                  ? 'Your rider is on the way'
                  : order.status === 'preparing'
                  ? 'Restaurant is preparing your food'
                  : 'Your order is being processed'}
              </Text>
            </View>
          </View>

          {/* Progress Steps */}
          <View style={styles.progressContainer}>
            {statusSteps.map((step, index) => (
              <View key={step} style={styles.stepContainer}>
                <View style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepDot,
                      index <= currentStep && styles.stepDotActive,
                      index < currentStep && styles.stepDotCompleted,
                    ]}
                  >
                    {index < currentStep && (
                      <Ionicons name="checkmark" size={12} color={COLORS.white} />
                    )}
                  </View>
                  {index < statusSteps.length - 1 && (
                    <View
                      style={[
                        styles.stepLine,
                        index < currentStep && styles.stepLineActive,
                      ]}
                    />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    index <= currentStep && styles.stepLabelActive,
                  ]}
                >
                  {statusLabels[step]?.split(' ').slice(-1)[0]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Order Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Order ID</Text>
            <Text style={styles.infoValue}>{order.order_id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Placed on</Text>
            <Text style={styles.infoValue}>
              {format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Payment</Text>
            <Text style={[styles.infoValue, { color: COLORS.success }]}>
              {order.payment_status === 'completed' ? 'Paid' : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Restaurant */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Restaurant</Text>
          <TouchableOpacity
            style={styles.restaurantCard}
            onPress={() => router.push(`/restaurant/${order.restaurant_id}`)}
          >
            <Ionicons name="restaurant" size={24} color={COLORS.accent} />
            <Text style={styles.restaurantName}>{order.restaurant_name}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressCard}>
            <Ionicons name="location" size={24} color={COLORS.accent} />
            <Text style={styles.addressText}>{order.delivery_address}</Text>
          </View>
        </View>

        {/* Rider Info */}
        {order.rider && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Rider</Text>
            <View style={styles.riderCard}>
              <View style={styles.riderAvatar}>
                <Ionicons name="person-outline" size={24} color={COLORS.white} />
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{order.rider.name}</Text>
                <Text style={styles.riderVehicle}>
                  {order.rider.vehicle_type?.charAt(0).toUpperCase() + order.rider.vehicle_type?.slice(1) || 'Vehicle'}
                </Text>
              </View>
              <TouchableOpacity style={styles.callButton} onPress={() => {/* Call rider */}}>
                <Ionicons name="call-outline" size={20} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items.map((item, index) => (
            <View key={item.item_id + index} style={styles.itemRow}>
              <View style={styles.itemQuantity}>
                <Text style={styles.quantityText}>{item.quantity}x</Text>
              </View>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>
                ${(item.price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        {/* Payment Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${order.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>${order.delivery_fee.toFixed(2)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          {order.status === 'delivered' && (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => router.push(`/review/${order.restaurant_id}?order_id=${order.order_id}`)}
            >
              <Ionicons name="star-outline" size={20} color={COLORS.white} />
              <Text style={styles.reviewButtonText}>Write a Review</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={20} color={COLORS.accent} />
            <Text style={styles.helpButtonText}>Need Help?</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: COLORS.accent,
    margin: SIZES.md,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    ...SHADOWS.medium,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  statusIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 20,
    color: COLORS.white,
    ...FONTS.bold,
  },
  statusSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: COLORS.white,
  },
  stepDotCompleted: {
    backgroundColor: COLORS.success,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: COLORS.white,
  },
  stepLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLORS.white,
    ...FONTS.medium,
  },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  riderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 16,
    ...FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  riderVehicle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  section: {
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.md,
    marginBottom: SIZES.md,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
    marginBottom: SIZES.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  restaurantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundSecondary,
    padding: SIZES.md,
    borderRadius: SIZES.radiusSm,
  },
  restaurantName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.medium,
    marginLeft: SIZES.sm,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.backgroundSecondary,
    padding: SIZES.md,
    borderRadius: SIZES.radiusSm,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  itemQuantity: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.sm,
  },
  quantityText: {
    fontSize: 12,
    color: COLORS.accent,
    ...FONTS.semiBold,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SIZES.sm,
  },
  totalLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.bold,
  },
  totalValue: {
    fontSize: 18,
    color: COLORS.accent,
    ...FONTS.bold,
  },
  actionsContainer: {
    padding: SIZES.md,
    paddingBottom: SIZES.xl,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.md,
  },
  reviewButtonText: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.semiBold,
    marginLeft: SIZES.sm,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  helpButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    ...FONTS.semiBold,
    marginLeft: SIZES.sm,
  },
});
