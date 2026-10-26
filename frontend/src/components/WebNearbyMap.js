import { Platform } from 'react-native';
import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/themeContext';

const ROLE_COLORS = {
  DOCTOR: '#0891b2',
  NURSE: '#059669',
  CAREGIVER: '#14b8a6',
  LAB_TECH: '#8b5cf6',
  PARAMEDIC: '#e11d48',
  PHARMACIST: '#f59e0b'
};

const WebNearbyMap = ({ location, professionals, isIslandwide, distanceRate = 50 }) => {
  if (Platform.OS !== 'web') return null;
  const { colors } = useTheme();
  const navigation = useNavigation();
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // Expose navigation function to global window for Leaflet popups
      window.handleMarkerClick = (role, fullName, profId) => {
        const navParams = { prefill: fullName, professionalId: profId, autoBook: true };
        if (role === 'DOCTOR') navigation.navigate('DoctorSearch', navParams);
        else if (role === 'NURSE') navigation.navigate('NurseScreen', navParams);
        else if (role === 'CAREGIVER') navigation.navigate('CaregiverSearch', navParams);
        else if (role === 'LAB_TECH') navigation.navigate('LabTechSearch', navParams);
        else if (role === 'PARAMEDIC') navigation.navigate('ParamedicSearch', navParams);
        else if (role === 'PHARMACIST') navigation.navigate('PharmacyScreen', { prefill: fullName });
        else if (role === 'ELDER_HOME') navigation.navigate('ElderHomeDetail', { elderHome: { id: profId, fullName } });
      };

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
        const lat = location?.latitude || 7.8731;
        const lng = location?.longitude || 80.7718;

        leafletMap.current = L.map(mapRef.current).setView([lat, lng], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        }).addTo(leafletMap.current);

        updateMarkers(L);
      }
    };
    document.body.appendChild(script);

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
      try {
        document.head.removeChild(link);
        document.body.removeChild(script);
      } catch (e) { }
    };
  }, []);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const updateMarkers = (L) => {
    if (!leafletMap.current) return;

    // Clear old markers
    markersRef.current.forEach(m => leafletMap.current.removeLayer(m));
    markersRef.current = [];

    // Add User Location Marker
    if (location) {
      const userMarker = L.marker([location.latitude, location.longitude]).addTo(leafletMap.current);
      userMarker.bindPopup('<b>You are here</b><br/>Your current location');
      markersRef.current.push(userMarker);
    }

    // Add Professional Markers
    professionals.forEach(prof => {
      if (prof.locationLat && prof.locationLng) {
        // Create custom colored icon using HTML
        const color = ROLE_COLORS[prof.user.role] || colors.primary;
        const markerHtmlStyles = `
          background-color: ${color};
          width: 20px;
          height: 20px;
          display: block;
          left: -10px;
          top: -10px;
          position: relative;
          border-radius: 20px;
          border: 2px solid #FFFFFF;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        `;
        const icon = L.divIcon({
          className: "custom-pin",
          iconAnchor: [0, 0],
          popupAnchor: [0, -10],
          html: `<span style="${markerHtmlStyles}" />`
        });

        const marker = L.marker([prof.locationLat, prof.locationLng], { icon }).addTo(leafletMap.current);

        const role = prof.user?.role || 'DOCTOR';

        let popupContent = '';
        if (role === 'ELDER_HOME') {
          const phone = prof.contactPhone || prof.user?.phone || '';
          const address = prof.address || prof.workingHospital || 'Elder Care Facility';
          let distText = '';
          if (location) {
            const rawDist = calculateDistance(location.latitude, location.longitude, prof.locationLat, prof.locationLng);
            distText = `<span style="font-size:11px; color:#555;">Distance: ${rawDist.toFixed(1)} km</span><br/>`;
          }

          popupContent = `
            <div style="text-align:center; padding:5px; min-width:170px;">
              <strong style="font-size:14px; color:#0f172a;">${prof.fullName || prof.user.fullName}</strong><br/>
              <span style="color:#ea580c; font-size:11px; font-weight:bold;">🏠 ELDER CARE HOME</span><br/>
              <span style="color:#475569; font-size:11px; margin-top:2px; display:block;">📍 ${address}</span>
              ${phone ? `<span style="color:#0284c7; font-size:11px; font-weight:600; margin-top:2px; display:block;">📞 ${phone}</span>` : ''}
              ${distText}
              <button onclick="window.handleMarkerClick('${role}', '${(prof.fullName || prof.user.fullName).replace(/'/g, "\\'")}', '${prof.id}')" style="margin-top:8px; padding:6px 14px; background-color:#ea580c; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; width:100%;">
                View Profile & Details >
              </button>
            </div>
          `;
        } else {
          let distanceText = '';
          let distanceCost = 0;
          let feeBreakdown = '';

          if (location && prof.bookingFee !== undefined && prof.bookingFee !== null) {
            const rawDist = calculateDistance(location.latitude, location.longitude, prof.locationLat, prof.locationLng);
            const distKm = Number(rawDist.toFixed(1));
            distanceCost = Math.round(distKm * distanceRate);
            distanceText = `<span style="font-size:12px; color:#555;">Distance: ${distKm} km</span><br/>`;
            feeBreakdown = `<span style="font-size:12px; color:#555;">Base: Rs. ${prof.bookingFee} | Travel: Rs. ${distanceCost}</span><br/>
                            <span style="font-weight:bold; color:#10b981; margin-top:5px; display:block;">Total: Rs. ${prof.bookingFee + distanceCost}</span>`;
          } else if (prof.bookingFee !== undefined && prof.bookingFee !== null) {
            feeBreakdown = `<span style="font-weight:bold; margin-top:5px; display:block;">Fee: Rs. ${prof.bookingFee}</span>`;
          }

          popupContent = `
            <div style="text-align:center; padding:5px;">
              <strong style="font-size:14px;">${prof.user.fullName}</strong><br/>
              <span style="color:#666; font-size:12px;">${prof.user.role.replace('_', ' ')}</span><br/>
              ${distanceText}
              ${feeBreakdown}
              <button onclick="window.handleMarkerClick('${prof.user.role}', '${prof.user.fullName.replace(/'/g, "\\'")}', '${prof.id}')" style="margin-top:8px; padding:6px 14px; background-color:${colors.primary}; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">
                Tap to book >
              </button>
            </div>
          `;
        }

        marker.bindPopup(popupContent);
        markersRef.current.push(marker);
      }
    });
  };

  useEffect(() => {
    if (window.L && leafletMap.current) {
      updateMarkers(window.L);
      if (isIslandwide) {
        leafletMap.current.setView([7.8731, 80.7718], 7);
      } else if (location) {
        leafletMap.current.setView([location.latitude, location.longitude], 12);
      }
    }
  }, [location, professionals, isIslandwide]);

  return (
    <View style={{ flex: 1, backgroundColor: 'red' }}>
      <Text style={{ color: 'white', fontSize: 20 }}>WEB NEARBY MAP LOADED</Text>
      <div ref={mapRef} style={{ width: '100%', height: '100%', outline: 'none' }} />
    </View>
  );
};

export default WebNearbyMap;
