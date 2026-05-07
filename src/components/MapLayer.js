import React, { forwardRef, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { getMapHtml } from '../utils/mapHtml';

const MapLayer = forwardRef(({ origin, onLoadEnd, onTilesLoaded, onRouteResult, onAutocompleteResult, onPlaceDetailsResult }, ref) => {
  // Memoize the HTML so the WebView doesn't reload on every GPS update
  const mapHtml = useMemo(() => getMapHtml(origin), []);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_TILES_LOADED' && onTilesLoaded) onTilesLoaded();
      if (data.type === 'ROUTE_RESULT' && onRouteResult) onRouteResult(data);
      if (data.type === 'AUTOCOMPLETE_RESULT' && onAutocompleteResult) onAutocompleteResult(data);
      if (data.type === 'PLACE_DETAILS_RESULT' && onPlaceDetailsResult) onPlaceDetailsResult(data);
    } catch (e) {}
  };

  return (
    <View style={styles.mapContainer}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html: mapHtml, baseUrl: '' }}
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
