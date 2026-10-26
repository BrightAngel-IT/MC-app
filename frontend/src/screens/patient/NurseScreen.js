import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SectionList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import CustomAlertModal from '../../components/CustomAlertModal';
import * as Location from 'expo-location';

const NurseScreen = ({ route }) => {
  const { colors } = useTheme();
  const [nurses, setNurses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [travelFeeRate, setTravelFeeRate] = useState(50);
  
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('10:00 AM');
  const [symptoms, setSymptoms] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'success', title: '', message: '' });
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [patientLocation, setPatientLocation] = useState(null);

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getTomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const setQuickDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setBookDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
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

  const filteredNurses = nurses.filter(n => 
    n.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = getStyles(colors);

  useEffect(() => {
    fetchNurses();
  }, []);

  useEffect(() => {
    if (nurses.length > 0 && (route?.params?.prefill || route?.params?.professionalId)) {
      const found = nurses.find(n => 
        (route.params.professionalId && n.id === route.params.professionalId) ||
        (route.params.prefill && n.fullName?.toLowerCase().includes(route.params.prefill.toLowerCase()))
      );
      if (found) {
        handleOpenBook(found);
      } else if (route.params.prefill) {
        setSearchQuery(route.params.prefill);
      }
    }
  }, [route?.params?.prefill, route?.params?.professionalId, nurses.length]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchNurses = async () => {
    try { const res = await api.get('/settings'); if (res.data && res.data.DISTANCE_CHARGE_PER_KM) setTravelFeeRate(Number(res.data.DISTANCE_CHARGE_PER_KM)); } catch(e) {}
    try {
      let currentPatientLoc = null;
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          currentPatientLoc = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setPatientLocation(currentPatientLoc);
        }
      } catch (err) {
        console.log("Location fetch on mount failed", err);
      }

      const response = await api.get('/patient/nurses');
      let allDocs = response.data.verifiedNurses || [];

      if (currentPatientLoc) {
        allDocs = allDocs.filter(doc => {
          if (doc.serveEverywhere !== false) return true;
          if (doc.locationLat && doc.locationLng && doc.serviceRadius) {
            const dist = calculateDistance(currentPatientLoc.lat, currentPatientLoc.lng, doc.locationLat, doc.locationLng); 
            return dist <= doc.serviceRadius;
          }
          return false;
        });
      }
      
      setNurses(allDocs);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to fetch nurses' });
    }
  };

  const handleOpenBook = (nurse) => {
    setSelectedNurse(nurse);
    setBookDate(getTodayStr());
    setBookTime('10:00 AM');
    setSymptoms('');
    setPaymentMethod('CASH');
    setBookModalVisible(true);
  };

  const handleBookSubmit = async () => {
    if (!bookDate) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Please select a date' });
      return;
    }
    if (isBooking) return;
    setIsBooking(true);
    try {
      const scheduledDate = getCombinedDateTime(bookDate, bookTime);
      await api.post('/patient/appointment', {
        professionalId: selectedNurse.id,
        scheduledDate, 
        symptoms: symptoms || 'Home Care Required',
        serviceType: 'Home Nursing',
        locationLat: patientLocation ? patientLocation.lat : null,
        locationLng: patientLocation ? patientLocation.lng : null,
        totalAmount: selectedNurse?.bookingFee || 0,
        paymentMethod: paymentMethod
      });
      setAlertConfig({ visible: true, type: 'success', title: 'Success', message: 'Home nurse visit requested successfully!' });
      setBookModalVisible(false);
      setBookDate('');
      setSymptoms('');
    } catch (error) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: error.response?.data?.message || 'Failed to request home visit' });
    } finally {
      setIsBooking(false);
    }
  };

  const renderNurse = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <FontAwesome5 name="user-nurse" size={24} color={colors.roles.NURSE.primary} />
        </View>
        <View style={styles.details}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.role}>{item.specialization || 'Registered Nurse'}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>Exp: {item.experienceYears || '5+'} Years</Text>
            <Text style={styles.statsDot}> • </Text>
            <FontAwesome5 name="star" solid size={12} color="#f59e0b" />
            <Text style={[styles.statsText, {marginLeft: 4}]}>{item.rating || '4.8'}</Text>
          </View>
          {item.user?.phone && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
              <Ionicons name="call" size={12} color={colors.textLight} />
              <Text style={{fontSize: 12, color: colors.textLight, marginLeft: 6}}>{item.user.phone}</Text>
            </View>
          )}
          {item.workingHospital && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <Ionicons name="business" size={12} color={colors.textLight} />
              <Text style={{fontSize: 12, color: colors.textLight, marginLeft: 6}}>{item.workingHospital}</Text>
            </View>
          )}
        </View>
      </View>
      
      <TouchableOpacity style={styles.bookBtn} onPress={() => handleOpenBook(item)}>
        <Text style={styles.bookBtnText}>Request Home Visit</Text>
      </TouchableOpacity>
    </View>
  );
  const nearbyData = [];
  const othersData = [];

  filteredNurses.forEach(doc => {
    let isNearby = false;
    if (patientLocation && doc.locationLat && doc.locationLng && doc.serviceRadius) {
      const dist = calculateDistance(patientLocation.lat, patientLocation.lng, doc.locationLat, doc.locationLng); doc._distance = !isNaN(dist) ? dist : undefined;
      if (dist <= doc.serviceRadius) {
        isNearby = true;
      }
    }
    if (isNearby) {
      nearbyData.push(doc);
    } else {
      othersData.push(doc);
    }
  });

  return (
    <View style={styles.container}>

      <View style={styles.heroBanner}>
        <FontAwesome5 name="home" size={24} color={colors.roles.NURSE.primary} style={{marginBottom: 12}} />
        <Text style={styles.heroTitle}>Professional Home Nursing</Text>
        <Text style={styles.heroSub}>Verified and trained nurses available for home care 24/7.</Text>
      </View>

      <Text style={styles.sectionTitle}>Available Nurses Near You</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search nurses by name..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.roles.NURSE.primary} style={{marginTop: 50}} />
      ) : filteredNurses.length === 0 ? (
        <Text style={{textAlign: 'center', marginTop: 50, color: colors.textLight}}>No nurses found.</Text>
      ) : (
        <SectionList
          sections={[
            { title: 'Available Nearby', data: nearbyData },
            { title: 'Others (Call to confirm)', data: othersData }
          ].filter(s => s.data.length > 0)}
          keyExtractor={item => item.id.toString()}
          renderItem={renderNurse}
          renderSectionHeader={({ section }) => (
             <View style={{ padding: 15, backgroundColor: colors.background, marginTop: 10, borderRadius: SIZES.radius }}>
               <Text style={{ fontSize: 16, fontWeight: 'bold', color: section.title.includes('Others') ? colors.danger || '#ef4444' : colors.primary }}>
                 {section.title}
               </Text>
               {section.title.includes('Others') && (
                 <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                   These professionals are outside your area or offline. Appointments may not be guaranteed, so please contact them directly.
                 </Text>
               )}
             </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Booking Modal */}
      <Modal visible={bookModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request {selectedNurse?.fullName}</Text>
            
            <Text style={styles.label}>Select Date</Text>
            <View style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
              <TouchableOpacity 
                style={[styles.quickChip, bookDate === getTodayStr() && styles.quickChipActive]}
                onPress={() => setQuickDate(0)}
              >
                <Text style={[styles.quickChipText, bookDate === getTodayStr() && styles.quickChipTextActive]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickChip, bookDate === getTomorrowStr() && styles.quickChipActive]}
                onPress={() => setQuickDate(1)}
              >
                <Text style={[styles.quickChipText, bookDate === getTomorrowStr() && styles.quickChipTextActive]}>Tomorrow</Text>
              </TouchableOpacity>
            </View>
            <TextInput 
              style={styles.input} 
              placeholder="Date (YYYY-MM-DD)" 
              value={bookDate} 
              onChangeText={setBookDate} 
            />

            <Text style={styles.label}>Select Time</Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8}}>
              {['09:00 AM', '10:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'].map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[styles.quickChip, bookTime === slot && styles.quickChipActive]}
                  onPress={() => setBookTime(slot)}
                >
                  <Text style={[styles.quickChipText, bookTime === slot && styles.quickChipTextActive]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 10:00 AM or 14:30" 
              value={bookTime} 
              onChangeText={setBookTime} 
            />

            <Text style={styles.label}>Select Payment Method</Text>
            <View style={{flexDirection: 'row', gap: 10, marginBottom: 4}}>
              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  paymentMethod === 'CASH' && styles.paymentOptionCardActive
                ]}
                onPress={() => setPaymentMethod('CASH')}
              >
                <Ionicons 
                  name="cash-outline" 
                  size={18} 
                  color={paymentMethod === 'CASH' ? colors.roles.NURSE.primary : colors.textLight} 
                />
                <Text style={[
                  styles.paymentOptionText,
                  paymentMethod === 'CASH' && styles.paymentOptionTextActive
                ]}>
                  Cash Payment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  paymentMethod === 'CARD' && styles.paymentOptionCardActive
                ]}
                onPress={() => setPaymentMethod('CARD')}
              >
                <Ionicons 
                  name="card-outline" 
                  size={18} 
                  color={paymentMethod === 'CARD' ? colors.roles.NURSE.primary : colors.textLight} 
                />
                <Text style={[
                  styles.paymentOptionText,
                  paymentMethod === 'CARD' && styles.paymentOptionTextActive
                ]}>
                  Card Payment
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Requirements / Symptoms</Text>
            <TextInput 
              style={[styles.input, {height: 80}]} 
              placeholder="e.g. Elderly care, IV drips" 
              multiline 
              value={symptoms} 
              onChangeText={setSymptoms} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, isBooking && { opacity: 0.7 }]} onPress={handleBookSubmit} disabled={isBooking}>
                <Text style={styles.submitText}>{isBooking ? 'Booking...' : 'Confirm Booking'}</Text>
              </TouchableOpacity>
            </View>
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
  container: { flex: 1, backgroundColor: colors.background, padding: SIZES.padding },
  heroBanner: {
    backgroundColor: colors.roles.NURSE.bgTint,
    padding: 24,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    borderColor: colors.roles.NURSE.accent,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 14,
    color: colors.textLight,
    lineHeight: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: SIZES.radius, paddingHorizontal: 15, marginBottom: 20, height: 45, borderWidth: 1, borderColor: colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  card: { 
    backgroundColor: colors.surface, 
    borderRadius: SIZES.radius, 
    padding: 16, 
    marginBottom: 16, 
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.roles.NURSE.bgTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.roles.NURSE.accent,
  },
  details: {
    flex: 1,
  },
  name: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 2 },
  role: { fontSize: 14, color: colors.roles.NURSE.primary, marginBottom: 6 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '500',
  },
  statsDot: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  bookBtn: {
    backgroundColor: colors.roles.NURSE.primary,
    padding: 14,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  bookBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: SIZES.radiusLg, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  label: { fontSize: 14, color: colors.textLight, marginBottom: 8, marginTop: 10 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text, backgroundColor: colors.background },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 30, gap: 15 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  cancelText: { color: colors.textLight, fontWeight: 'bold' },
  submitBtn: { backgroundColor: colors.roles.NURSE.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: SIZES.radius },
  submitText: { color: '#fff', fontWeight: 'bold' },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  quickChipActive: { backgroundColor: colors.roles.NURSE.primary, borderColor: colors.roles.NURSE.primary },
  quickChipText: { fontSize: 12, color: colors.textLight, fontWeight: '600' },
  quickChipTextActive: { color: '#fff', fontWeight: 'bold' },

  paymentOptionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  paymentOptionCardActive: {
    borderColor: colors.roles.NURSE.primary,
    backgroundColor: colors.roles.NURSE.primary + '15',
  },
  paymentOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textLight,
  },
  paymentOptionTextActive: {
    color: colors.roles.NURSE.primary,
    fontWeight: 'bold',
  },
});

export default NurseScreen;
