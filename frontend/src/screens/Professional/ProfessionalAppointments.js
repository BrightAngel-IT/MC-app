import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal, TextInput, RefreshControl, Linking } from 'react-native';
import { AuthContext } from '../../context/authContext';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import CustomAlertModal from '../../components/CustomAlertModal';
import NotifBell from '../../components/NotificationBell';
import AppointmentMapModal from '../../components/AppointmentMapModal';

const ProfessionalAppointments = ({ route }) => {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  
  const [appointments, setAppointments] = useState([]);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [distanceRate, setDistanceRate] = useState(50);
  const [statusFilter, setStatusFilter] = useState(route?.params?.statusFilter || null);
  const [timeFilter, setTimeFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal states
  const [selectedApt, setSelectedApt] = useState(null);
  const [selectedMapApt, setSelectedMapApt] = useState(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [prescribeModalVisible, setPrescribeModalVisible] = useState(false);
  const [viewPrescriptionModalVisible, setViewPrescriptionModalVisible] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [chatText, setChatText] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  const [isCanceling, setIsCanceling] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'success', title: '', message: '' });

  const styles = getStyles(colors);

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [timeFilter])
  );

  useEffect(() => {
    if (route?.params?.statusFilter !== undefined) {
      setStatusFilter(route.params.statusFilter);
    }
  }, [route?.params?.statusFilter]);

  useEffect(() => {
    (async () => {
      if (!doctorProfile?.locationLat) {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            if (loc?.coords) {
              setDoctorProfile(prev => ({
                ...(prev || {}),
                locationLat: loc.coords.latitude,
                locationLng: loc.coords.longitude
              }));
            }
          }
        } catch (e) {}
      }
    })();
  }, [doctorProfile?.locationLat]);

  useEffect(() => {
    if (route?.params?.appointmentId && appointments.length > 0) {
      const apt = appointments.find(a => a.id === route.params.appointmentId);
      if (apt) {
        if (route.params.action === 'openChat') {
          setSelectedApt(apt);
          setChatModalVisible(true);
        } else {
          // Just highlight or filter if needed, but for now open action modal if pending
          if (apt.status === 'PENDING') {
            openActionModal(apt);
          }
        }
      }
    }
  }, [route?.params?.appointmentId, route?.params?.action, appointments.length]);

  const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  };

  const getAptDistance = (apt) => {
    if (!apt) return null;
    return getDistanceInKm(
      doctorProfile?.locationLat,
      doctorProfile?.locationLng,
      apt.locationLat,
      apt.locationLng
    );
  };

  const getAptFees = (apt) => {
    const dist = getAptDistance(apt);
    const baseFee = doctorProfile?.bookingFee || 0;
    let travelFee = 0;
    let totalFee = apt?.totalAmount || 0;

    if (dist != null) {
      travelFee = Math.round(dist * (distanceRate || 50));
    }
    if (!totalFee || totalFee === 0) {
      totalFee = baseFee + travelFee;
    } else {
      if (baseFee > 0 && totalFee >= baseFee) {
        travelFee = totalFee - baseFee;
      } else if (dist != null && travelFee > 0 && totalFee >= travelFee) {
        baseFee = totalFee - travelFee;
      } else if (baseFee === 0) {
        baseFee = totalFee;
      }
    }
    return { 
      dist, 
      baseFee, 
      travelFee, 
      totalFee, 
      paymentMethod: apt?.paymentMethod || 'CASH',
      paymentStatus: apt?.paymentStatus || 'PENDING'
    };
  };

  const openMapForApt = (apt) => {
    setSelectedMapApt(apt);
    setMapModalVisible(true);
  };

  const openGoogleMapsDirections = (apt) => {
    const lat = apt.locationLat;
    const lng = apt.locationLng;
    const address = apt.patient?.address;
    let url = '';
    if (lat && lng) {
      if (doctorProfile?.locationLat && doctorProfile?.locationLng) {
        url = `https://www.google.com/maps/dir/?api=1&origin=${doctorProfile.locationLat},${doctorProfile.locationLng}&destination=${lat},${lng}`;
      } else {
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      }
    } else if (address) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    } else {
      setAlertConfig({ visible: true, type: 'error', title: 'Location Missing', message: 'No location coordinates or address found for this patient.' });
      return;
    }
    Linking.openURL(url).catch(() => {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Unable to open maps.' });
    });
  };

  const fetchAppointments = async () => {
    try {
      try {
        const setRes = await api.get('/settings');
        if (setRes.data && setRes.data.DISTANCE_CHARGE_PER_KM) {
          setDistanceRate(Number(setRes.data.DISTANCE_CHARGE_PER_KM));
        }
      } catch (e) {}

      const response = await api.get(`/professional/dashboard?filter=${timeFilter}`);
      setAppointments(response.data.appointments || []);
      if (response.data.profile) {
        setDoctorProfile(response.data.profile);
      }
    } catch (error) {
      console.log('Failed to fetch appointments');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const openActionModal = (apt) => {
    setSelectedApt(apt);
    setActionModalVisible(true);
  };

  const handleConfirmVisit = async () => {
    try {
      await api.put(`/professional/appointment/${selectedApt.id}/confirm`);
      setSelectedApt(prev => prev ? ({ ...prev, status: 'CONFIRMED' }) : null);
      setAlertConfig({ visible: true, type: 'success', title: 'Home Visit Confirmed', message: 'Home visit confirmed successfully! Prescription and completion actions are now unlocked.' });
      fetchAppointments();
    } catch (error) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to confirm appointment.' });
    }
  };

  const handleDeleteRecord = async (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this record forever?')) {
        try {
          await api.delete(`/professional/appointment/${id}`);
          fetchAppointments();
          setAlertConfig({ visible: true, type: 'success', title: 'Deleted', message: 'Record deleted.' });
        } catch (e) {
          setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to delete.' });
        }
      }
      return;
    }

    Alert.alert('Delete Record', 'Are you sure you want to delete this record forever?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/professional/appointment/${id}`);
            setActionModalVisible(false);
            fetchAppointments();
            setAlertConfig({ visible: true, type: 'success', title: 'Deleted', message: 'Record deleted.' });
          } catch (e) {
            setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to delete.' });
          }
        }
      }
    ]);
  };

  const handleCancelAppointment = async () => {
    if (isCanceling) return;
    setIsCanceling(true);
    try {
      await api.put(`/professional/appointment/${selectedApt.id}/cancel`);
      setAlertConfig({ visible: true, type: 'success', title: 'Success', message: 'Appointment canceled successfully.' });
      setActionModalVisible(false);
      fetchAppointments();
    } catch (error) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to cancel appointment.' });
    } finally {
      setIsCanceling(false);
    }
  };

  const completeAppointment = async () => {
    if(isCompleting) return;
      setIsCompleting(true);
      try{
        await api.put(`/professional/appointment/${selectedApt.id}/complete`);
        setAlertConfig({ visible: true, type: 'success', title: 'Success', message: 'Appointment completed successfully.' });
        setActionModalVisible(false);
        fetchAppointments();
      } catch (error) {
        setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to complete appointment.' });
      } finally {
        setIsCompleting(false);
      }
  }

  const handleSendMessage = async () => {
    if (!chatText.trim()) return;
    try {
      await api.post(`/professional/appointment/${selectedApt.id}/message`, { text: chatText });
      setChatText('');
      fetchAppointments();
      setSelectedApt(prev => ({
        ...prev,
        messages: [...(prev.messages || []), { id: Date.now().toString(), sender: 'PROFESSIONAL', text: chatText, createdAt: new Date().toISOString() }]
      }));
    } catch (error) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to send message' });
    }
  };

  const handleIssuePrescription = async () => {
    try {
      await api.post('/professional/prescription', {
        appointmentId: selectedApt.id,
        patientId: selectedApt.patientId,
        notes: prescriptionNotes
      });
      setAlertConfig({ visible: true, type: 'success', title: 'Success', message: 'Prescription issued.' });
      setPrescribeModalVisible(false);
      setPrescriptionNotes('');
      fetchAppointments();
    } catch (error) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to issue prescription.' });
    }
  };

  const filteredAppointments = statusFilter 
    ? appointments.filter(a => statusFilter === 'CANCELED' 
        ? a.status.startsWith('CANCELED') 
        : a.status === statusFilter) 
    : appointments;

  const renderAppointmentItem = (apt) => {
    const { dist, baseFee, travelFee, totalFee } = getAptFees(apt);
    const hasCoordinates = !!(apt.locationLat && apt.locationLng);

    return (
      <View key={apt.id} style={styles.card}>
        <TouchableOpacity onPress={() => openActionModal(apt)} activeOpacity={0.8}>
          <View style={styles.aptHeader}>
            <Text style={styles.patientName}>{apt.patient?.user?.fullName || 'Unknown Patient'}</Text>
            <View style={[styles.statusBadge, apt.status === 'PENDING' ? styles.bgWarning : (apt.status === 'CONFIRMED' ? styles.bgPrimary : (apt.status === 'COMPLETED' ? styles.bgSuccess : styles.bgDanger))]}>
              <Text style={styles.statusText}>
                {apt.status === 'CANCELED_BY_PATIENT' ? 'CANCELED BY PATIENT' : (apt.status === 'CANCELED_BY_DOCTOR' ? 'CANCELED BY YOU' : apt.status)}
              </Text>
            </View>
          </View>
          <Text style={styles.aptTime}>Date: {new Date(apt.scheduledDate).toLocaleDateString()}</Text>
          {apt.patient?.user?.phone && (
            <TouchableOpacity 
              style={{flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 6}}
              onPress={() => Linking.openURL(`tel:${apt.patient.user.phone}`)}
            >
              <Ionicons name="call" size={14} color={colors.primary} />
              <Text style={{color: colors.primary, marginLeft: 5, fontWeight: 'bold'}}>Call {apt.patient.user.phone}</Text>
            </TouchableOpacity>
          )}

          {/* Patient Location & Distance & Fee Info Card */}
          <View style={[styles.infoBanner, { backgroundColor: colors.surfaceLight || '#F8FAFC', borderColor: colors.border }]}>
            {/* Location & Distance */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 6 }}>
                <Ionicons name="location-sharp" size={16} color={colors.primary} />
                <Text style={[styles.locationText, { color: colors.text }]} numberOfLines={1}>
                  {apt.patient?.address || (hasCoordinates ? `GPS: ${apt.locationLat.toFixed(3)}, ${apt.locationLng.toFixed(3)}` : 'Location not specified')}
                </Text>
              </View>
              {dist != null ? (
                <View style={[styles.distBadge, { backgroundColor: colors.primaryLight || '#EFF6FF', borderColor: colors.primary }]}>
                  <Ionicons name="navigate" size={11} color={colors.primary} />
                  <Text style={[styles.distText, { color: colors.primary }]}>{dist} km</Text>
                </View>
              ) : null}
            </View>

            {/* Total Fee & Breakdown (Doctorta Enna Gana) */}
            <View style={styles.feeBreakdownRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                  <Ionicons name="cash-outline" size={15} color="#059669" />
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#059669', marginLeft: 4 }}>
                    Total Fee: Rs. {Number(totalFee).toLocaleString()}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textLight, marginLeft: 6 }}>
                    ({dist != null ? `Base ${baseFee} + Travel ${travelFee}` : 'Visiting Fee'})
                  </Text>
                </View>
                <View style={{ backgroundColor: (apt?.paymentMethod || 'CASH') === 'CARD' ? '#eff6ff' : '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: (apt?.paymentMethod || 'CASH') === 'CARD' ? '#1d4ed8' : '#92400e' }}>
                    {(apt?.paymentMethod || 'CASH') === 'CARD' ? 'CARD' : 'CASH'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.aptReason}>Reason: {apt.symptoms}</Text>
        </TouchableOpacity>

        {/* Quick Map and Manage Actions */}
        <View style={styles.cardBtnRow}>
          <TouchableOpacity 
            style={[styles.smallMapBtn, { borderColor: colors.primary, backgroundColor: colors.surface }]}
            onPress={() => openMapForApt(apt)}
          >
            <Ionicons name="map-outline" size={15} color={colors.primary} />
            <Text style={[styles.smallMapBtnText, { color: colors.primary }]}>View Map</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.smallMapBtn, { backgroundColor: '#2563EB', borderColor: '#2563EB' }]}
            onPress={() => openGoogleMapsDirections(apt)}
          >
            <Ionicons name="navigate-outline" size={15} color="#fff" />
            <Text style={[styles.smallMapBtnText, { color: '#fff' }]}>Google Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.smallMapBtn, { borderColor: colors.border, backgroundColor: colors.surfaceLight || '#F8FAFC' }]}
            onPress={() => openActionModal(apt)}
          >
            <Ionicons name="ellipsis-horizontal" size={15} color={colors.text} />
            <Text style={[styles.smallMapBtnText, { color: colors.text }]}>Manage</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <NotifBell />
      </View>

      <View style={{ paddingHorizontal: SIZES.padding }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}
          style={styles.filterTabsWrapper}
        >
          {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED'].map((status) => {
            const isActive = (status === 'ALL' && !statusFilter) || status === statusFilter;
            return (
              <TouchableOpacity 
                key={status} 
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setStatusFilter(status === 'ALL' ? null : status)}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView 
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {filteredAppointments.length === 0 ? (
          <Text style={styles.noData}>No appointments match this filter.</Text>
        ) : (
          filteredAppointments.map(renderAppointmentItem)
        )}
      </ScrollView>

      {/* Action Selection Modal */}
      <Modal visible={actionModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage Appointment</Text>
            <Text style={styles.modalSub}>Patient: {selectedApt?.patient?.user?.fullName}</Text>
            <Text style={styles.modalSub}>Symptoms: {selectedApt?.symptoms}</Text>

            {/* Patient Location & Fee Breakdown Box */}
            {selectedApt && (() => {
              const { dist, baseFee, travelFee, totalFee } = getAptFees(selectedApt);
              return (
                <View style={[styles.modalInfoBox, { backgroundColor: colors.surfaceLight || '#F8FAFC', borderColor: colors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="location-sharp" size={16} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginLeft: 4, flex: 1 }} numberOfLines={1}>
                      {selectedApt.patient?.address || (selectedApt.locationLat ? `GPS: ${selectedApt.locationLat.toFixed(4)}, ${selectedApt.locationLng.toFixed(4)}` : 'Address not registered')}
                    </Text>
                    {dist != null && (
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: 'bold', marginLeft: 6 }}>
                        📍 {dist} km
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: colors.textLight }}>
                      Fee: Base Rs. {baseFee} + Travel Rs. {travelFee}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#059669' }}>
                      Total: Rs. {Number(totalFee).toLocaleString()}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.modalMapBtn, { borderColor: colors.primary, backgroundColor: colors.surface }]}
                      onPress={() => {
                        setActionModalVisible(false);
                        openMapForApt(selectedApt);
                      }}
                    >
                      <Ionicons name="map-outline" size={16} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12, marginLeft: 4 }}>View on Map</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalMapBtn, { backgroundColor: '#2563EB', borderColor: '#2563EB' }]}
                      onPress={() => openGoogleMapsDirections(selectedApt)}
                    >
                      <Ionicons name="navigate-outline" size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginLeft: 4 }}>Google Maps</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}
            
            {selectedApt?.status !== 'COMPLETED' && !selectedApt?.status?.startsWith('CANCELED') ? (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.actionBtn, {backgroundColor: colors.primary, marginBottom: 10}]}
                  onPress={() => {
                    setActionModalVisible(false);
                    setChatModalVisible(true);
                  }}
                >
                  <Text style={styles.actionBtnText}>Chat with Patient</Text>
                </TouchableOpacity>

                {selectedApt?.status === 'PENDING' ? (
                  <TouchableOpacity 
                    style={[styles.actionBtn, {backgroundColor: '#0284C7', marginBottom: 10}]}
                    onPress={handleConfirmVisit}
                  >
                    <Text style={styles.actionBtnText}>Confirm Home Visit</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', borderColor: '#10B981', borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 10}}>
                    <Ionicons name="checkmark-circle" size={17} color="#059669" />
                    <Text style={{color: '#059669', fontWeight: 'bold', fontSize: 13, marginLeft: 6}}>Home Visit Confirmed</Text>
                  </View>
                )}

                <TouchableOpacity 
                  style={[
                    styles.actionBtn, 
                    {backgroundColor: colors.secondary, marginBottom: 10},
                    selectedApt?.status !== 'CONFIRMED' && { backgroundColor: '#E2E8F0', opacity: 0.7 }
                  ]}
                  onPress={() => {
                    if (selectedApt?.status !== 'CONFIRMED') {
                      setAlertConfig({ visible: true, type: 'warning', title: 'Home Visit Required', message: 'Doctor must confirm the home visit first before issuing a prescription.' });
                      return;
                    }
                    setActionModalVisible(false);
                    setPrescribeModalVisible(true);
                  }}
                  disabled={selectedApt?.status !== 'CONFIRMED'}
                >
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                    {selectedApt?.status !== 'CONFIRMED' && <Ionicons name="lock-closed" size={14} color="#64748B" style={{marginRight: 6}} />}
                    <Text style={[styles.actionBtnText, selectedApt?.status !== 'CONFIRMED' && { color: '#64748B' }]}>
                      {selectedApt?.status === 'CONFIRMED' ? 'Issue Prescription' : 'Issue Prescription (Confirm Visit First)'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.actionBtn, 
                    {backgroundColor: colors.success, marginBottom: 10},
                    selectedApt?.status !== 'CONFIRMED' && { backgroundColor: '#E2E8F0', opacity: 0.7 }
                  ]}
                  onPress={() => {
                    if (selectedApt?.status !== 'CONFIRMED') {
                      setAlertConfig({ visible: true, type: 'warning', title: 'Home Visit Required', message: 'Doctor must confirm the home visit first before completing the appointment.' });
                      return;
                    }
                    completeAppointment();
                  }}
                  disabled={selectedApt?.status !== 'CONFIRMED'}
                >
                  <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
                    {selectedApt?.status !== 'CONFIRMED' && <Ionicons name="lock-closed" size={14} color="#64748B" style={{marginRight: 6}} />}
                    <Text style={[styles.actionBtnText, selectedApt?.status !== 'CONFIRMED' && { color: '#64748B' }]}>
                      {selectedApt?.status === 'CONFIRMED' ? 'Complete Appointment' : 'Complete Appointment (Confirm Visit First)'}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionBtn, {backgroundColor: colors.danger, marginTop: 4}, isCanceling && {opacity: 0.7}]}
                  onPress={handleCancelAppointment}
                  disabled={isCanceling}
                >
                  <Text style={styles.actionBtnText}>{isCanceling ? 'Canceling...' : 'Cancel Appointment'}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ marginTop: 20, alignItems: 'center', width: '100%' }}>
                <Text style={{ color: colors.textLight, fontStyle: 'italic', marginBottom: 10 }}>
                  This appointment is {selectedApt?.status.toLowerCase()}. Actions are disabled.
                </Text>
                
                {selectedApt?.prescriptions && selectedApt.prescriptions.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, {backgroundColor: colors.secondary, marginTop: 5, width: '100%'}]}
                    onPress={() => {
                      setActionModalVisible(false);
                      setViewPrescriptionModalVisible(true);
                    }}
                  >
                    <Text style={styles.actionBtnText}>View Issued Prescription</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={[styles.actionBtn, {backgroundColor: colors.primary, marginTop: 15, width: '100%'}]}
                  onPress={() => {
                    setActionModalVisible(false);
                    setChatModalVisible(true);
                  }}
                >
                  <Text style={styles.actionBtnText}>View Chat History</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, {backgroundColor: colors.danger, marginTop: 15, width: '100%'}]}
                  onPress={() => {
                    handleDeleteRecord(selectedApt.id);
                  }}
                >
                  <Text style={styles.actionBtnText}>Delete Record</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setActionModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Issue Prescription Modal */}
      <Modal visible={prescribeModalVisible} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Issue Prescription</Text>
            
            <Text style={styles.label}>Medical Notes & Medicines</Text>
            <TextInput 
              style={[styles.input, {height: 120}]}
              placeholder="e.g. Paracetamol 500mg, 1x3 times a day"
              multiline
              value={prescriptionNotes}
              onChangeText={setPrescriptionNotes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setPrescribeModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleIssuePrescription}>
                <Text style={styles.submitText}>Submit Prescription</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Prescription Modal */}
      <Modal visible={viewPrescriptionModalVisible} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Issued Prescription</Text>
            
            <Text style={styles.label}>Medical Notes & Medicines</Text>
            <View style={[styles.input, {height: 120, backgroundColor: colors.surfaceLight, justifyContent: 'center'}]}>
              <Text style={{color: colors.text}}>
                {selectedApt?.prescriptions && selectedApt.prescriptions.length > 0 
                  ? selectedApt.prescriptions[0]?.notes 
                  : 'No details available.'}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.submitBtn} onPress={() => setViewPrescriptionModalVisible(false)}>
                <Text style={styles.submitText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Chat Modal */}
      <Modal visible={chatModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, { height: '80%', padding: 0, overflow: 'hidden' }]}>
            <View style={{ backgroundColor: colors.primary, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Chat with Patient</Text>
              <TouchableOpacity onPress={() => setChatModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1, padding: 15 }}>
              {selectedApt?.messages && selectedApt.messages.length > 0 ? selectedApt.messages.map((msg, index) => {
                const isMine = msg.sender === 'PROFESSIONAL';
                return (
                  <View key={index} style={{
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    backgroundColor: isMine ? colors.primary : colors.surfaceLight,
                    padding: 12, borderRadius: SIZES.radius, marginBottom: 10, maxWidth: '80%',
                    borderWidth: isMine ? 0 : 1, borderColor: colors.border
                  }}>
                    <Text style={{ color: isMine ? '#fff' : colors.text }}>{msg.text}</Text>
                    <Text style={{ fontSize: 10, color: isMine ? 'rgba(255,255,255,0.7)' : colors.textLight, marginTop: 4, textAlign: 'right' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                );
              }) : (
                <Text style={{ textAlign: 'center', color: colors.textLight, marginTop: 20 }}>No messages yet. Start the conversation!</Text>
              )}
            </ScrollView>

            {selectedApt?.status !== 'COMPLETED' && !selectedApt?.status?.startsWith('CANCELED') ? (
              <View style={{ flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, color: colors.text }}
                  placeholder="Type a message..."
                  placeholderTextColor={colors.textLight}
                  value={chatText}
                  onChangeText={setChatText}
                />
                <TouchableOpacity 
                  style={{ backgroundColor: colors.primary, width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 }}
                  onPress={handleSendMessage}
                >
                  <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ padding: 15, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' }}>
                <Text style={{ color: colors.textLight, fontStyle: 'italic' }}>Chat is closed for this appointment.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <CustomAlertModal 
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />

      {selectedMapApt && (
        <AppointmentMapModal
          visible={mapModalVisible}
          onClose={() => {
            setMapModalVisible(false);
            setSelectedMapApt(null);
          }}
          appointment={selectedMapApt}
          doctorProfile={doctorProfile}
          distanceInKm={getAptDistance(selectedMapApt)}
          travelFee={getAptFees(selectedMapApt).travelFee}
          totalAmount={getAptFees(selectedMapApt).totalFee}
        />
      )}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: SIZES.padding, paddingTop: 60, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  scrollContainer: { padding: SIZES.padding },
  
  filterTabsWrapper: { marginBottom: 15 },
  filterTabsContainer: { flexDirection: 'row', gap: 10, paddingVertical: 5 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText: { fontSize: 13, fontWeight: 'bold', color: colors.textLight },
  filterTabTextActive: { color: '#fff' },

  noData: { color: colors.textLight, fontStyle: 'italic', marginBottom: 20, textAlign: 'center', marginTop: 40 },
  
  card: { backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 16, marginBottom: 16, elevation: 2, borderWidth: 1, borderColor: colors.border },
  aptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  patientName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  aptTime: { fontSize: 14, color: colors.primary, marginBottom: 4, fontWeight: '600' },
  aptReason: { fontSize: 13, color: colors.textLight, fontStyle: 'italic', marginTop: 2 },
  
  infoBanner: { padding: 10, borderRadius: 10, borderWidth: 1, marginVertical: 8 },
  locationText: { fontSize: 13, fontWeight: '600', marginLeft: 4, flex: 1 },
  distBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1, gap: 3 },
  distText: { fontSize: 11, fontWeight: 'bold' },
  feeBreakdownRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: 'space-between' },
  cardBtnRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallMapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8, borderWidth: 1, gap: 4 },
  smallMapBtnText: { fontSize: 12, fontWeight: 'bold' },

  modalInfoBox: { padding: 12, borderRadius: 12, borderWidth: 1, marginVertical: 12 },
  modalMapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bgWarning: { backgroundColor: colors.warning + '20' },
  bgPrimary: { backgroundColor: colors.primary + '20' },
  bgSuccess: { backgroundColor: colors.success + '20' },
  bgDanger: { backgroundColor: colors.danger + '20' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: colors.text },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: SIZES.radiusLg, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  modalSub: { fontSize: 15, color: colors.textLight, marginBottom: 4 },
  
  actionButtons: { marginTop: 14, gap: 10 },
  actionBtn: { padding: 14, borderRadius: SIZES.radius, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  closeBtn: { marginTop: 16, alignItems: 'center', padding: 10 },
  closeBtnText: { color: colors.textLight, fontSize: 15, fontWeight: 'bold' },

  label: { fontSize: 14, color: colors.textLight, marginBottom: 8, marginTop: 15 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text, backgroundColor: colors.background, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 15 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { color: colors.textLight, fontWeight: 'bold' },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: SIZES.radius },
  submitText: { color: '#fff', fontWeight: 'bold' }
});

export default ProfessionalAppointments;
