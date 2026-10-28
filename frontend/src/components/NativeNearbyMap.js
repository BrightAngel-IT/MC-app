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

const NativeNearbyMap = ({ location, professionals = [], distanceRate = 50 }) => {
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
      const navParams = { prefill: fullName, professionalId: profId, autoBook: true };

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
          body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; font-family: sans-serif; }
          .book-btn {
            margin-top: 8px;
            padding: 8px 16px;
            background-color: ${colors.primary || '#0891b2'};
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
          }).addTo(map);

          // User Marker
          ${location ? `
            const userIcon = L.divIcon({
              className: 'user-pin',
              html: '<div style="background:#2563eb; width:16px; height:16px; border-radius:50%; border:3px solid white; box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>'
            });
            L.marker([${lat},${lng}], { icon: userIcon }).addTo(map).bindPopup('<b>You are here</b>');
          ` : ''}

          function calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
          }

          function sendBooking(role, fullName, profId) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ role, fullName, profId }));
          }

          const roleColors = {
            DOCTOR: '#0891b2',
            NURSE: '#059669',
            CAREGIVER: '#14b8a6',
            LAB_TECH: '#8b5cf6',
            PARAMEDIC: '#e11d48',
            PHARMACIST: '#f59e0b',
            ELDER_HOME: '#ea580c'
          };
          const profs = ${JSON.stringify(professionals)};
          const userLoc = ${location ? JSON.stringify({ latitude: lat, longitude: lng }) : 'null'};
          const distRate = ${distanceRate || 50};

          profs.forEach(prof => {
            if (prof.locationLat && prof.locationLng) {
              const role = prof.user?.role || 'DOCTOR';
              const color = roleColors[role] || '#ea580c';
              const icon = L.divIcon({
                className: 'custom-pin',
                html: '<div style="background-color:' + color + '; width:20px; height:20px; border-radius:50%; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.3);"></div>'
              });

              const marker = L.marker([prof.locationLat, prof.locationLng], { icon }).addTo(map);
              
              let popupHtml = '';

              if (role === 'ELDER_HOME') {
                const phone = prof.contactPhone || prof.user?.phone || '';
                const address = prof.address || prof.workingHospital || 'Elder Care Facility';
                
                let distText = '';
                if (userLoc) {
                  const rawDist = calculateDistance(userLoc.latitude, userLoc.longitude, prof.locationLat, prof.locationLng);
                  distText = '<span style="font-size:11px; color:#555;">Distance: ' + Number(rawDist.toFixed(1)) + ' km</span><br/>';
                }

                popupHtml = 
                  '<div style="text-align:center; padding: 4px; min-width: 170px;">' +
                    '<strong style="font-size:14px; color:#0f172a;">' + (prof.fullName || prof.user?.fullName || 'Elder Home') + '</strong><br/>' +
                    '<span style="color:#ea580c; font-size:11px; font-weight:bold;">🏠 ELDER CARE HOME</span><br/>' +
                    '<span style="color:#475569; font-size:11px; margin-top:2px; display:block;">📍 ' + address + '</span>' +
                    (phone ? '<span style="color:#0284c7; font-size:11px; font-weight:600; margin-top:2px; display:block;">📞 ' + phone + '</span>' : '') +
                    distText +
                    '<button class="book-btn" style="background-color:#ea580c; margin-top:6px;" onclick="sendBooking(\\'' + role + '\\', \\'' + (prof.fullName || prof.user?.fullName || '').replace(/'/g, "\\\\'") + '\\', \\'' + prof.id + '\\')">View Profile & Details ></button>' +
                  '</div>';
              } else {
                let distanceKm = 0;
                let distanceCost = 0;
                const baseFee = (prof.bookingFee !== undefined && prof.bookingFee !== null) ? Number(prof.bookingFee) : 0;
                const isPharmacy = role === 'PHARMACIST';

                if (userLoc && prof.locationLat && prof.locationLng) {
                  const rawDist = calculateDistance(userLoc.latitude, userLoc.longitude, prof.locationLat, prof.locationLng);
                  distanceKm = Number(rawDist.toFixed(1));
                  distanceCost = Math.round(distanceKm * distRate);
                }

                let feeHtml = '';
                if (isPharmacy) {
                  feeHtml = 
                    '<div style="background:#f8fafc; border-radius:6px; padding:6px 8px; margin:6px 0; border:1px solid #e2e8f0; font-size:12px; text-align:left;">' +
                      (userLoc ? '<div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span style="color:#64748b;">Distance:</span><span style="font-weight:600; color:#0f172a;">' + distanceKm + ' km</span></div>' : '') +
                      '<div style="color:#f59e0b; font-weight:600; text-align:center; margin-top:2px;">Medicines & Delivery by Pharmacy</div>' +
                    '</div>';
                } else {
                  const totalFee = baseFee + distanceCost;
                  feeHtml = 
                    '<div style="background:#f8fafc; border-radius:6px; padding:6px 8px; margin:6px 0; border:1px solid #e2e8f0; font-size:12px; text-align:left;">' +
                      '<div style="display:flex; justify-content:space-between; margin-bottom:2px;">' +
                        '<span style="color:#64748b;">Booking Fee:</span>' +
                        '<span style="font-weight:600; color:#0f172a;">Rs. ' + baseFee + '</span>' +
                      '</div>' +
                      (userLoc ? (
                        '<div style="display:flex; justify-content:space-between; margin-bottom:2px;">' +
                          '<span style="color:#64748b;">Distance (' + distanceKm + ' km):</span>' +
                          '<span style="font-weight:600; color:#0f172a;">Rs. ' + distanceCost + '</span>' +
                        '</div>' +
                        '<div style="border-top:1px dashed #cbd5e1; margin-top:4px; padding-top:4px; display:flex; justify-content:space-between;">' +
                          '<span style="font-weight:bold; color:#0f172a;">Total:</span>' +
                          '<span style="font-weight:bold; color:#10b981; font-size:13px;">Rs. ' + totalFee + '</span>' +
                        '</div>'
                      ) : '') +
                    '</div>';
                }

                const btnText = isPharmacy ? 'Order from Pharmacy >' : 'Tap to book >';

                popupHtml = 
                  '<div style="text-align:center; padding: 4px; min-width: 180px;">' +
                    '<strong style="font-size:14px; color:#0f172a;">' + (prof.user?.fullName || prof.fullName || 'Provider') + '</strong><br/>' +
                    '<span style="color:#64748b; font-size:12px; font-weight:600; text-transform:uppercase;">' + (prof.user?.role || role).replace('_', ' ') + '</span>' +
                    feeHtml +
                    '<button class="book-btn" style="background-color:' + color + ';" onclick="sendBooking(\\'' + (prof.user?.role || role) + '\\', \\'' + (prof.user?.fullName || prof.fullName || '').replace(/'/g, "\\\\'") + '\\', \\'' + prof.id + '\\')">' + btnText + '</button>' +
                  '</div>';
              }

              marker.bindPopup(popupHtml);
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
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleMessage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default NativeNearbyMap;