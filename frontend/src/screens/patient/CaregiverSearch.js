import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SectionList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import CustomAlertModal from '../../components/CustomAlertModal';

const CaregiverSearch = ({ route }) => {
  const { colors } = useTheme();
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientLocation, setPatientLocation] = useState(null);
  const [travelFeeRate, setTravelFeeRate] = useState(50);
  
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('10:00 AM');
  const [symptoms, setSymptoms] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'success', title: '', message: '' });

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

  const filteredCaregivers = caregivers.filter(c => 
    c.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = getStyles(colors);

  useEffect(() => {
    fetchCaregivers();
  }, []);

  useEffect(() => {
    if (caregivers.length > 0 && (route?.params?.prefill || route?.params?.professionalId)) {
      const found = caregivers.find(c => 
        (route.params.professionalId && c.id === route.params.professionalId) ||
        (route.params.prefill && c.fullName?.toLowerCase().includes(route.params.prefill.toLowerCase()))
      );
      if (found) {
        handleOpenBook(found);
      } else if (route.params.prefill) {
        setSearchQuery(route.params.prefill);
      }
    }
  }, [route?.params?.prefill, route?.params?.professionalId, caregivers.length]);

  const fetchCaregivers = async () => {
    try { const res = await api.get('/settings'); if (res.data && res.data.DISTANCE_CHARGE_PER_KM) setTravelFeeRate(Number(res.data.DISTANCE_CHARGE_PER_KM)); } catch(e) {}
    try {
      const response = await api.get('/patient/caregivers');
      setCaregivers(response.data.verifiedCaregivers || []);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to fetch caregivers' });
    }
  };

  const handleOpenBook = (caregiver) => {
    setSelectedCaregiver(caregiver);
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
        professionalId: selectedCaregiver.id,
        scheduledDate, 
        symptoms: symptoms || 'Elder Care / General Assistance',
        serviceType: 'Caregiver',
        totalAmount: selectedCaregiver?.bookingFee || 0,
        paymentMethod: paymentMethod
      });
      setAlertConfig({ visible: true, type: 'success', title: 'Success', message: 'Caregiver requested successfully!' });
      setBookModalVisible(false);
      setBookDate('');
      setSymptoms('');
    } catch (error) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: error.response?.data?.message || 'Failed to request caregiver' });
    } finally {
      setIsBooking(false);
    }
  };

  const renderCaregiver = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.fullName?.charAt(0) || 'C'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.specialization}>{item.specialization || 'Caregiver'}</Text>
          {item.user?.phone && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <Ionicons name="call" size={12} color={colors.textLight} />
              <Text style={{fontSize: 12, color: colors.textLight, marginLeft: 6}}>{item.user.phone}</Text>
            </View>
          )}
          {(item.workingHospital || item.address) && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <Ionicons name={item.workingHospital ? "business" : "location"} size={12} color={colors.textLight} />
              <Text style={{fontSize: 12, color: colors.textLight, marginLeft: 6}}>{item.workingHospital || item.address}</Text>
            </View>
          )}
        </View>
        <View style={styles.ratingBadge}>
          <FontAwesome5 name="star" solid size={12} color="#fbbf24" />
          <Text style={styles.ratingText}>{item.rating || '4.7'}</Text>
        </View>
      </View>

      <Text style={styles.bio} numberOfLines={2}>
        Compassionate professional available for elder care, daily assistance, and patient support.
      </Text>

      <View style={{
        marginTop: 6,
        alignItems: Platform.OS === 'web' ? 'flex-end' : 'stretch'
      }}>
        <TouchableOpacity 
          style={styles.bookBtn}
          onPress={() => handleOpenBook(item)}
        >
          <Text style={styles.bookBtnText}>Request Caregiver</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  const nearbyData = [];
  const othersData = [];

  filteredCaregivers.forEach(doc => {
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
        <MaterialCommunityIcons name="human-cane" size={26} color={colors.roles.CAREGIVER.primary} style={{marginBottom: 12}} />
        <Text style={styles.heroTitle}>Elder Care & Support</Text>
        <Text style={styles.heroSub}>Find verified caregivers for personal assistance and elder care.</Text>
      </View>

      <Text style={styles.sectionTitle}>Available Caregivers</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or specialization..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.roles.CAREGIVER.primary} style={{marginTop: 50}} />
      ) : filteredCaregivers.length === 0 ? (
        <Text style={{textAlign: 'center', marginTop: 50, color: colors.textLight}}>No caregivers found.</Text>
      ) : (
        <SectionList
          sections={[
            { title: 'Available Nearby', data: nearbyData },
            { title: 'Others (Call to confirm)', data: othersData }
          ].filter(s => s.data.length > 0)}
          keyExtractor={item => item.id.toString()}
          renderItem={renderCaregiver}
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
            <Text style={styles.modalTitle}>Request {selectedCaregiver?.fullName}</Text>
            
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
              placeholder="Start Date (YYYY-MM-DD)" 
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
                  color={paymentMethod === 'CASH' ? colors.roles.CAREGIVER.primary : colors.textLight} 
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
                  color={paymentMethod === 'CARD' ? colors.roles.CAREGIVER.primary : colors.textLight} 
                />
                <Text style={[
                  styles.paymentOptionText,
                  paymentMethod === 'CARD' && styles.paymentOptionTextActive
                ]}>
                  Card Payment
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Requirements / Special Needs</Text>
            <TextInput 
              style={[styles.input, {height: 80}]} 
              placeholder="e.g. Needs help with mobility, medication reminders" 
              multiline 
              value={symptoms} 
              onChangeText={setSymptoms} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, isBooking && { opacity: 0.7 }]} onPress={handleBookSubmit} disabled={isBooking}>
                <Text style={styles.submitText}>{isBooking ? 'Booking...' : 'Confirm Request'}</Text>
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
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    padding: SIZES.padding,
    ...(Platform.OS === 'web' ? { width: '100%', maxWidth: 1000, alignSelf: 'center' } : {})
  },
  heroBanner: {
    backgroundColor: colors.roles.CAREGIVER.bgTint,
    padding: 20,
    borderRadius: SIZES.radiusLg,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.roles.CAREGIVER.accent,
  },
  heroTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
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
    padding: 18, 
    marginBottom: 16, 
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.roles.CAREGIVER.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: colors.roles.CAREGIVER.primary },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  specialization: { fontSize: 13, color: colors.roles.CAREGIVER.primary, fontWeight: '600' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { marginLeft: 4, fontSize: 12, fontWeight: 'bold', color: '#92400e' },
  bio: { fontSize: 13, color: colors.textLight, lineHeight: 20, marginBottom: 16 },
  bookBtn: { 
    backgroundColor: colors.roles.CAREGIVER.primary, 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: SIZES.radius, 
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    ...(Platform.OS === 'web' ? { minWidth: 180 } : {}),
  },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { 
    backgroundColor: colors.surface, 
    width: '100%', 
    maxWidth: 550,
    borderRadius: SIZES.radiusLg, 
    padding: 24 
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  label: { fontSize: 13, color: colors.text, fontWeight: '600', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: SIZES.radius, backgroundColor: colors.surfaceLight },
  cancelText: { color: colors.text, fontWeight: 'bold' },
  submitBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: SIZES.radius, backgroundColor: colors.roles.CAREGIVER.primary },
  submitText: { color: '#fff', fontWeight: 'bold' },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  quickChipActive: { backgroundColor: colors.roles.CAREGIVER.primary, borderColor: colors.roles.CAREGIVER.primary },
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
    borderColor: colors.roles.CAREGIVER.primary,
    backgroundColor: colors.roles.CAREGIVER.primary + '15',
  },
  paymentOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textLight,
  },
  paymentOptionTextActive: {
    color: colors.roles.CAREGIVER.primary,
    fontWeight: 'bold',
  },
});

export default CaregiverSearch;
