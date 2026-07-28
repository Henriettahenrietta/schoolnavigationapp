import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors, categoryColors } from '../theme';
import { CAMPUS_REGION } from '../data/campus';

// The interactive outdoor map.
//
// It renders OpenStreetMap through Leaflet inside a WebView. This keeps the map
// faithful to the project's stated use of OpenStreetMap while needing no Google
// Maps billing account or API key, which matters for a standalone build.
// Buildings are shown as coloured markers; the user's current position and a
// route line to a chosen destination are drawn when provided.
//
// Accepted props (kept compatible with the calling screens):
//   markers          building-like objects: { id, latitude, longitude, name?, title?, category?, color? }
//   userLocation     { latitude, longitude } | null
//   routeCoordinates [{ latitude, longitude }, ...] | null
//   region /
//   initialRegion    { latitude, longitude, latitudeDelta, longitudeDelta }
//   selectedId       id of the marker to emphasise
//   onMarkerPress    (marker) => void   (called with the original marker object)
//   mapRef           accepted but unused (WebView map has no imperative handle)
export default function CampusMap({
  markers = [],
  userLocation = null,
  routeCoordinates = null,
  region,
  initialRegion,
  selectedId,
  onMarkerPress,
  style,
  // eslint-disable-next-line no-unused-vars
  mapRef,
}) {
  const center = initialRegion || region || CAMPUS_REGION;

  // Normalise markers so the WebView always receives title + colour.
  const normalized = useMemo(
    () =>
      markers.map((m) => ({
        id: m.id,
        latitude: m.latitude,
        longitude: m.longitude,
        title: m.title || m.name || '',
        color: m.color || categoryColors[m.category] || colors.primary,
        selected: m.id === selectedId,
      })),
    [markers, selectedId]
  );

  const html = useMemo(
    () => buildMapHtml({ markers: normalized, userLocation, routeCoordinates, center }),
    [normalized, userLocation, routeCoordinates, center]
  );

  function handleMessage(event) {
    const id = event.nativeEvent.data;
    if (!id || !onMarkerPress) return;
    const original = markers.find((m) => m.id === id);
    if (original) onMarkerPress(original);
  }

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        androidLayerType="hardware"
      />
    </View>
  );
}

function buildMapHtml({ markers, userLocation, routeCoordinates, center }) {
  const data = {
    markers: markers || [],
    userLocation: userLocation || null,
    route: routeCoordinates || null,
    center: [center.latitude, center.longitude],
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: ${colors.background}; }
    .pin {
      width: 18px; height: 18px; border-radius: 9px 9px 9px 1px;
      transform: rotate(45deg); border: 2px solid #fff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    .pin.selected { width: 24px; height: 24px; border-radius: 12px 12px 12px 1px; }
    .user-dot {
      width: 16px; height: 16px; border-radius: 8px;
      background: ${colors.primary}; border: 3px solid #fff;
      box-shadow: 0 0 0 4px rgba(31,111,235,0.25);
    }
    .leaflet-popup-content { font-family: -apple-system, Roboto, sans-serif; font-size: 13px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var D = ${json};
    var map = L.map('map', { zoomControl: true, attributionControl: true }).setView(D.center, 16);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var bounds = [];

    (D.markers || []).forEach(function (m) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="pin ' + (m.selected ? 'selected' : '') + '" style="background:' + (m.color || '#1f6feb') + '"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 18]
      });
      var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);
      marker.bindPopup('<b>' + (m.title || '') + '</b>');
      marker.on('click', function () {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(m.id);
      });
      bounds.push([m.latitude, m.longitude]);
    });

    if (D.userLocation) {
      var uIcon = L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
      L.marker([D.userLocation.latitude, D.userLocation.longitude], { icon: uIcon, zIndexOffset: 1000 })
        .addTo(map).bindPopup('You are here');
      bounds.push([D.userLocation.latitude, D.userLocation.longitude]);
    }

    if (D.route && D.route.length > 1) {
      var line = D.route.map(function (p) { return [p.latitude, p.longitude]; });
      L.polyline(line, { color: '${colors.primary}', weight: 4, opacity: 0.85, dashArray: '8,6' }).addTo(map);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 17 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 17);
    }
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: colors.background },
  webview: { flex: 1, backgroundColor: colors.background },
});
