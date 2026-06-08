// Default to Bulawayo — matches App.js DEFAULT_COORDS
const DEFAULT_COORDS = { lat: -20.1706, lon: 28.5583 };
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!GOOGLE_MAPS_API_KEY) {
  console.warn('[mapHtml] EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set. The map will not load.');
}

export const getMapHtml = (defaultCoords = DEFAULT_COORDS) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background-color: #000; }
    #map { height: 100vh; width: 100vw; display: block; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    var routePolylines = [];
    var userMarker;
    var endMarker;
    var directionsService;
    var autocompleteService;
    var geocoder;
    var placesService;

    // Glowing polyline heatmap configuration
    var GLOW_OUTER_OPACITY = 0.15;
    var GLOW_MID_OPACITY = 0.35;
    var GLOW_CORE_OPACITY = 1.0;
    var GLOW_OUTER_WEIGHT = 16;
    var GLOW_MID_WEIGHT = 10;
    var GLOW_CORE_WEIGHT = 5;

    function initMap() {
      var initLat = ${defaultCoords?.lat ?? -17.8292};
      var initLng = ${defaultCoords?.lon ?? 31.0522};

      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: initLat, lng: initLng },
        zoom: 13,
        disableDefaultUI: true,
        gestureHandling: 'greedy',
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'simplified' }] }
        ]
      });

      directionsService = new google.maps.DirectionsService();
      autocompleteService = new google.maps.places.AutocompleteService();
      geocoder = new google.maps.Geocoder();
      placesService = new google.maps.places.PlacesService(map);

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_TILES_LOADED' }));
      }

      // ── Safe message channel from React Native ──────────────────────────
      // React Native sends typed JSON messages via window.dispatchEvent so
      // that user-supplied strings are never interpolated into JS code.
      window.addEventListener('message', function(event) {
        var msg;
        try { msg = JSON.parse(event.data); } catch(e) { return; }
        if (!msg || !msg.type) return;

        if (msg.type === 'AUTOCOMPLETE') {
          requestAutocompleteSuggestions(msg.query, msg.reqId);
        } else if (msg.type === 'PLACE_DETAILS') {
          requestPlaceDetails(msg.placeId, msg.reqId);
        }
      });
    }

    // Called from React Native when the user changes theme
    function applyMapStyle(stylesJson) {
      if (!map) return;
      try {
        map.setOptions({ styles: JSON.parse(stylesJson) });
      } catch(e) {}
    }

    // Called from React Native to update the blue user-location dot
    function setUserLocation(lat, lon) {
      if (!map) return;
      var pos = { lat: lat, lng: lon };
      if (userMarker) {
        userMarker.setPosition(pos);
      } else {
        userMarker = new google.maps.Marker({
          position: pos,
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#007AFF',
            fillOpacity: 1,
            strokeWeight: 3,
            strokeColor: '#ffffff'
          },
          zIndex: 999
        });
      }
    }

    // Pan map to the user location (called from "Locate Me" FAB)
    function panToUserLocation(lat, lon) {
      if (!map) return;
      map.panTo({ lat: lat, lng: lon });
      map.setZoom(16);
    }

    // Google Places Autocomplete
    function requestAutocompleteSuggestions(query, reqId) {
      if (!query || query.length < 2) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOCOMPLETE_RESULT', reqId: reqId, results: [] }));
        return;
      }
      autocompleteService.getPlacePredictions({
        input: query,
        componentRestrictions: { country: 'zw' }
      }, function(predictions, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          var seenIds = new Set();
          var results = [];
          
          predictions.forEach(function(p) {
            if (!seenIds.has(p.place_id)) {
              seenIds.add(p.place_id);
              results.push({
                name: p.structured_formatting.main_text,
                description: p.description,
                placeId: p.place_id
              });
            }
          });
          
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOCOMPLETE_RESULT', reqId: reqId, results: results }));
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOCOMPLETE_RESULT', reqId: reqId, results: [] }));
        }
      });
    }

    function requestPlaceDetails(placeId, reqId) {
      if (!placesService) return;
      placesService.getDetails({ placeId: placeId, fields: ['geometry'] }, function(place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
          var loc = place.geometry.location;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLACE_DETAILS_RESULT',
            reqId: reqId,
            coords: { lat: loc.lat(), lon: loc.lng() }
          }));
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PLACE_DETAILS_RESULT', reqId: reqId, coords: null, error: status }));
        }
      });
    }

    // Request routes via Google Directions Service (returns data to React Native AI engine)
    function requestGoogleRoute(origLat, origLon, destLat, destLon) {
      if (!directionsService) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ROUTE_RESULT', routes: [], error: 'NOT_READY' }));
        return;
      }

      var request = {
        origin: { lat: origLat, lng: origLon },
        destination: { lat: destLat, lng: destLon },
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: 'bestguess'
        }
      };

      directionsService.route(request, function(result, status) {
        if (status === 'OK' && result.routes && result.routes.length > 0) {
          var serializedRoutes = result.routes.map(function(r) {
            var leg = r.legs[0];
            var routeDistance = leg.distance.value;
            var routeDuration = leg.duration_in_traffic
              ? leg.duration_in_traffic.value
              : leg.duration.value;

            var flatCoords = [];
            var steps = leg.steps.map(function(s) {
              var stepCoords = s.path ? s.path.map(function(p) { return [p.lng(), p.lat()]; }) : [];
              stepCoords.forEach(function(c) { flatCoords.push(c); });
              return {
                distance: s.distance.value,
                duration: s.duration_in_traffic
                  ? s.duration_in_traffic.value
                  : s.duration.value,
                geometry: { coordinates: stepCoords },
                name: (s.instructions || '').replace(/(<([^>]+)>)/gi, '')
              };
            });

            return {
              distance: routeDistance,
              duration: routeDuration,
              geometry: { coordinates: flatCoords },
              legs: [{ steps: steps }]
            };
          });

          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ROUTE_RESULT',
            routes: serializedRoutes
          }));
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'ROUTE_RESULT',
            routes: [],
            error: status
          }));
        }
      });
    }

    // Draw colored route polylines from AI-segmented GeoJSON
    function drawRoute(geoJson, destLat, destLon, routeColor) {
      clearRoute();

      if (!map) return;

      // Destination marker
      endMarker = new google.maps.Marker({
        position: { lat: destLat, lng: destLon },
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: routeColor || '#EA4335',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#ffffff'
        },
        zIndex: 100
      });

      var bounds = new google.maps.LatLngBounds();

      if (geoJson.properties && geoJson.properties.segments && geoJson.properties.segments.length > 0) {
        geoJson.properties.segments.forEach(function(segment) {
          var path = segment.coordinates.map(function(c) {
            // Segments stored as [lat, lon] by routeHelpers
            var p = { lat: c[0], lng: c[1] };
            bounds.extend(p);
            return p;
          });

          var color = '#34A853'; // Green default
          if (segment.color) {
            var lc = segment.color.toLowerCase();
            if (lc === '#ffc107' || lc === '#fbbc04' || lc === '#fb8c00' || lc === 'yellow') {
              color = '#FBBC04';
            } else if (lc === '#f44336' || lc === '#ea4335' || lc === '#ff3b30' || lc === 'red') {
              color = '#EA4335';
            } else if (segment.color.startsWith('#')) {
              color = segment.color;
            }
          }

          var polyOuter = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: GLOW_OUTER_OPACITY,
            strokeWeight: GLOW_OUTER_WEIGHT,
            zIndex: 1
          });
          polyOuter.setMap(map);
          routePolylines.push(polyOuter);

          var polyMid = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: GLOW_MID_OPACITY,
            strokeWeight: GLOW_MID_WEIGHT,
            zIndex: 2
          });
          polyMid.setMap(map);
          routePolylines.push(polyMid);

          var poly = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: GLOW_CORE_OPACITY,
            strokeWeight: GLOW_CORE_WEIGHT,
            zIndex: 3
          });
          poly.setMap(map);
          routePolylines.push(poly);
        });
      } else if (geoJson.geometry && geoJson.geometry.coordinates) {
        // Fallback: draw the full route as a single color line
        var fallbackPath = geoJson.geometry.coordinates.map(function(c) {
          var p = { lat: c[1], lng: c[0] };
          bounds.extend(p);
          return p;
        });
        var fallbackPoly = new google.maps.Polyline({
          path: fallbackPath,
          geodesic: true,
          strokeColor: routeColor || '#4CAF50',
          strokeOpacity: 0.85,
          strokeWeight: 6
        });
        fallbackPoly.setMap(map);
        routePolylines.push(fallbackPoly);
      }

      // Also extend bounds with destination
      bounds.extend({ lat: destLat, lng: destLon });

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { top: 120, bottom: 120, left: 60, right: 60 });
      }
    }

    function clearRoute() {
      routePolylines.forEach(function(p) { p.setMap(null); });
      routePolylines = [];
      if (endMarker) { endMarker.setMap(null); endMarker = null; }
    }
  </script>
  <script
    src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initMap&loading=async"
    async defer
  ></script>
</body>
</html>
`;
