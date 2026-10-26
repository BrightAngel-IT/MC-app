import React, { useRef, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

const DEFAULT = { latitude: 7.8731, longitude: 80.7718 };

// Leaflet + OpenStreetMap inside a WebView (works in APK without a Google Maps key)
const MapComponent = ({ selectedRegion, setSelectedRegion }) => {
  const webRef = useRef(null);
  const regionRef = useRef(selectedRegion);
  regionRef.current = selectedRegion;

  const init = useMemo(() => ({
    lat: selectedRegion?.latitude || DEFAULT.latitude,
    lng: selectedRegion?.longitude || DEFAULT.longitude,
  }), []);

  const html = useMemo(() => `
    <!DOCTYPE html><html><head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>body,html,#map{margin:0;padding:0;height:100%;width:100%;}</style>
    </head><body><div id="map"></div>
    <script>
      var map = L.map('map').setView([${init.lat}, ${init.lng}], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      var marker = L.marker([${init.lat}, ${init.lng}], { draggable: true }).addTo(map);
      function send(ll) { window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: ll.lat, longitude: ll.lng })); }
      map.on('click', function(e) { marker.setLatLng(e.latlng); send(e.latlng); });
      marker.on('dragend', function() { send(marker.getLatLng()); });
      window.setPos = function(lat, lng) {
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng], map.getZoom());
      };
    </script></body></html>
  `, [init]);

  useEffect(() => {
    if (webRef.current && selectedRegion?.latitude && selectedRegion?.longitude) {
      webRef.current.injectJavaScript(
        `window.setPos && window.setPos(${selectedRegion.latitude}, ${selectedRegion.longitude}); true;`
      );
    }
  }, [selectedRegion?.latitude, selectedRegion?.longitude]);

  const onMessage = (event) => {
    try {
      const { latitude, longitude } = JSON.parse(event.nativeEvent.data);
      setSelectedRegion({ ...regionRef.current, latitude, longitude });
    } catch (e) {}
  };

  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
      />
    </View>
  );
};

export default MapComponent;
