import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, Linking, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';
import WebAppointmentMap from './WebAppointmentMap';

import { WebView } from 'react-native-webview';

const buildNativeHtml = (doc, pat, name) => `
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body,html,#map{margin:0;padding:0;height:100%;width:100%;}</style>
</head><body><div id="map"></div>
<script>
  var pat = [${pat.lat}, ${pat.lng}];
  var doc = ${doc ? `[${doc.lat}, ${doc.lng}]` : 'null'};
  var map = L.map('map').setView(pat, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  function dot(c) { return L.divIcon({ className: '', html: '<div style="background:' + c + ';width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>', iconAnchor: [9, 9] }); }
  L.marker(pat, { icon: dot('#EF4444') }).addTo(map).bindPopup(${JSON.stringify(name)});
  if (doc) {
    L.marker(doc, { icon: dot('#2563EB') }).addTo(map).bindPopup('Doctor Location');
    L.polyline([doc, pat], { color: '#2563EB', weight: 4, dashArray: '8,8' }).addTo(map);
    map.fitBounds([doc, pat], { padding: [30, 30] });
  }
</script></body></html>`;

const AppointmentMapModal = ({
  visible,
  onClose,
  appointment,
  doctorProfile,
  distanceInKm,
  travelFee,
  totalAmount
}) => {
  const { colors } = useTheme();

  if (!appointment) return null;

  const docLat = doctorProfile?.locationLat;
  const docLng = doctorProfile?.locationLng;
  const patLat = appointment.locationLat;
  const patLng = appointment.locationLng;
  const patientName = appointment.patient?.user?.fullName || 'Patient';
  const patientAddress = appointment.patient?.address;

  const handleOpenGoogleMaps = () => {
    let url = '';
    if (patLat && patLng) {
      if (docLat && docLng) {
        url = `https://www.google.com/maps/dir/?api=1&origin=${docLat},${docLng}&destination=${patLat},${patLng}`;
      } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${patLat},${patLng}`;
      }
    } else if (patientAddress) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(patientAddress)}`;
    }

    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const hasCoordinates = !!(patLat && patLng);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Patient Location & Route</Text>
              <Text style={[styles.modalSub, { color: colors.textLight }]}>
                {patientName} • {appointment.symptoms || 'Consultation'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Quick Metrics Bar */}
            <View style={styles.metricsContainer}>
              <View style={[styles.metricBox, { backgroundColor: colors.primaryLight || '#EFF6FF', borderColor: colors.primary }]}>
                <Ionicons name="navigate-circle" size={22} color={colors.primary} />
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.metricLabel, { color: colors.primary }]}>Distance</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {distanceInKm != null ? `${distanceInKm} km` : 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={[styles.metricBox, { backgroundColor: '#ECFDF5', borderColor: '#10B981' }]}>
                <Ionicons name="cash" size={22} color="#10B981" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={[styles.metricLabel, { color: '#059669' }]}>Total Fee</Text>
                  <Text style={[styles.metricValue, { color: '#047857' }]}>
                    Rs. {Number(totalAmount || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Address Row */}
            <View style={[styles.addressCard, { backgroundColor: colors.surfaceLight || '#F8FAFC', borderColor: colors.border }]}>
              <Ionicons name="location" size={20} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={[styles.addressTitle, { color: colors.text }]}>Patient Address / Pinned Location</Text>
                <Text style={[styles.addressText, { color: colors.textLight }]}>
                  {patientAddress || (hasCoordinates ? `GPS: ${patLat.toFixed(5)}, ${patLng.toFixed(5)}` : 'Address not registered')}
                </Text>
                {appointment.patient?.user?.phone && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
                    onPress={() => Linking.openURL(`tel:${appointment.patient.user.phone}`)}
                  >
                    <Ionicons name="call" size={14} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: 'bold', marginLeft: 4, fontSize: 13 }}>
                      Call Patient: {appointment.patient.user.phone}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Map Container */}
            {hasCoordinates ? (
              <View style={styles.mapWrapper}>
                {Platform.OS === 'web' ? (
                  <WebAppointmentMap
                    docLocation={docLat && docLng ? { lat: docLat, lng: docLng } : null}
                    patientLocation={{ lat: patLat, lng: patLng }}
                    patientName={patientName}
                  />
                ) : (
                  <WebView
                    style={styles.nativeMap}
                    originWhitelist={['*']}
                    javaScriptEnabled
                    domStorageEnabled
                    nestedScrollEnabled
                    source={{ html: buildNativeHtml(
                      docLat && docLng ? { lat: docLat, lng: docLng } : null,
                      { lat: patLat, lng: patLng },
                      patientName
                    ) }}
                  />
                )}

                {/* Map Legend */}
                <View style={[styles.mapLegend, { backgroundColor: colors.surface }]}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                    <Text style={[styles.legendText, { color: colors.textLight }]}>Doctor Spot</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.legendText, { color: colors.textLight }]}>Patient Destination</Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={[styles.noCoordsBox, { backgroundColor: colors.surfaceLight || '#F8FAFC' }]}>
                <Ionicons name="map-outline" size={38} color={colors.textLight} />
                <Text style={[styles.noCoordsText, { color: colors.textLight }]}>
                  Live coordinates are not saved for this appointment. You can still navigate using the address.
                </Text>
              </View>
            )}

            {/* Fee Breakdown Card */}
            <View style={[styles.feeCard, { backgroundColor: colors.surfaceLight || '#F8FAFC', borderColor: colors.border }]}>
              <Text style={[styles.feeCardTitle, { color: colors.text }]}>Fee Breakdown (Doctorta Enna Gana):</Text>
              <View style={styles.feeRow}>
                <Text style={{ color: colors.textLight }}>Base Doctor Booking Fee:</Text>
                <Text style={{ fontWeight: '600', color: colors.text }}>
                  Rs. {Number(doctorProfile?.bookingFee || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={{ color: colors.textLight }}>
                  Travel Mileage Fee ({distanceInKm != null ? `${distanceInKm} km` : 'Est.'}):
                </Text>
                <Text style={{ fontWeight: '600', color: colors.text }}>
                  Rs. {Number(travelFee || 0).toLocaleString()}
                </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.feeRow}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: colors.text }}>Total Earnings:</Text>
                <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#10B981' }}>
                  Rs. {Number(totalAmount || 0).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.navBtn, { backgroundColor: '#2563EB' }]}
                onPress={handleOpenGoogleMaps}
              >
                <Ionicons name="navigate" size={18} color="#fff" />
                <Text style={styles.navBtnText}>Open in Google Maps Navigation</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: 20,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  metricBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addressCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  addressTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  mapWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
  },
  nativeMap: {
    width: '100%',
    height: 260,
    borderRadius: 12,
  },
  mapLegend: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    opacity: 0.95,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  noCoordsBox: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  noCoordsText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  feeCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  feeCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  actionRow: {
    marginTop: 4,
    marginBottom: 6,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  navBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default AppointmentMapModal;
