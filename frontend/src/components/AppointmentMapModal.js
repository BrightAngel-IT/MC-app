import React, { useState, useEffect } from 'react';
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
    
    // Fetch road driving route via OSRM
    var osrmUrl = 'https://router.project-osrm.org/route/v1/driving/' + doc[1] + ',' + doc[0] + ';' + pat[1] + ',' + pat[0] + '?overview=full&geometries=geojson';
    fetch(osrmUrl).then(function(res) { return res.json(); }).then(function(data) {
      if (data.routes && data.routes.length > 0) {
        var coords = data.routes[0].geometry.coordinates.map(function(c) { return [c[1], c[0]]; });
        var poly = L.polyline(coords, { color: '#2563EB', weight: 5, opacity: 0.9 }).addTo(map);
        map.fitBounds(poly.getBounds(), { padding: [30, 30] });
      } else {
        var direct = L.polyline([doc, pat], { color: '#2563EB', weight: 4, dashArray: '8,8' }).addTo(map);
        map.fitBounds([doc, pat], { padding: [30, 30] });
      }
    }).catch(function() {
      var direct = L.polyline([doc, pat], { color: '#2563EB', weight: 4, dashArray: '8,8' }).addTo(map);
      map.fitBounds([doc, pat], { padding: [30, 30] });
    });
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

  const [roadInfo, setRoadInfo] = useState({ distanceKm: null, durationMins: null });

  if (!appointment) return null;

  const docLat = doctorProfile?.locationLat;
  const docLng = doctorProfile?.locationLng;
  const patLat = appointment.locationLat;
  const patLng = appointment.locationLng;
  const patientName = appointment.patient?.user?.fullName || 'Patient';
  const patientAddress = appointment.patient?.address;

  // Real Road Driving Distance calculation via OSRM
  useEffect(() => {
    if (visible && docLat && docLng && patLat && patLng) {
      const fetchDrivingRoute = async () => {
        try {
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${docLng},${docLat};${patLng},${patLat}?overview=false`;
          const res = await fetch(osrmUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.routes && data.routes.length > 0) {
              const r = data.routes[0];
              setRoadInfo({
                distanceKm: (r.distance / 1000).toFixed(1),
                durationMins: Math.round(r.duration / 60)
              });
            }
          }
        } catch (e) {
          console.log('OSRM modal fetch error:', e.message);
        }
      };
      fetchDrivingRoute();
    }
  }, [visible, docLat, docLng, patLat, patLng]);

  const handleOpenGoogleMaps = () => {
    let url = '';
    if (patLat && patLng) {
      if (docLat && docLng) {
        url = `https://www.google.com/maps/dir/?api=1&origin=${docLat},${docLng}&destination=${patLat},${patLng}`;
      } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${patLat},${patLng}`;
      }
    } else if (appointment.visitAddress || patientAddress) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(appointment.visitAddress || patientAddress)}`;
    }

    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  const hasCoordinates = !!(patLat && patLng);
  const displayDistance = roadInfo.distanceKm != null ? `${roadInfo.distanceKm} km (Road)` : (distanceInKm != null ? `${distanceInKm} km` : 'N/A');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Patient Location & Driving Route</Text>
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
                  <Text style={[styles.metricLabel, { color: colors.primary }]}>Driving Distance</Text>
                  <Text style={[styles.metricValue, { color: colors.text }]}>
                    {displayDistance}
                  </Text>
                </View>
              </View>

              {roadInfo.durationMins != null ? (
                <View style={[styles.metricBox, { backgroundColor: '#F0FDF4', borderColor: '#22C55E' }]}>
                  <Ionicons name="car-outline" size={22} color="#15803D" />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={[styles.metricLabel, { color: '#15803D' }]}>Driving Time</Text>
                    <Text style={[styles.metricValue, { color: '#166534' }]}>
                      ~{roadInfo.durationMins} mins
                    </Text>
                  </View>
                </View>
              ) : null}

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

            {/* Target Visit Destination (Where Doctor Visits) */}
            <View style={[styles.addressCard, { backgroundColor: colors.surfaceLight || '#F8FAFC', borderColor: colors.primary }]}>
              <Ionicons name="navigate-circle" size={24} color={colors.primary} style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 10, flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.addressTitle, { color: colors.primary, fontWeight: 'bold' }]}>🎯 Visit Destination (Doctor Visits Here)</Text>
                </View>
                <Text style={[styles.addressText, { color: colors.text, fontWeight: '600', fontSize: 13, marginTop: 2 }]}>
                  {appointment.visitAddress || patientAddress || (hasCoordinates ? `GPS: ${patLat.toFixed(5)}, ${patLng.toFixed(5)}` : 'Address not registered')}
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

            {/* Booked From Device Location (Safety / Audit) */}
            {((appointment.bookedAtLat && appointment.bookedAtLng) || appointment.bookedAtAddress) ? (
              <View style={[styles.addressCard, { backgroundColor: colors.surfaceLight || '#F8FAFC', borderColor: colors.border, marginTop: 8 }]}>
                <Ionicons name="business-outline" size={18} color={colors.textLight} style={{ marginTop: 2 }} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.addressTitle, { color: colors.textLight, fontSize: 12 }]}>📍 Booked From (Patient's location when booking)</Text>
                  <Text style={[styles.addressText, { color: colors.textLight, fontSize: 12 }]}>
                    {appointment.bookedAtAddress || `GPS: ${appointment.bookedAtLat?.toFixed(5)}, ${appointment.bookedAtLng?.toFixed(5)}`}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Map Container with Real Road Driving Path */}
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
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#2563EB', width: 14, height: 4, borderRadius: 2 }]} />
                    <Text style={[styles.legendText, { color: '#2563EB', fontWeight: 'bold' }]}>Road Driving Path</Text>
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
                  Travel Mileage Fee ({displayDistance}):
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
    maxWidth: 580,
    maxHeight: '92%',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  metricsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metricBox: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 1,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  addressText: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  mapWrapper: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  nativeMap: {
    flex: 1,
  },
  mapLegend: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    opacity: 0.95,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
  },
  noCoordsBox: {
    padding: 30,
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
  },
  noCoordsText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  feeCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  feeCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  actionRow: {
    marginTop: 4,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  navBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default AppointmentMapModal;
