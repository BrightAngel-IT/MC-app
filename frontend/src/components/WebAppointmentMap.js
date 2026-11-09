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

    const initMap = async () => {
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
          .bindPopup('<b>Doctor Location</b>');
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
          .bindPopup(`<b>Patient Destination: ${patientName || 'Patient'}</b><br/>Visit Target`)
          .openPopup();
        bounds.push([patientLocation.lat, patientLocation.lng]);
      }

      // Fetch Real Road Driving Geometry from OSRM
      if (hasDoc && hasPat) {
        let routeDrawn = false;
        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${docLocation.lng},${docLocation.lat};${patientLocation.lng},${patientLocation.lat}?overview=full&geometries=geojson`;
          const response = await fetch(osrmUrl);
          if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0];
              const coords = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
              
              // Draw real road driving path
              const roadPolyline = L.polyline(coords, {
                color: '#2563EB',
                weight: 5,
                opacity: 0.9,
                lineJoin: 'round'
              }).addTo(leafletMap.current);

              const roadDistKm = (route.distance / 1000).toFixed(1);
              const driveMins = Math.round(route.duration / 60);
              roadPolyline.bindPopup(`<b>🚗 Driving Route via Road</b><br/>Distance: ${roadDistKm} km<br/>Est. Drive Time: ~${driveMins} mins`);

              leafletMap.current.fitBounds(roadPolyline.getBounds(), { padding: [40, 40] });
              routeDrawn = true;
            }
          }
        } catch (err) {
          console.log('OSRM road route fetch error:', err.message);
        }

        // Fallback to straight dashed line if OSRM is unreachable
        if (!routeDrawn) {
          const directLine = L.polyline([
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
      }
    };

    if (window.L) {
      setTimeout(initMap, 100);
    } else {
      const scriptId = 'leaflet-js';
      let script = document.getElementById(scriptId);
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => setTimeout(initMap, 100);
        document.body.appendChild(script);
      } else {
        script.addEventListener('load', () => setTimeout(initMap, 100));
      }
    }

    return () => {
      if (leafletMap.current) {
        try {
          leafletMap.current.remove();
        } catch (e) {}
        leafletMap.current = null;
      }
    };
  }, [docLocation, patientLocation, patientName]);

  return (
    <View style={styles.container}>
      <div 
        ref={mapRef} 
        style={{ width: '100%', height: '100%', borderRadius: 12 }} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
});

export default WebAppointmentMap;
