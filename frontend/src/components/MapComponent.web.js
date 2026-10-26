import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';

const MapComponent = ({ selectedRegion, setSelectedRegion, serviceRadius, isAvailable }) => {
  const { colors } = useTheme();
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const radiusCircle = useRef(null);

  useEffect(() => {
    // Load Leaflet CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load Leaflet JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.async = true;
    script.onload = () => {
      if (window.L && mapRef.current && !leafletMap.current) {
        const L = window.L;
        const lat = selectedRegion?.latitude || 7.8731;
        const lng = selectedRegion?.longitude || 80.7718;
        
        leafletMap.current = L.map(mapRef.current).setView([lat, lng], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(leafletMap.current);

        leafletMap.current.on('moveend', () => {
          const center = leafletMap.current.getCenter();
          setSelectedRegion({
            latitude: center.lat,
            longitude: center.lng,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1
          });
        });
        
        updateCircle(L);
      }
    };
    document.body.appendChild(script);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
      if (radiusCircle.current) {
        radiusCircle.current = null;
      }
      try {
        document.head.removeChild(link);
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, []);

  // Update center when search happens or region changes externally
  useEffect(() => {
    if (leafletMap.current && window.L && selectedRegion) {
      const currentCenter = leafletMap.current.getCenter();
      // Only pan if it changed significantly to avoid feedback loops
      if (Math.abs(currentCenter.lat - selectedRegion.latitude) > 0.001 || 
          Math.abs(currentCenter.lng - selectedRegion.longitude) > 0.001) {
        leafletMap.current.setView([selectedRegion.latitude, selectedRegion.longitude], leafletMap.current.getZoom());
      }
    }
  }, [selectedRegion?.latitude, selectedRegion?.longitude]);

  // Handle Circle updates
  const updateCircle = (L) => {
    if (!leafletMap.current) return;
    
    // Remove existing
    if (radiusCircle.current) {
      leafletMap.current.removeLayer(radiusCircle.current);
      radiusCircle.current = null;
    }
    
    if (isAvailable && serviceRadius && !isNaN(parseFloat(serviceRadius))) {
      const lat = selectedRegion?.latitude || 7.8731;
      const lng = selectedRegion?.longitude || 80.7718;
      
      radiusCircle.current = L.circle([lat, lng], {
        color: 'rgba(0, 150, 255, 0.5)',
        fillColor: 'rgba(0, 150, 255, 0.2)',
        fillOpacity: 0.5,
        radius: parseFloat(serviceRadius) * 1000,
        weight: 2
      }).addTo(leafletMap.current);
    }
  };

  useEffect(() => {
    if (window.L) {
      updateCircle(window.L);
    }
  }, [selectedRegion, serviceRadius, isAvailable]);

  return (
    <View style={{ flex: 1 }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', outline: 'none' }} />
      <View style={{ position: 'absolute', top: '50%', left: '50%', marginLeft: -15, marginTop: -30, zIndex: 1000, pointerEvents: 'none' }}>
        <Ionicons name="location" size={30} color={colors.primary} />
      </View>
    </View>
  );
};

export default MapComponent;
