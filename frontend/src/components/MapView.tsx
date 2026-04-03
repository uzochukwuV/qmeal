import React from 'react';
import NativeMapView, { Marker } from 'react-native-maps';

// Native platform MapView using react-native-maps
interface MapViewProps {
  style?: any;
  initialRegion?: any;
  children?: React.ReactNode;
}

export const MapViewComponent: React.FC<MapViewProps> = ({ style, initialRegion, children }) => {
  return (
    <NativeMapView style={style} initialRegion={initialRegion}>
      {children}
    </NativeMapView>
  );
};

export const MarkerComponent = Marker;
