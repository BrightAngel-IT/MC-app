import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SectionList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import CustomAlertModal from '../../components/CustomAlertModal';

const LabTechSearch = ({ route }) => {
  const { colors } = useTheme();
  const [labTechs, setLabTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientLocation, setPatientLocation] = useState(null);
  const [travelFeeRate, setTravelFeeRate] = useState(50);
  
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);
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

  const filteredTechs = labTechs.filter(t => 
    t.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = getStyles(colors);

  useEffect(() => {
    fetchLabTechs();
  }, []);

  useEffect(() => {
    if (labTechs.length > 0 && (route?.params?.prefill || route?.params?.professionalId)) {
      const found = labTechs.find(t => 
        (route.params.professionalId && t.id === route.params.professionalId) ||
        (route.params.prefill && t.fullName?.toLowerCase().includes(route.params.prefill.toLowerCase()))
      );
      if (found) {
        handleOpenBook(found);
      } else if (route.params.prefill) {
        setSearchQuery(route.params.prefill);
      }
    }
  }, [route?.params?.prefill, route?.params?.professionalId, labTechs.length]);

  const fetchLabTechs = async () => {
    try { const res = await api.get('/settings'); if (res.data && res.data.DISTANCE_CHARGE_PER_KM) setTravelFeeRate(Number(res.data.DISTANCE_CHARGE_PER_KM)); } catch(e) {}
    try {
      const response = await api.get('/patient/lab-techs');
      setLabTechs(response.data.verifiedLabTechs || []);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to fetch lab technicians' });
    }
  };

  const handleOpenBook = (tech) => {
    setSelectedTech(tech);
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
        professionalId: selectedTech.id,
        scheduledDate, 
        symptoms: symptoms || 'Medical Test Required',
        serviceType: 'Medical Test',
        totalAmount: selectedTech?.bookingFee || 0,
        paymentMethod: paymentMethod
      });
      setAlertConfig({ visible: true, type: 'success', title: 'Success', message: 'Medical test appointment requested successfully!' });
      setBookModalVisible(false);
      setBookDate('');
      setBookTime('10:00 AM');
      setSymptoms('');
    } catch (error) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: error.response?.data?.message || 'Failed to request test' });
    } finally {
      setIsBooking(false);
    }
  };

  const renderTech = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.fullName?.charAt(0) || 'L'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.specialization}>{item.specialization || 'Lab Technician'}</Text>
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
          <Text style={styles.ratingText}>{item.rating || '4.5'}</Text>
        </View>
      </View>

      <Text style={styles.bio} numberOfLines={2}>
        Certified laboratory technician available for blood tests, sample collection, and analysis.
      </Text>

      <TouchableOpacity 
        style={styles.bookBtn}
        onPress={() => handleOpenBook(item)}
      >
        <Text style={styles.bookBtnText}>Book Test</Text>
      </TouchableOpacity>
    </View>
  );
  const nearbyData = [];
  const othersData = [];

  filteredTechs.forEach(doc => {
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
        <FontAwesome5 name="microscope" size={24} color={colors.roles.LAB_TECH.primary} style={{marginBottom: 12}} />
        <Text style={styles.heroTitle}>Medical Tests & Labs</Text>
        <Text style={styles.heroSub}>Find verified lab technicians for sample collection and analysis.</Text>
      </View>

      <Text style={styles.sectionTitle}>Available Lab Technicians</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or specialty..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.roles.LAB_TECH.primary} style={{marginTop: 50}} />
      ) : filteredTechs.length === 0 ? (
        <Text style={{textAlign: 'center', marginTop: 50, color: colors.textLight}}>No lab technicians found.</Text>
      ) : (
        <SectionList
          sections={[
            { title: 'Available Nearby', data: nearbyData },
            { title: 'Others (Call to confirm)', data: othersData }
          ].filter(s => s.data.length > 0)}
          keyExtractor={item => item.id.toString()}
          renderItem={renderTech}
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
            <Text style={styles.modalTitle}>Book {selectedTech?.fullName}</Text>
            
            <Text style={styles.label}>Appointment Date</Text>
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
              placeholder="YYYY-MM-DD" 
              value={bookDate} 
              onChangeText={setBookDate} 
            />

            <Text style={styles.label}>Appointment Time</Text>
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
              placeholder="e.g. 10:00 AM" 
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
                  color={paymentMethod === 'CASH' ? colors.roles.LAB_TECH.primary : colors.textLight} 
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
                  color={paymentMethod === 'CARD' ? colors.roles.LAB_TECH.primary : colors.textLight} 
                />
                <Text style={[
                  styles.paymentOptionText,
                  paymentMethod === 'CARD' && styles.paymentOptionTextActive
                ]}>
                  Card Payment
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Required Tests / Notes</Text>
            <TextInput 
              style={[styles.input, {height: 80}]} 
              placeholder="e.g. Complete Blood Count, Fasting Blood Sugar" 
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
    backgroundColor: colors.roles.LAB_TECH.bgTint,
    padding: 20,
    borderRadius: SIZES.radiusLg,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.roles.LAB_TECH.accent,
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
    padding: 16, 
    marginBottom: 16, 
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.roles.LAB_TECH.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: colors.roles.LAB_TECH.primary },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  specialization: { fontSize: 13, color: colors.roles.LAB_TECH.primary, fontWeight: '600' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { marginLeft: 4, fontSize: 12, fontWeight: 'bold', color: '#92400e' },
  bio: { fontSize: 13, color: colors.textLight, lineHeight: 20, marginBottom: 16 },
  bookBtn: { backgroundColor: colors.roles.LAB_TECH.primary, paddingVertical: 12, borderRadius: SIZES.radius, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, width: '100%', borderRadius: SIZES.radiusLg, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  label: { fontSize: 13, color: colors.text, fontWeight: '600', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: SIZES.radius, backgroundColor: colors.surfaceLight },
  cancelText: { color: colors.text, fontWeight: 'bold' },
  submitBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: SIZES.radius, backgroundColor: colors.roles.LAB_TECH.primary },
  submitText: { color: '#fff', fontWeight: 'bold' },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  quickChipActive: {
    backgroundColor: colors.roles.LAB_TECH.primary,
    borderColor: colors.roles.LAB_TECH.primary,
  },
  quickChipText: {
    fontSize: 12,
    color: colors.text,
  },
  quickChipTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
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
    borderColor: colors.roles.LAB_TECH.primary,
    backgroundColor: colors.roles.LAB_TECH.primary + '15',
  },
  paymentOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textLight,
  },
  paymentOptionTextActive: {
    color: colors.roles.LAB_TECH.primary,
    fontWeight: 'bold',
  },
});

export default LabTechSearch;
