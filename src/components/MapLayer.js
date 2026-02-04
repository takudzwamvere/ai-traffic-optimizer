import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { getMapHtml } from '../utils/mapHtml';

const MapLayer = forwardRef(({ origin, onLoadEnd }, ref) => {
  const mapHtml = getMapHtml(origin);

  return (
    <View style={styles.mapContainer}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={{ flex: 1 }}
        onLoadEnd={onLoadEnd}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  mapContainer: { flex: 1 },
});

export default MapLayer;
