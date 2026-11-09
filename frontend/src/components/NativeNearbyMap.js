import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
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

const NativeNearbyMap = ({ location, professionals = [], distanceRate = 50, visitAddress = '' }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const webViewRef = useRef(null);

  const lat = location?.latitude || 7.8731;
  const lng = location?.longitude || 80.7718;

  // Handle click from inside Leaflet popup inside WebView
  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      const { role, fullName, profId } = data;
      const navParams = { 
        prefill: fullName, 
        professionalId: profId, 
        autoBook: true,
        passedVisitLocation: location ? { lat: location.latitude, lng: location.longitude } : null,
        passedVisitAddress: visitAddress || ''
      };

      if (role === 'DOCTOR') navigation.navigate('DoctorSearch', navParams);
      else if (role === 'NURSE') navigation.navigate('NurseScreen', navParams);
      else if (role === 'CAREGIVER') navigation.navigate('CaregiverSearch', navParams);
      else if (role === 'LAB_TECH') navigation.navigate('LabTechSearch', navParams);
      else if (role === 'PARAMEDIC') navigation.navigate('ParamedicSearch', navParams);
      else if (role === 'PHARMACIST') navigation.navigate('PharmacyScreen', { prefill: fullName });
      else if (role === 'ELDER_HOME') navigation.navigate('ElderHomeDetail', { elderHome: { id: profId, fullName } });
    } catch (e) {
      console.log('Navigation event error:', e);
    }
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; }
          .custom-pin { border-radius: 50%; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map').setView([${lat}, ${lng}], 12);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          function calculateDistance(lat1, lon1, lat2, lon2) {
            var R = 6371;
            var dLat = (lat2 - lat1) * Math.PI / 180;
            var dLon = (lon2 - lon1) * Math.PI / 180;
            var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
          }

          ${location ? `
            var targetTitle = ${JSON.stringify(visitAddress ? `🎯 Visit Target: ${visitAddress}` : '📍 Your Current Location')};
            var userMarker = L.marker([${location.latitude}, ${location.longitude}]).addTo(map);
            userMarker.bindPopup('<b>' + targetTitle + '</b><br/><span style="color:#64748b; font-size:11px;">Doctors will visit here</span>');
          ` : ''}

          var roleColors = ${JSON.stringify(ROLE_COLORS)};
          var pros = ${JSON.stringify(professionals)};
          var rate = ${distanceRate};

          pros.forEach(function(prof) {
            if (prof.locationLat && prof.locationLng) {
              var color = roleColors[prof.user?.role] || '#0891b2';
              var icon = L.divIcon({
                className: "custom-pin",
                iconAnchor: [0, 0],
                popupAnchor: [0, -10],
                html: '<span style="background-color:' + color + ';width:20px;height:20px;display:block;left:-10px;top:-10px;position:relative;border-radius:20px;border:2px solid #FFFFFF;box-shadow:0 2px 4px rgba(0,0,0,0.3);" />'
              });

              var marker = L.marker([prof.locationLat, prof.locationLng], { icon: icon }).addTo(map);
              var role = prof.user?.role || 'DOCTOR';
              var fullName = prof.user?.fullName || prof.fullName || 'Provider';

              var feeHtml = '';
              if (role === 'ELDER_HOME') {
                var phone = prof.contactPhone || (prof.user && prof.user.phone) || '';
                var address = prof.address || prof.workingHospital || 'Elder Care Facility';
                var distText = '';
                ${location ? `
                  var d = calculateDistance(${location.latitude}, ${location.longitude}, prof.locationLat, prof.locationLng);
                  distText = '<span style="font-size:11px; color:#555;">Distance to Destination: ' + d.toFixed(1) + ' km</span><br/>';
                ` : ''}
                var popupHtml = '<div style="text-align:center; padding:5px; min-width:170px;">' +
                  '<strong style="font-size:14px; color:#0f172a;">' + fullName + '</strong><br/>' +
                  '<span style="color:#ea580c; font-size:11px; font-weight:bold;">🏠 ELDER CARE HOME</span><br/>' +
                  '<span style="color:#475569; font-size:11px; margin-top:2px; display:block;">📍 ' + address + '</span>' +
                  (phone ? '<span style="color:#0284c7; font-size:11px; font-weight:600; margin-top:2px; display:block;">📞 ' + phone + '</span>' : '') +
                  distText +
                  '<button onclick="window.ReactNativeWebView.postMessage(JSON.stringify({role: \\'' + role + '\\', fullName: \\'' + fullName.replace(/'/g, "\\\\'") + '\\', profId: \\'' + prof.id + '\\'}))" style="margin-top:8px; padding:6px 14px; background-color:#ea580c; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; width:100%;">' +
                    'View Profile & Details >' +
                  '</button>' +
                '</div>';
                marker.bindPopup(popupHtml);
              } else {
                var baseFee = (prof.bookingFee !== undefined && prof.bookingFee !== null) ? Number(prof.bookingFee) : 0;
                var distKm = 0;
                var distCost = 0;
                ${location ? `
                  distKm = Number(calculateDistance(${location.latitude}, ${location.longitude}, prof.locationLat, prof.locationLng).toFixed(1));
                  distCost = Math.round(distKm * rate);
                ` : ''}

                if (role === 'PHARMACIST') {
                  feeHtml = '<div style="background:#f8fafc; border-radius:6px; padding:6px 8px; margin:6px 0; border:1px solid #e2e8f0; font-size:12px; text-align:left;">' +
                    ${location ? `'<div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span style="color:#64748b;">Distance to Destination:</span><span style="font-weight:600; color:#0f172a;">' + distKm + ' km</span></div>' + ` : `'' + `}
                    '<div style="color:#f59e0b; font-weight:600; text-align:center; margin-top:2px;">Medicines & Delivery by Pharmacy</div>' +
                  '</div>';
                } else {
                  var totalFee = baseFee + distCost;
                  feeHtml = '<div style="background:#f8fafc; border-radius:6px; padding:6px 8px; margin:6px 0; border:1px solid #e2e8f0; font-size:12px; text-align:left;">' +
                    '<div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span style="color:#64748b;">Booking Fee:</span><span style="font-weight:600; color:#0f172a;">Rs. ' + baseFee + '</span></div>' +
                    ${location ? `'<div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span style="color:#64748b;">Distance to Target (' + distKm + ' km):</span><span style="font-weight:600; color:#0f172a;">Rs. ' + distCost + '</span></div>' +
                    '<div style="border-top:1px dashed #cbd5e1; margin-top:4px; padding-top:4px; display:flex; justify-content:space-between;"><span style="font-weight:bold; color:#0f172a;">Total:</span><span style="font-weight:bold; color:#10b981; font-size:13px;">Rs. ' + totalFee + '</span></div>' + ` : `'' + `}
                  '</div>';
                }

                var btnText = role === 'PHARMACIST' ? 'Order from Pharmacy >' : 'Tap to book >';
                var popupHtml = '<div style="text-align:center; padding:4px; min-width:185px;">' +
                  '<strong style="font-size:14px; color:#0f172a;">' + fullName + '</strong><br/>' +
                  '<span style="color:#64748b; font-size:11px; font-weight:600; text-transform:uppercase;">' + role.replace('_', ' ') + '</span>' +
                  feeHtml +
                  '<button onclick="window.ReactNativeWebView.postMessage(JSON.stringify({role: \\'' + role + '\\', fullName: \\'' + fullName.replace(/'/g, "\\\\'") + '\\', profId: \\'' + prof.id + '\\'}))" style="margin-top:4px; padding:7px 14px; background-color:' + color + '; color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; width:100%; font-size:12px;">' +
                    btnText +
                  '</button>' +
                '</div>';
                marker.bindPopup(popupHtml);
              }
            }
          });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});

export default NativeNearbyMap;
