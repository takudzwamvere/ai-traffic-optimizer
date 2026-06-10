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
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; background-color: #000; }
    #map {
      height: 100vh;
      width: 100vw;
      display: block;
      transition: opacity 0.4s ease-in-out;
      box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.85);
    }
    .leaflet-div-icon { background: transparent; border: none; }

    /* Custom Control Styling */
    .leaflet-control-layers {
      border: none !important;
      border-radius: 12px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 6px !important;
    }
    .leaflet-control-layers-toggle {
      width: 44px !important;
      height: 44px !important;
    }
    .leaflet-touch .leaflet-control-layers-toggle {
      width: 44px;
      height: 44px;
    }
    .leaflet-control-layers-list {
      font-size: 14px;
      padding: 5px;
    }
    .leaflet-control-layers-base label {
      margin-bottom: 5px;
      display: flex;
      align-items: center;
    }
    .leaflet-control-layers-base input {
      margin-right: 8px;
    }

    /* Position the control below the React Native Search Bar (approx 180px) */
    .leaflet-top {
      top: 180px !important;
    }
    /* Make the toggle button larger and more "button-like" for mobile */
    .leaflet-control-layers-toggle {
      width: 48px !important;
      height: 48px !important;
      background-size: 30px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      border-radius: 50% !important; /* Circle shape like Google Maps FAB */
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map;
    var routeLayers = [];
    var userMarker;
    var userMarkerGlow;
    var startMarker; // Legacy/compatibility placeholder for start position
    var endMarker;
    var directionsService;
    var autocompleteService;
    var geocoder;
    var placesService;
    var googleStreets, googleHybrid, darkMatter, voyager, esriSat;

    var flagIcon = L.divIcon({
      className: 'custom-flag-icon',
      html: '<div style="font-size: 36px; filter: drop-shadow(1px 2px 3px black);">🏁</div>',
      iconSize: [40, 40],
      iconAnchor: [10, 35]
    });

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

      // 1. Google Streets (The "Google-like" layer)
      googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      });

      // 2. Google Hybrid (Satellite + Labels)
      googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      });

      // 3. CartoDB Dark Matter (Sleek Dark Mode)
      darkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy;OpenStreetMap, &copy;CartoDB',
        maxZoom: 20
      });

      // 4. CartoDB Voyager (Clean, Pastel, Navigation-friendly)
      voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy;OpenStreetMap, &copy;CartoDB',
        maxZoom: 20
      });

      // 5. Esri World Imagery (High Quality Satellite)
      esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri',
        maxZoom: 19
      });

      // Initialize Map with "Google Streets" as default
      map = L.map('map', {
        zoomControl: false,
        renderer: L.canvas(),
        layers: [googleStreets] // Default layer
      }).setView([initLat, initLng], 13);

      // Layer Control
      var baseMaps = {
        "Google Streets": googleStreets,
        "Google Hybrid": googleHybrid,
        "Midnight Commander": darkMatter,
        "Voyager": voyager,
        "Esri Satellite": esriSat
      };

      L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

      // Monkey-patch map.panTo to support Google-style { lat, lng } or { lat, lon }
      var originalPanTo = map.panTo;
      map.panTo = function(latLng, options) {
        if (latLng && typeof latLng === 'object' && !Array.isArray(latLng)) {
          var lat = latLng.lat;
          var lng = latLng.lng !== undefined ? latLng.lng : latLng.lon;
          return originalPanTo.call(this, [lat, lng], options);
        }
        return originalPanTo.call(this, latLng, options);
      };

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
      var pos = [lat, lon];
      if (userMarker) {
        userMarker.setLatLng(pos);
        if (userMarkerGlow) userMarkerGlow.setLatLng(pos);
      } else {
        // Glowing halo layer underneath
        userMarkerGlow = L.circleMarker(pos, {
          radius: 18,
          fillColor: '#007AFF',
          fillOpacity: 0.2,
          stroke: false,
          interactive: false
        }).addTo(map);

        userMarker = L.circleMarker(pos, {
          radius: 9,
          fillColor: '#007AFF',
          fillOpacity: 1,
          color: '#ffffff',
          weight: 3,
          opacity: 1,
          interactive: false
        }).addTo(map);
      }
    }

    // Pan map to the user location (called from "Locate Me" FAB)
    function panToUserLocation(lat, lon) {
      if (!map) return;
      map.setView([lat, lon], 16);
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

    // Helper to resolve segment color to hex code
    function getSegmentColor(color) {
      var c = '#34A853'; // Default Green (flowing)
      if (color) {
        var lc = color.toLowerCase();
        if (lc === '#ffc107' || lc === '#fbbc04' || lc === '#fb8c00' || lc === 'yellow') {
          c = '#FBBC04';
        } else if (lc === '#f44336' || lc === '#ea4335' || lc === '#ff3b30' || lc === 'red') {
          c = '#EA4335';
        } else if (color.startsWith('#')) {
          c = color;
        }
      }
      return c;
    }

    // Draw colored route polylines from AI-segmented GeoJSON
    function drawRoute(geoJson, destLat, destLon, routeColor) {
      clearRoute();

      if (!map) return;

      // TODO: Place destination endMarker (Commit 21)

      var latLngs = [];

      if (geoJson.properties && geoJson.properties.segments && geoJson.properties.segments.length > 0) {
        var segments = geoJson.properties.segments;

        // Commit 17: Render outer lines first (shadow / outer glow)
        segments.forEach(function(segment) {
          var path = segment.coordinates;
          path.forEach(function(c) {
            latLngs.push([c[0], c[1]]);
          });
          var color = getSegmentColor(segment.color);
          var polyOuter = L.polyline(path, {
            color: color,
            opacity: GLOW_OUTER_OPACITY,
            weight: GLOW_OUTER_WEIGHT,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);
          routeLayers.push(polyOuter);
        });

        // Commit 18: Render mid-glow lines (medium glow)
        segments.forEach(function(segment) {
          var path = segment.coordinates;
          var color = getSegmentColor(segment.color);
          var polyMid = L.polyline(path, {
            color: color,
            opacity: GLOW_MID_OPACITY,
            weight: GLOW_MID_WEIGHT,
            lineCap: 'round',
            lineJoin: 'round'
          }).addTo(map);
          routeLayers.push(polyMid);
        });

        // TODO: Commit 19: Render core solid lines
      } else if (geoJson.geometry && geoJson.geometry.coordinates) {
        // TODO: Commit 20: Fallback single color route
      }

      // TODO: Commit 21: Extend bounds and fitBounds
    }

    function clearRoute() {
      routeLayers.forEach(function(l) { map.removeLayer(l); });
      routeLayers = [];
      if (endMarker) { map.removeLayer(endMarker); endMarker = null; }
    }
  </script>
  <script
    src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initMap&loading=async"
    async defer
  ></script>
</body>
</html>
`;
