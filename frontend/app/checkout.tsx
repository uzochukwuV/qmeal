import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../src/store/cartStore';
import apiClient from '../src/api/client';
import { COLORS, SIZES, FONTS, SHADOWS } from '../src/constants/theme';

export default function CheckoutScreen() {
  const router = useRouter();
  const { items, restaurant_id, restaurant_name, getTotal, clearCart } = useCartStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [tip, setTip] = useState(0);
  const [stripeConfig, setStripeConfig] = useState<{ publishable_key: string; is_mock: boolean } | null>(null);

  const subtotal = getTotal();
  const deliveryFee = 2.99;
  const serviceFee = 1.49;
  const total = subtotal + deliveryFee + serviceFee + tip;

  const tipOptions = [0, 2, 3, 5];

  useEffect(() => {
    // Fetch Stripe config
    const fetchStripeConfig = async () => {
      try {
        const response = await apiClient.get('/payments/config');
        setStripeConfig(response.data);
      } catch (error) {
        console.error('Error fetching Stripe config:', error);
      }
    };
    fetchStripeConfig();
  }, []);

  const handlePlaceOrder = async () => {
    if (!deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter a delivery address');
      return;
    }

    setIsLoading(true);
    try {
      // If using card payment, create payment intent first
      let paymentMethodId = null;
      if (paymentMethod === 'card') {
        try {
          const intentResponse = await apiClient.post('/payments/create-intent', {
            amount: total,
            currency: 'usd',
          });
          
          // In production, you would use Stripe SDK to confirm the payment
          // For demo, we'll proceed with the mock payment
          if (intentResponse.data.mock) {
            console.log('Using mock payment:', intentResponse.data.payment_intent_id);
          }
          paymentMethodId = intentResponse.data.payment_intent_id;
        } catch (paymentError) {
          console.error('Payment intent error:', paymentError);
          // Continue with order anyway for demo
        }
      }

      // Create order
      await apiClient.post('/orders', {
        restaurant_id,
        restaurant_name,
        items: items.map((item) => ({
          item_id: item.item_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          restaurant_id: item.restaurant_id,
        })),
        subtotal,
        delivery_fee: deliveryFee,
        total: total,
        delivery_address: deliveryAddress,
        payment_method_id: paymentMethodId,
      });

      clearCart();
      Alert.alert(
        'Order Placed!',
        'Your order has been placed successfully. You will receive notifications about your order status.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/orders'),
          },
        ]
      );
    } catch (error) {
      console.error('Error placing order:', error);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Delivery Address */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={22} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Delivery Address</Text>
            </View>
            <TextInput
              style={styles.addressInput}
              placeholder="Enter your delivery address"
              placeholderTextColor={COLORS.textTertiary}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              multiline
            />
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={22} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Payment Method</Text>
            </View>
            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'card' && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod('card')}
              >
                <View style={styles.paymentIconContainer}>
                  <Ionicons
                    name="card"
                    size={24}
                    color={paymentMethod === 'card' ? COLORS.accent : COLORS.textSecondary}
                  />
                </View>
                <View style={styles.paymentTextContainer}>
                  <Text
                    style={[
                      styles.paymentText,
                      paymentMethod === 'card' && styles.paymentTextActive,
                    ]}
                  >
                    Credit/Debit Card
                  </Text>
                  {stripeConfig?.is_mock && (
                    <Text style={styles.mockBadge}>Demo Mode</Text>
                  )}
                </View>
                {paymentMethod === 'card' && (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'cash' && styles.paymentOptionActive,
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <View style={styles.paymentIconContainer}>
                  <Ionicons
                    name="cash"
                    size={24}
                    color={paymentMethod === 'cash' ? COLORS.accent : COLORS.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.paymentText,
                    paymentMethod === 'cash' && styles.paymentTextActive,
                  ]}
                >
                  Cash on Delivery
                </Text>
                {paymentMethod === 'cash' && (
                  <Ionicons name="checkmark-circle" size={22} color={COLORS.accent} />
                )}
              </TouchableOpacity>
            </View>
            
            {/* Stripe Notice */}
            {paymentMethod === 'card' && stripeConfig?.is_mock && (
              <View style={styles.paymentNotice}>
                <Ionicons name="information-circle-outline" size={18} color={COLORS.warning} />
                <Text style={styles.paymentNoticeText}>
                  Stripe integration is in demo mode. Add real API keys for production payments.
                </Text>
              </View>
            )}
          </View>

          {/* Tip */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart-outline" size={22} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Add a tip</Text>
            </View>
            <View style={styles.tipOptions}>
              {tipOptions.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.tipOption,
                    tip === amount && styles.tipOptionActive,
                  ]}
                  onPress={() => setTip(amount)}
                >
                  <Text
                    style={[
                      styles.tipText,
                      tip === amount && styles.tipTextActive,
                    ]}
                  >
                    {amount === 0 ? 'None' : `$${amount}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt-outline" size={22} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Order Summary</Text>
            </View>
            <View style={styles.summaryContent}>
              {items.map((item) => (
                <View key={item.item_id} style={styles.summaryItem}>
                  <Text style={styles.summaryItemName}>
                    {item.quantity}x {item.name}
                  </Text>
                  <Text style={styles.summaryItemPrice}>
                    ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={styles.summaryValue}>${deliveryFee.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service Fee</Text>
                <Text style={styles.summaryValue}>${serviceFee.toFixed(2)}</Text>
              </View>
              {tip > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tip</Text>
                  <Text style={styles.summaryValue}>${tip.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Place Order Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.placeOrderButton, isLoading && styles.buttonDisabled]}
            onPress={handlePlaceOrder}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.placeOrderText}>Place Order</Text>
                <Text style={styles.placeOrderTotal}>${total.toFixed(2)}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.md,
    marginTop: SIZES.md,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.small,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
    marginLeft: SIZES.sm,
  },
  addressInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  paymentOptions: {
    gap: SIZES.sm,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.radiusSm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  paymentTextContainer: {
    flex: 1,
  },
  paymentText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.medium,
    flex: 1,
  },
  paymentTextActive: {
    color: COLORS.textPrimary,
  },
  mockBadge: {
    fontSize: 10,
    color: COLORS.warning,
    ...FONTS.medium,
    marginTop: 2,
  },
  paymentNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: SIZES.md,
    padding: SIZES.sm,
    backgroundColor: '#FEF3C7',
    borderRadius: SIZES.radiusSm,
  },
  paymentNoticeText: {
    fontSize: 12,
    color: COLORS.warning,
    marginLeft: SIZES.sm,
    flex: 1,
    lineHeight: 18,
  },
  tipOptions: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  tipOption: {
    flex: 1,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.radiusSm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tipOptionActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentLight,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    ...FONTS.medium,
  },
  tipTextActive: {
    color: COLORS.accent,
    ...FONTS.semiBold,
  },
  summaryContent: {},
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  summaryItemName: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  summaryItemPrice: {
    fontSize: 14,
    color: COLORS.textPrimary,
    ...FONTS.medium,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SIZES.sm,
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
  footer: {
    padding: SIZES.md,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  placeOrderButton: {
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    borderRadius: SIZES.radiusMd,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  placeOrderText: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.semiBold,
  },
  placeOrderTotal: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.bold,
  },
});
