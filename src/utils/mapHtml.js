const DEFAULT_COORDS = { lat: -17.8292, lon: 31.0522 };

export const getMapHtml = (defaultCoords = DEFAULT_COORDS) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://maps.googleapis.com/maps/api/js?key=${process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places,geometry"></script>
  <style>
    body { margin: 0; padding: 0; background-color: #000; }
    #map { height: 100vh; width: 100vw; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    let map;
    let routePolylines = [];
    let startMarker;
    let endMarker;
    
    let directionsService;
    let autocompleteService;
    let geocoder;

    function initMap() {
      // Initialize map based on default coordinates (fallback to Harare if missing)
      const initLat = ${defaultCoords.lat} || -17.8292;
      const initLng = ${defaultCoords.lon} || 31.0522;
      
      map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: initLat, lng: initLng },
        zoom: 13,
        disableDefaultUI: true,
      });

      directionsService = new google.maps.DirectionsService();
      autocompleteService = new google.maps.places.AutocompleteService();
      geocoder = new google.maps.Geocoder();

      // Tell React Native we are ready!
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'MAP_TILES_LOADED' }));
      }
    }

    // React Native invokes this when tracing active user location
    function setUserLocation(lat, lon) {
      if (startMarker) startMarker.setMap(null);
      startMarker = new google.maps.Marker({
        position: { lat: lat, lng: lon },
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: "#007AFF",
            fillOpacity: 1,
            strokeWeight: 3,
            strokeColor: "#ffffff"
        }
      });
      // Optionally recenter
      map.panTo({ lat: lat, lng: lon });
    }

    // Google Places Autocomplete API Search
    function requestAutocompleteSuggestions(query, reqId) {
      if (!query || query.length < 2) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOCOMPLETE_RESULT', reqId, results: [] }));
        return;
      }
      autocompleteService.getPlacePredictions({ 
        input: query, 
        componentRestrictions: { country: "zw" } 
      }, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          const results = predictions.map(p => ({
            name: p.structured_formatting.main_text,
            description: p.description,
            placeId: p.place_id
          }));
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOCOMPLETE_RESULT', reqId, results }));
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'AUTOCOMPLETE_RESULT', reqId, results: [] }));
        }
      });
    }

    // Geocoding details (to get exact coords from PlaceID)
    function requestPlaceDetails(placeId, reqId) {
      geocoder.geocode({ placeId: placeId }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          window.ReactNativeWebView.postMessage(JSON.stringify({ 
            type: 'PLACE_DETAILS_RESULT', 
            reqId, 
            coords: { lat: loc.lat(), lon: loc.lng() } 
          }));
        } else {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'PLACE_DETAILS_RESULT', reqId, coords: null }));
        }
      });
    }

    // Request Routes via Web service, then return to React Native Engine
    function requestGoogleRoute(origLat, origLon, destLat, destLon) {
      const request = {
        origin: { lat: origLat, lng: origLon },
        destination: { lat: destLat, lng: destLon },
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        drivingOptions: {
          departureTime: new Date(), 
          trafficModel: 'bestguess'
        }
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK' && result.routes) {
          // Serialize to format similar to OSRM mapping so the traffic Engine requires 0 edits.
          const serializedRoutes = result.routes.map(r => {
            const leg = r.legs[0];
            const routeDistance = leg.distance.value;
            // Use Google's Live Traffic as the Baseline Duration input into the AI Engine!
            const routeDuration = leg.duration_in_traffic ? leg.duration_in_traffic.value : leg.duration.value;
            
            const flatCoords = [];
            
            const steps = leg.steps.map(s => {
              // Convert paths to Array mapping [lon, lat] for processing
              const stepCoords = s.path.map(p => [p.lng(), p.lat()]);
              stepCoords.forEach(c => flatCoords.push(c));
              
              return {
                distance: s.distance.value,
                duration: s.duration_in_traffic ? s.duration_in_traffic.value : s.duration.value,
                geometry: { coordinates: stepCoords },
                name: (s.instructions || "").replace(/(<([^>]+)>)/gi, "")
              };
            });
            
            return {
              distance: routeDistance,
              duration: routeDuration,
              geometry: { coordinates: flatCoords },
              legs: [{ steps }]
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

    // Called back from React Native after AI color logic applies to segments
    function drawRoute(geoJson, destLat, destLon) {
      clearRoute();
      
      endMarker = new google.maps.Marker({
        position: { lat: destLat, lng: destLon },
        map: map,
        label: '🏁'
      });

      const bounds = new google.maps.LatLngBounds();

      // Read segments computed from AI Traffic Engine
      if (geoJson.properties && geoJson.properties.segments) {
        geoJson.properties.segments.forEach(segment => {
          const path = segment.coordinates.map(c => {
             // Revert [lat, lon] output of route segment extraction back to LatLng Map Format
             const p = { lat: c[0], lng: c[1] }; 
             bounds.extend(p);
             return p;
          });
          
          let color = '#34A853'; // Default Green (flowing)
          const lowerColor = segment.color ? segment.color.toLowerCase() : '';
          if (lowerColor === '#fb8c00' || lowerColor === '#fbbc04' || lowerColor === 'yellow') color = '#FBBC04';
          if (lowerColor === '#ff3b30' || lowerColor === '#ea4335' || lowerColor === 'red') color = '#EA4335';
          if (segment.color && segment.color.startsWith('#')) color = segment.color; // Accept mapped Hex directly
          
          const poly = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: color,
            strokeOpacity: 0.9,
            strokeWeight: 5
          });
          poly.setMap(map);
          routePolylines.push(poly);
        });
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { top: 80, bottom: 80, left: 80, right: 80 });
      }
    }

    function clearRoute() {
      routePolylines.forEach(p => p.setMap(null));
      routePolylines = [];
      if (endMarker) endMarker.setMap(null);
    }

    google.maps.event.addDomListener(window, 'load', initMap);
  </script>
</body>
</html>
