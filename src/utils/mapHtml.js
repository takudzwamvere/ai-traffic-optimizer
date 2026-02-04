const DEFAULT_COORDS = { lat: -20.1706, lon: 28.5583 };

export const getMapHtml = (defaultCoords = DEFAULT_COORDS) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; background-color: #000; }
    #map { height: 100vh; width: 100vw; }
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
    
    /* Position the control below the React Native Search Bar (approx 100px) */
    .leaflet-top {
      top: 100px !important;
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
    let map;
    let routeLayers = [];
    let startMarker;
    let endMarker;
    
    const flagIcon = L.divIcon({
      className: 'custom-flag-icon',
      html: '<div style="font-size: 36px; filter: drop-shadow(1px 2px 3px black);">🏁</div>',
      iconSize: [40, 40],
      iconAnchor: [10, 35]
    });

    function initMap() {
      // 1. Google Streets (The "Google-like" layer)
      const googleStreets = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      });

      // 2. Google Hybrid (Satellite + Labels)
      const googleHybrid = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      });

      // 3. CartoDB Dark Matter (Sleek Dark Mode)
      const darkMatter = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy;OpenStreetMap, &copy;CartoDB',
        maxZoom: 20
      });

      // 4. CartoDB Voyager (Clean, Pastel, Navigation-friendly)
      const voyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy;OpenStreetMap, &copy;CartoDB',
        maxZoom: 20
      });

      // 5. Esri World Imagery (High Quality Satellite) - Existing
      const esriSat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Esri',
        maxZoom: 19
      });

      // Initialize Map with "Google Streets" as default
      map = L.map('map', { 
        zoomControl: false, 
        renderer: L.canvas(),
        layers: [googleStreets] // Default layer
      }).setView([${defaultCoords.lat}, ${defaultCoords.lon}], 13);
      
      // Layer Control
      const baseMaps = {
        "Google Streets": googleStreets,
        "Google Hybrid": googleHybrid,
        "Midnight Commander": darkMatter,
        "Voyager": voyager,
        "Esri Satellite": esriSat
      };
      
      L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map);

      // Add Labels overlay for Satellite only if needed (Usually included in Hybrid, but kept for Esri)
      // We rely on Google Hybrid for labels on satellite mostly now.
    }

    function setUserLocation(lat, lon) {
      if (startMarker) map.removeLayer(startMarker);
      startMarker = L.circleMarker([lat, lon], {
        radius: 9, fillColor: "#007AFF", color: "#ffffff", weight: 3, opacity: 1, fillOpacity: 1
      }).addTo(map);
      map.setView([lat, lon], 14);
    }

    function drawRoute(geoJson, destLat, destLon, colorHex) {
      if (routeLayers.length > 0) {
        routeLayers.forEach(layer => map.removeLayer(layer));
        routeLayers = [];
      }
      
      if (endMarker) map.removeLayer(endMarker);
      endMarker = L.marker([destLat, destLon], { icon: flagIcon }).addTo(map);

      // Check if GeoJSON has "segments" property (our custom structure)
      if (geoJson.properties && geoJson.properties.segments) {
         geoJson.properties.segments.forEach(segment => {
            const layer = L.polyline(segment.coordinates, {
              color: segment.color, // Green/Yellow/Red
              weight: 5,
              opacity: 0.9,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(map);
            routeLayers.push(layer);
         });
         
         // Fit bounds to the whole route (simplified)
         const allCoords = geoJson.properties.segments.flatMap(s => s.coordinates);
         if(allCoords.length > 0) map.fitBounds(allCoords, { padding: [80, 80] });

      } else {
        // Fallback for standard GeoJSON (single color)
        const layer = L.geoJSON(geoJson, {
          style: { 
            color: colorHex, 
            weight: 5, 
            opacity: 0.9, 
            lineCap: 'round',
            lineJoin: 'round'
          }
        }).addTo(map);
        routeLayers.push(layer);
        map.fitBounds(layer.getBounds(), { padding: [80, 80] });
      }
    }

    initMap();
  </script>
</body>
</html>
`;
