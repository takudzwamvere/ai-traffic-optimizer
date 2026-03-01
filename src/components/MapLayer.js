import React, { forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { getMapHtml } from '../utils/mapHtml';

const MapLayer = forwardRef(({ origin, onLoadEnd, onTilesLoaded }, ref) => {
  const mapHtml = getMapHtml(origin);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_TILES_LOADED' && onTilesLoaded) {
        onTilesLoaded();
      }
    } catch (e) {}
  };

  return (
    <View style={styles.mapContainer}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html: mapHtml }}
        style={{ flex: 1 }}
        onLoadEnd={onLoadEnd}
        onMessage={handleMessage}
        javaScriptEnabled={true}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  mapContainer: { flex: 1 },
});

export default MapLayer;
