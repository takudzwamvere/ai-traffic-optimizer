const DEFAULT_COORDS = { lat: -17.8292, lon: 31.0522 };
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

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

      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_TILES_LOADED' }));
      }
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

    // Geocode a placeId to get coordinates
    function requestPlaceDetails(placeId, reqId) {
      geocoder.geocode({ placeId: placeId }, function(results, status) {
        if (status === 'OK' && results && results[0]) {
          var loc = results[0].geometry.location;
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'PLACE_DETAILS_RESULT',
            reqId: reqId,
            coords: { lat: loc.lat(), lon: loc.lng() }
          }));
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PLACE_DETAILS_RESULT', reqId: reqId, coords: null }));
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

          var poly = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 0.9,
            strokeWeight: 6
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
