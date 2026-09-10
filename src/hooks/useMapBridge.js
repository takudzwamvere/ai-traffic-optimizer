import { useCallback, useRef } from 'react';

/**
 * Custom hook for safe communication with the map WebView.
 *
 * Provides a `sendToWebView()` function that transmits typed JSON messages
 * to the WebView via dispatchEvent, avoiding raw JS string injection.
 *
 * Also provides convenience methods for common map operations.
 *
 * @returns {object} WebView ref and messaging utilities
 */
export function useMapBridge() {
  const webViewRef = useRef(null);

  const sendToWebView = useCallback((msg) => {
    const js = `
      (function(){
        var e = new MessageEvent('message', { data: ${JSON.stringify(JSON.stringify(msg))} });
        window.dispatchEvent(e);
      })(); true;
    `;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const setUserLocation = useCallback((lat, lon) => {
    sendToWebView({ type: 'SET_USER_LOCATION', lat, lon });
  }, [sendToWebView]);

  const panToUser = useCallback((lat, lon) => {
    sendToWebView({ type: 'PAN_TO_USER', lat, lon });
  }, [sendToWebView]);

  const requestRoute = useCallback((origLat, origLon, destLat, destLon) => {
    sendToWebView({ type: 'ROUTE_REQUEST', origLat, origLon, destLat, destLon });
  }, [sendToWebView]);

  const drawRoute = useCallback((geoJson, destLat, destLon, routeColor) => {
    sendToWebView({ type: 'DRAW_ROUTE', geoJson, destLat, destLon, routeColor });
  }, [sendToWebView]);

  const applyMapStyle = useCallback((mapStyle) => {
    sendToWebView({ type: 'APPLY_MAP_STYLE', stylesJson: JSON.stringify(mapStyle) });
  }, [sendToWebView]);

  return {
    webViewRef,
    sendToWebView,
    setUserLocation,
    panToUser,
    requestRoute,
    drawRoute,
    applyMapStyle,
  };
}
