import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  editable?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxRating = 5,
  size = 20,
  editable = false,
  onRatingChange,
}) => {
  const handlePress = (index: number) => {
    if (editable && onRatingChange) {
      onRatingChange(index + 1);
    }
  };

  const renderStar = (index: number) => {
    const filled = index < Math.floor(rating);
    const halfFilled = !filled && index < rating;

    const starIcon = filled
      ? 'star'
      : halfFilled
      ? 'star-half'
      : 'star-outline';

    const Star = (
      <Ionicons
        key={index}
        name={starIcon}
        size={size}
        color={COLORS.star}
        style={styles.star}
      />
    );

    if (editable) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => handlePress(index)}
          hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
        >
          {Star}
        </TouchableOpacity>
      );
    }

    return Star;
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxRating }).map((_, index) => renderStar(index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
});
