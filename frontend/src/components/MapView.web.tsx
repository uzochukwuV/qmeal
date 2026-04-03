import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Web placeholder for MapView - react-native-maps is not compatible with web
interface MapViewProps {
  style?: any;
  initialRegion?: any;
  children?: React.ReactNode;
}

export const MapViewComponent: React.FC<MapViewProps> = ({ style, children }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>Map not available on web</Text>
    </View>
  );
};

interface MarkerProps {
  coordinate?: any;
  title?: string;
  description?: string;
}

export const MarkerComponent: React.FC<MarkerProps> = () => null;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  text: {
    color: '#6B7280',
    fontSize: 14,
  },
});
