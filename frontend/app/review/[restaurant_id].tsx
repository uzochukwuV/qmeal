import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StarRating } from '../../src/components/StarRating';
import apiClient from '../../src/api/client';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../src/constants/theme';

export default function WriteReviewScreen() {
  const { restaurant_id, order_id } = useLocalSearchParams<{
    restaurant_id: string;
    order_id?: string;
  }>();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Error', 'Please select a rating');
      return;
    }
    if (comment.trim().length < 10) {
      Alert.alert('Error', 'Please write at least 10 characters');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.post('/reviews', {
        restaurant_id,
        rating,
        comment: comment.trim(),
      });

      Alert.alert('Thank You!', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error submitting review:', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Write a Review</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Rating Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How was your experience?</Text>
            <Text style={styles.sectionSubtitle}>
              Tap the stars to rate
            </Text>
            <View style={styles.ratingContainer}>
              <StarRating
                rating={rating}
                size={40}
                editable={true}
                onRatingChange={setRating}
              />
            </View>
            {rating > 0 && (
              <Text style={styles.ratingText}>
                {rating === 5
                  ? 'Excellent!'
                  : rating === 4
                  ? 'Very Good'
                  : rating === 3
                  ? 'Good'
                  : rating === 2
                  ? 'Fair'
                  : 'Poor'}
              </Text>
            )}
          </View>

          {/* Comment Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tell us more</Text>
            <Text style={styles.sectionSubtitle}>
              Share details about your experience
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="What did you like or dislike? How was the food quality and delivery?"
              placeholderTextColor={COLORS.textTertiary}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>
              {comment.length}/500 characters
            </Text>
          </View>

          {/* Quick Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick feedback</Text>
            <View style={styles.tagsContainer}>
              {[
                'Great food',
                'Fast delivery',
                'Good packaging',
                'Friendly service',
                'Value for money',
              ].map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tag,
                    comment.includes(tag) && styles.tagActive,
                  ]}
                  onPress={() => {
                    if (comment.includes(tag)) {
                      setComment(comment.replace(tag + '. ', ''));
                    } else {
                      setComment((prev) => (prev ? prev + ' ' : '') + tag + '. ');
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.tagText,
                      comment.includes(tag) && styles.tagTextActive,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Submit Review</Text>
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
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeButton: {
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
  section: {
    backgroundColor: COLORS.card,
    marginHorizontal: SIZES.md,
    marginTop: SIZES.md,
    padding: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: 18,
    color: COLORS.textPrimary,
    ...FONTS.semiBold,
    marginBottom: SIZES.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  ratingContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.md,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.accent,
    ...FONTS.semiBold,
    marginTop: SIZES.sm,
  },
  textInput: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 120,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: SIZES.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  tag: {
    backgroundColor: COLORS.backgroundSecondary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagActive: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  tagText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  tagTextActive: {
    color: COLORS.accent,
    ...FONTS.medium,
  },
  footer: {
    padding: SIZES.md,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    ...FONTS.semiBold,
  },
});
