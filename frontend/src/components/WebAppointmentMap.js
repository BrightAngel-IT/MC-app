import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

const WebAppointmentMap = ({ docLocation, patientLocation, patientName }) => {
  if (Platform.OS !== 'web') return null;
  const mapRef = useRef(null);
  const leafletMap = useRef(null);

  useEffect(() => {
    // Load Leaflet CSS
    const linkId = 'leaflet-css';
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!window.L || !mapRef.current) return;
      const L = window.L;

      if (leafletMap.current) {
        try {
          leafletMap.current.remove();
        } catch (e) {}
        leafletMap.current = null;
      }

      const hasDoc = docLocation && docLocation.lat && docLocation.lng;
      const hasPat = patientLocation && patientLocation.lat && patientLocation.lng;

      const centerLat = hasPat && hasDoc 
        ? (docLocation.lat + patientLocation.lat) / 2 
        : (hasPat ? patientLocation.lat : (hasDoc ? docLocation.lat : 6.9271));
      const centerLng = hasPat && hasDoc 
        ? (docLocation.lng + patientLocation.lng) / 2 
        : (hasPat ? patientLocation.lng : (hasDoc ? docLocation.lng : 79.8612));

      leafletMap.current = L.map(mapRef.current).setView([centerLat, centerLng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      }).addTo(leafletMap.current);

      const bounds = [];

      // Custom doctor icon
      if (hasDoc) {
        const docIcon = L.divIcon({
          className: 'custom-doc-marker',
          html: '<div style="background-color:#2563EB;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:18px;border:2px solid #fff;">🏥</div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
        L.marker([docLocation.lat, docLocation.lng], { icon: docIcon })
          .addTo(leafletMap.current)
          .bindPopup('<b>Your Location (Doctor)</b>');
        bounds.push([docLocation.lat, docLocation.lng]);
      }

      // Custom patient icon
      if (hasPat) {
        const patIcon = L.divIcon({
          className: 'custom-pat-marker',
          html: '<div style="background-color:#EF4444;color:#fff;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);font-size:18px;border:2px solid #fff;">📍</div>',
          iconSize: [34, 34],
          iconAnchor: [17, 17]
        });
        L.marker([patientLocation.lat, patientLocation.lng], { icon: patIcon })
          .addTo(leafletMap.current)
          .bindPopup(`<b>Patient: ${patientName || 'Patient'}</b><br/>Destination`)
          .openPopup();
        bounds.push([patientLocation.lat, patientLocation.lng]);
      }

      // Draw route connecting line if both exist
      if (hasDoc && hasPat) {
        L.polyline([
          [docLocation.lat, docLocation.lng],
          [patientLocation.lat, patientLocation.lng]
        ], {
          color: '#2563EB',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.8
        }).addTo(leafletMap.current);

        if (bounds.length === 2) {
          try {
            leafletMap.current.fitBounds(bounds, { padding: [40, 40] });
          } catch (e) {}
        }
      }
    };

    if (window.L) {
      setTimeout(initMap, 100);
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setTimeout(initMap, 100);
      document.body.appendChild(script);
    }

    return () => {
      if (leafletMap.current) {
        try {
          leafletMap.current.remove();
        } catch (e) {}
        leafletMap.current = null;
      }
    };
  }, [docLocation?.lat, docLocation?.lng, patientLocation?.lat, patientLocation?.lng, patientName]);

  return (
    <View style={styles.container}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: 12, outline: 'none' }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  }
});

export default WebAppointmentMap;
