import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, Platform, TouchableOpacity, Modal, TextInput, ScrollView, RefreshControl, Linking } from 'react-native';
import api from '../../api/axios';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../context/authContext';
import CustomAlertModal from '../../components/CustomAlertModal';

const AppointmentsScreen = ({ route }) => {
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reschedule State
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedAptId, setSelectedAptId] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00 AM');

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const setQuickRescheduleDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setNewDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const getCombinedDateTime = (dateStr, timeStr) => {
    if (!dateStr) return new Date().toISOString();
    let [year, month, day] = dateStr.trim().split('-').map(Number);
    if (!year || !month || !day) {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
      } else {
        return new Date().toISOString();
      }
    }
    let hours = 10;
    let minutes = 0;
    if (timeStr) {
      const clean = timeStr.trim().toUpperCase();
      const isPM = clean.includes('PM');
      const isAM = clean.includes('AM');
      const parts = clean.replace(/[^\d:]/g, '').split(':').map(Number);
      if (parts.length >= 1 && !isNaN(parts[0])) {
        hours = parts[0];
        minutes = parts[1] || 0;
        if (isPM && hours < 12) hours += 12;
        if (isAM && hours === 12) hours = 0;
      }
    }
    const combined = new Date(year, month - 1, day, hours, minutes, 0);
    return isNaN(combined.getTime()) ? new Date(dateStr).toISOString() : combined.toISOString();
  };

  // Chat State
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [viewPrescriptionModalVisible, setViewPrescriptionModalVisible] = useState(false);
  const [selectedApt, setSelectedApt] = useState(null);
  
  const [cancelingId, setCancelingId] = useState(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'success', title: '', message: '' });
  const [chatText, setChatText] = useState('');

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [])
  );

  useEffect(() => {
    if (route?.params?.appointmentId && appointments.length > 0) {
      const apt = appointments.find(a => a.id === route.params.appointmentId);
      if (apt) {
        if (route.params.action === 'openChat') {
          openChatModal(apt);
        }
      }
    }
  }, [route?.params?.appointmentId, route?.params?.action, appointments.length]);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/patient/appointments');
      setAppointments(response.data.appointments || []);
    } catch (error) {
      console.log('Failed to fetch appointments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const openRescheduleModal = (apt) => {
    setSelectedAptId(apt?.id || apt);
    if (apt?.scheduledDate) {
      const d = new Date(apt.scheduledDate);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      setNewDate(`${yr}-${mo}-${da}`);
      setNewTime(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      setNewDate(getTodayStr());
      setNewTime('10:00 AM');
    }
    setRescheduleModalVisible(true);
  };

  const handleReschedule = async () => {
    if (!newDate) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Please select a new date.' });
      return;
    }
    if (isRescheduling) return;
    setIsRescheduling(true);
    try {
      const scheduledIso = getCombinedDateTime(newDate, newTime);
      await api.put(`/patient/appointment/${selectedAptId}/reschedule`, { newDate: scheduledIso });
      setAlertConfig({ visible: true, type: 'success', title: 'Success', message: 'Appointment rescheduled successfully.' });
      setRescheduleModalVisible(false);
      setNewDate('');
      fetchAppointments();
    } catch (error) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to reschedule.' });
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleCancel = async (id) => {
    if (cancelingId) return;
    setCancelingId(id);
    try {
      await api.put(`/patient/appointment/${id}/cancel`);
      setAlertConfig({ visible: true, type: 'success', title: 'Canceled', message: 'Appointment has been canceled.' });
      fetchAppointments();
    } catch (error) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to cancel.' });
    } finally {
      setCancelingId(null);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this record forever?')) {
        try {
          await api.delete(`/patient/appointment/${id}`);
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
            await api.delete(`/patient/appointment/${id}`);
            fetchAppointments();
            setAlertConfig({ visible: true, type: 'success', title: 'Deleted', message: 'Record deleted.' });
          } catch (e) {
            setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to delete.' });
          }
        }
      }
    ]);
  };

  const openChatModal = (apt) => {
    setSelectedApt(apt);
    setChatModalVisible(true);
  };

  const handleSendMessage = async () => {
    if (!chatText.trim()) return;
    try {
      await api.post(`/patient/appointment/${selectedApt.id}/message`, { text: chatText });
      setChatText('');
      fetchAppointments();
      setSelectedApt(prev => ({
        ...prev,
        messages: [...(prev.messages || []), { id: Date.now().toString(), sender: 'PATIENT', text: chatText, createdAt: new Date().toISOString() }]
      }));
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((R * c).toFixed(1));
  };

  const getAptFees = (item) => {
    const p = item.professional;
    const dist = calculateDistanceKm(
      item.locationLat,
      item.locationLng,
      p?.locationLat,
      p?.locationLng
    );
    let baseFee = p?.bookingFee || 0;
    let travelFee = 0;
    let totalFee = item.totalAmount || 0;

    if (dist != null) {
      travelFee = Math.round(dist * 50);
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
      paymentMethod: item.paymentMethod || 'CASH',
      paymentStatus: item.paymentStatus || 'PENDING'
    };
  };

  const renderItem = ({ item }) => {
    const fees = getAptFees(item);
    const profRole = item.professional?.user?.role;
    const rolePrefix = profRole === 'NURSE' ? 'Nurse ' : (profRole === 'CAREGIVER' ? 'Caregiver ' : (profRole === 'LAB_TECH' ? 'Lab Tech ' : (profRole === 'PARAMEDIC' ? 'Paramedic ' : 'Dr. ')));
    const profName = item.professional?.user?.fullName || 'Healthcare Provider';

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.doctorName}>{rolePrefix}{profName}</Text>
            {item.professional?.specialization && (
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 1 }}>
                {item.professional.specialization}
              </Text>
            )}
          </View>
          <View style={[styles.badge, item.status === 'PENDING' ? styles.bgWarning : item.status === 'CONFIRMED' ? styles.bgPrimary : item.status === 'COMPLETED' ? styles.bgSuccess : styles.bgDanger]}>
            <Text style={styles.badgeText}>
              {item.status === 'CANCELED_BY_PATIENT' ? 'CANCELED BY YOU' : (item.status === 'CANCELED_BY_DOCTOR' ? 'CANCELED BY DOCTOR' : item.status)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.dateText}>
          Scheduled: {new Date(item.scheduledDate).toLocaleDateString()} at {new Date(item.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        {item.professional?.user?.phone && (
          <TouchableOpacity 
            style={{flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 4}}
            onPress={() => Linking.openURL(`tel:${item.professional.user.phone}`)}
          >
            <Ionicons name="call" size={14} color={colors.primary} />
            <Text style={{color: colors.primary, marginLeft: 5, fontWeight: 'bold'}}>Call {rolePrefix}{profName} ({item.professional.user.phone})</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.reasonText}>Reason: {item.symptoms}</Text>

        {/* Charge & Fee Breakdown Banner */}
        <View style={[styles.feeBanner, { backgroundColor: colors.surfaceLight || '#F8FAFC', borderColor: colors.border }]}>
          <View style={styles.feeHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="receipt-outline" size={15} color={colors.primary} />
              <Text style={[styles.feeHeaderTitle, { color: colors.text }]}>Fee & Charge Breakdown</Text>
            </View>
            <View style={[styles.paymentBadge, fees.paymentStatus === 'PAID' ? styles.paymentBadgePaid : (fees.paymentMethod === 'CARD' ? styles.paymentBadgeCard : styles.paymentBadgePending)]}>
              <Text style={[styles.paymentBadgeText, fees.paymentStatus === 'PAID' ? styles.paymentTextPaid : (fees.paymentMethod === 'CARD' ? styles.paymentTextCard : styles.paymentTextPending)]}>
                {fees.paymentStatus === 'PAID' ? 'PAID' : (fees.paymentMethod === 'CARD' ? 'CARD PAYMENT' : 'CASH ON VISIT')}
              </Text>
            </View>
          </View>

          <View style={[styles.feeDivider, { backgroundColor: colors.border }]} />

          <View style={styles.feeItemRow}>
            <Text style={[styles.feeItemLabel, { color: colors.textLight }]}>
              {item.serviceType ? `${item.serviceType} Fee` : 'Consultation Fee'}
            </Text>
            <Text style={[styles.feeItemValue, { color: colors.text }]}>
              Rs. {Number(fees.baseFee).toLocaleString()}
            </Text>
          </View>

          {fees.travelFee > 0 && (
            <View style={styles.feeItemRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.feeItemLabel, { color: colors.textLight }]}>Travel / Visiting Charge</Text>
                {fees.dist != null ? (
                  <Text style={{ fontSize: 11, color: colors.primary, marginLeft: 4, fontWeight: '600' }}>
                    ({fees.dist} km)
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.feeItemValue, { color: colors.text }]}>
                Rs. {Number(fees.travelFee).toLocaleString()}
              </Text>
            </View>
          )}

          <View style={[styles.feeItemRow, styles.feeTotalRow, { borderTopColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="wallet-outline" size={14} color={colors.isDark ? '#34d399' : '#059669'} />
              <Text style={[styles.feeTotalLabel, { color: colors.isDark ? '#34d399' : '#059669' }]}>Total Charge</Text>
            </View>
            <Text style={[styles.feeTotalValue, { color: colors.isDark ? '#34d399' : '#059669' }]}>
              Rs. {Number(fees.totalFee).toLocaleString()}
            </Text>
          </View>

          <View style={styles.paymentMethodRow}>
            <Ionicons name="information-circle-outline" size={13} color={colors.textLight} />
            <Text style={[styles.paymentMethodText, { color: colors.textLight }]}>
              Payment Mode: <Text style={{ fontWeight: 'bold', color: colors.text }}>{fees.paymentMethod === 'CARD' ? 'Card Payment (Online / POS)' : 'Pay Cash directly on visit'}</Text>
            </Text>
          </View>
        </View>

        {!item.status?.startsWith('CANCELED') && item.status !== 'COMPLETED' ? (
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnChat]} onPress={() => openChatModal(item)}>
              <Ionicons name="chatbubbles-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.btnChatText}>Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={() => openRescheduleModal(item)}>
              <Ionicons name="calendar-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.btnOutlineText}>Reschedule</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.btn, styles.btnDanger, cancelingId === item.id && { opacity: 0.7 }]} 
              onPress={() => handleCancel(item.id)}
              disabled={cancelingId === item.id}
            >
              <Ionicons name="close-circle-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.btnDangerText}>{cancelingId === item.id ? 'Canceling...' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.completedActions}>
            {item.prescriptions && item.prescriptions.length > 0 && (
              <TouchableOpacity style={[styles.btn, styles.btnActionSecondary]} onPress={() => { setSelectedApt(item); setViewPrescriptionModalVisible(true); }}>
                <Ionicons name="document-text-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnTextWhite}>View Issued Prescription</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.btn, styles.btnActionOutline]} onPress={() => openChatModal(item)}>
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={[styles.btnTextPrimary, { color: colors.primary }]}>View Chat History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => handleDeleteRecord(item.id)}>
              <Ionicons name="trash-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.btnDangerText}>Delete Record</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const styles = getStyles(colors);

  if (loading) return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, backgroundColor: colors.background }} />;

  return (
    <View style={styles.container}>
      <View style={styles.innerContent}>
        <Text style={styles.title}>My Appointments</Text>
        <FlatList 
          data={appointments}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<Text style={{textAlign: 'center', color: colors.textLight, marginTop: 40}}>No appointments found.</Text>}
        />
      </View>

      {/* Reschedule Modal */}
      <Modal visible={rescheduleModalVisible} animationType="slide" transparent>
         <View style={styles.modalBg}>
            <View style={styles.modalContent}>
               <Text style={styles.modalTitle}>Reschedule Appointment</Text>
               <Text style={{color: colors.textLight, fontSize: 13, marginBottom: 15}}>
                 Choose a new date and time for your appointment.
               </Text>
               
               <Text style={styles.label}>Select New Date</Text>
               <View style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
                 <TouchableOpacity 
                   style={[styles.quickChip, newDate === getTodayStr() && styles.quickChipActive]}
                   onPress={() => setQuickRescheduleDate(0)}
                 >
                   <Text style={[styles.quickChipText, newDate === getTodayStr() && styles.quickChipTextActive]}>Today</Text>
                 </TouchableOpacity>
                 <TouchableOpacity 
                   style={[styles.quickChip, newDate === getTomorrowStr() && styles.quickChipActive]}
                   onPress={() => setQuickRescheduleDate(1)}
                 >
                   <Text style={[styles.quickChipText, newDate === getTomorrowStr() && styles.quickChipTextActive]}>Tomorrow</Text>
                 </TouchableOpacity>
               </View>
               <TextInput 
                 style={styles.input} 
                 placeholder="New Date (YYYY-MM-DD)" 
                 value={newDate} 
                 onChangeText={setNewDate}
               />

               <Text style={[styles.label, {marginTop: 14}]}>Select New Time</Text>
               <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8}}>
                 {['09:00 AM', '10:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'].map((slot) => (
                   <TouchableOpacity
                     key={slot}
                     style={[styles.quickChip, newTime === slot && styles.quickChipActive]}
                     onPress={() => setNewTime(slot)}
                   >
                     <Text style={[styles.quickChipText, newTime === slot && styles.quickChipTextActive]}>{slot}</Text>
                   </TouchableOpacity>
                 ))}
               </View>
               <TextInput 
                 style={styles.input} 
                 placeholder="e.g. 10:00 AM or 14:30" 
                 value={newTime} 
                 onChangeText={setNewTime}
               />

               <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setRescheduleModalVisible(false)} style={styles.cancelBtn}>
                    <Text style={styles.cancelText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleReschedule} 
                    style={[styles.submitBtn, isRescheduling && { opacity: 0.7 }]}
                    disabled={isRescheduling}
                  >
                    <Text style={styles.submitText}>{isRescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}</Text>
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
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Chat with Doctor</Text>
              <TouchableOpacity onPress={() => setChatModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1, padding: 15 }}>
              {selectedApt?.messages && selectedApt.messages.length > 0 ? selectedApt.messages.map((msg, index) => {
                const isMine = msg.sender === 'PATIENT';
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

            {selectedApt?.status !== 'COMPLETED' && selectedApt?.status !== 'CANCELED' ? (
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
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    width: '100%',
  },
  innerContent: {
    flex: 1,
    width: '100%',
    padding: SIZES.padding,
    ...(Platform.OS === 'web' ? { maxWidth: 1000, alignSelf: 'center' } : {})
  },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginTop: 40, marginBottom: 20 },
  card: { 
    backgroundColor: colors.surface, 
    borderRadius: SIZES.radius, 
    padding: 20, 
    marginBottom: 16, 
    elevation: 2, 
    borderWidth: 1, 
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  doctorName: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  dateText: { fontSize: 14, color: colors.primary, marginBottom: 4 },
  reasonText: { fontSize: 14, color: colors.textLight, fontStyle: 'italic', marginBottom: 16 },
  
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bgWarning: { backgroundColor: colors.warning + '20' },
  bgPrimary: { backgroundColor: colors.primary + '20' },
  bgSuccess: { backgroundColor: colors.success + '20' },
  bgDanger: { backgroundColor: colors.danger + '20' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: colors.text },

  actions: { 
    flexDirection: 'row', 
    gap: 12, 
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: Platform.OS === 'web' ? 'flex-end' : 'stretch',
    alignItems: 'center',
  },
  completedActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: Platform.OS === 'web' ? 'flex-end' : 'stretch',
    alignItems: 'center',
  },
  btn: { 
    flexDirection: 'row',
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 10, 
    paddingHorizontal: 18,
    borderRadius: SIZES.radius,
    minHeight: 42,
    ...(Platform.OS === 'web' ? { 
      flexGrow: 0, 
      flexShrink: 0,
      minWidth: 160,
      cursor: 'pointer' 
    } : { 
      flex: 1 
    }),
  },
  btnChat: { backgroundColor: colors.primary },
  btnChatText: { color: '#fff', fontWeight: 'bold', fontSize: 13, flexShrink: 0 },
  btnOutline: { backgroundColor: colors.secondary },
  btnOutlineText: { color: '#fff', fontWeight: 'bold', fontSize: 13, flexShrink: 0 },
  btnDanger: { backgroundColor: colors.danger },
  btnDangerText: { color: '#fff', fontWeight: 'bold', fontSize: 13, flexShrink: 0 },
  btnActionSecondary: { backgroundColor: colors.secondary },
  btnActionOutline: { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  btnTextWhite: { color: '#fff', fontWeight: 'bold', fontSize: 13, flexShrink: 0 },
  btnTextPrimary: { fontWeight: 'bold', fontSize: 13, flexShrink: 0 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: SIZES.radiusLg, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text, backgroundColor: colors.background },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 15 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  cancelText: { color: colors.textLight, fontWeight: 'bold' },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: SIZES.radius },
  submitText: { color: '#fff', fontWeight: 'bold' },
  label: { fontSize: 13, color: colors.textLight, fontWeight: '600', marginBottom: 6 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  quickChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickChipText: { fontSize: 12, color: colors.textLight, fontWeight: '600' },
  quickChipTextActive: { color: '#fff', fontWeight: 'bold' },

  feeBanner: {
    borderRadius: SIZES.radius,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    marginTop: 4,
  },
  feeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  paymentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  paymentBadgePaid: {
    backgroundColor: colors.isDark ? '#064e3b' : '#d1fae5',
  },
  paymentBadgePending: {
    backgroundColor: colors.isDark ? '#451a03' : '#fef3c7',
  },
  paymentBadgeCard: {
    backgroundColor: colors.isDark ? '#172554' : '#eff6ff',
  },
  paymentBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  paymentTextPaid: {
    color: colors.isDark ? '#6ee7b7' : '#065f46',
  },
  paymentTextPending: {
    color: colors.isDark ? '#fcd34d' : '#92400e',
  },
  paymentTextCard: {
    color: colors.isDark ? '#93c5fd' : '#1d4ed8',
  },
  feeDivider: {
    height: 1,
    marginVertical: 8,
    opacity: 0.6,
  },
  feeItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  feeItemLabel: {
    fontSize: 12,
  },
  feeItemValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  feeTotalRow: {
    borderTopWidth: 1,
    paddingTop: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  feeTotalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  feeTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  paymentMethodText: {
    fontSize: 11,
    marginLeft: 5,
  },
});

export default AppointmentsScreen;
