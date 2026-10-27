import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SectionList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Linking, Platform, Image } from 'react-native';
import api from '../../api/axios';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import CustomAlertModal from '../../components/CustomAlertModal';
import * as Location from 'expo-location';

const DoctorSearch = ({ navigation, route }) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [travelFeeRate, setTravelFeeRate] = useState(50);
  const { colors } = useTheme();
  
  const styles = getStyles(colors);
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('10:00 AM');
  const [symptoms, setSymptoms] = useState('');
  const [patientLocation, setPatientLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [finalFee, setFinalFee] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'success', title: '', message: '' });
  const [viewMapDoc, setViewMapDoc] = useState(null);

  const resolveImage = (imgPath) => {
    if (!imgPath) return null;
    if (imgPath.startsWith('http') || imgPath.startsWith('data:image')) return imgPath;
    const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'http://localhost:5000';
    return `${baseUrl}${imgPath}`;
  };

  const handleSeeOnMap = (doc) => {
    if (doc.locationLat && doc.locationLng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${doc.locationLat},${doc.locationLng}(Dr. ${doc.user?.fullName || 'Doctor'})`,
        android: `geo:0,0?q=${doc.locationLat},${doc.locationLng}(Dr. ${doc.user?.fullName || 'Doctor'})`,
        default: `https://www.google.com/maps/search/?api=1&query=${doc.locationLat},${doc.locationLng}`
      });
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${doc.locationLat},${doc.locationLng}`);
      });
    } else {
      Alert.alert('Location Notice', `${doc.user?.fullName || 'Doctor'} has not pinned an exact map location yet. Address: ${doc.address || doc.workingHospital || 'Available on request'}`);
    }
  };

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

  const filteredDoctors = doctors.filter(doc => 
    doc.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    doc.specialization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (doctors.length > 0 && (route?.params?.prefill || route?.params?.professionalId)) {
      const found = doctors.find(d => 
        (route.params.professionalId && d.id === route.params.professionalId) ||
        (route.params.prefill && d.user?.fullName?.toLowerCase().includes(route.params.prefill.toLowerCase()))
      );
      if (found) {
        handleOpenBook(found);
      } else if (route.params.prefill) {
        setSearchQuery(route.params.prefill);
      }
    }
  }, [route?.params?.prefill, route?.params?.professionalId, doctors.length]);

  const fetchDoctors = async () => {
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

      const response = await api.get('/patient/doctors');
      let allDocs = response.data.verifiedDoctors || [];

      // Filter removed to keep all items, we will split them in render
      
      setDoctors(allDocs);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to fetch doctors' });
    }
  };

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

  const handleOpenBook = async (doctor) => {
    setSelectedDoc(doctor);
    setBookDate(getTodayStr());
    setBookTime('10:00 AM');
    setSymptoms('');
    setDistance(null);
    setPaymentMethod('CASH');
    setFinalFee(doctor.bookingFee || 0);
    setBookModalVisible(true);
    
    if (doctor.locationLat && doctor.locationLng) {
      setIsCalculating(true);
      let locLat = null;
      let locLng = null;
      
      if (patientLocation && patientLocation.lat) {
         locLat = patientLocation.lat;
         locLng = patientLocation.lng;
      } else {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            let loc = await Location.getCurrentPositionAsync({});
            locLat = loc.coords.latitude;
            locLng = loc.coords.longitude;
            setPatientLocation({ lat: locLat, lng: locLng });
          }
        } catch(err) {
          console.log("Location error", err);
        }
      }
      
      if (locLat && locLng) {
         const rawDist = calculateDistance(locLat, locLng, doctor.locationLat, doctor.locationLng); 
         const distKm = Number(rawDist.toFixed(1));
         setDistance(distKm);
         const baseFee = doctor.bookingFee || 0;
         const distFee = Math.round(distKm * travelFeeRate);
         setFinalFee(baseFee + distFee);
      }
      setIsCalculating(false);
    }
  };

  const handleBookSubmit = async () => {
    if (!bookDate) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Please select or enter a date' });
      return;
    }
    if (isBooking) return;
    setIsBooking(true);
    try {
      const scheduledDate = getCombinedDateTime(bookDate, bookTime);
      await api.post('/patient/appointment', {
        professionalId: selectedDoc.id,
        scheduledDate, 
        symptoms: symptoms || 'General Checkup',
        serviceType: 'Consultation',
        locationLat: patientLocation ? patientLocation.lat : null,
        locationLng: patientLocation ? patientLocation.lng : null,
        totalAmount: finalFee,
        paymentMethod: paymentMethod
      });
      setAlertConfig({ visible: true, type: 'success', title: 'Success', message: 'Appointment booked successfully!' });
      setBookModalVisible(false);
      setBookDate('');
      setSymptoms('');
    } catch (error) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: error.response?.data?.message || 'Failed to book appointment' });
    } finally {
      setIsBooking(false);
    }
  };

  const renderDoctor = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.doctorInfo}>
        {item.profileImage ? (
          <Image 
            source={{ uri: resolveImage(item.profileImage) }} 
            style={[styles.avatar, { width: 50, height: 50, borderRadius: 25 }]} 
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.user.fullName.charAt(0)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>Dr. {item.user.fullName}</Text>
          <View style={styles.specContainer}>
            {item.specialization ? item.specialization.split(',').map((spec, idx) => (
              <View key={idx} style={styles.specBadge}>
                <Text style={styles.specBadgeText}>{spec.trim()}</Text>
              </View>
            )) : (
              <Text style={styles.specialization}>General</Text>
            )}
          </View>
          <Text style={styles.hospital}>Experience: {item.experienceYears || '5+'} Years</Text>
          {item.user?.phone && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 6}}>
              <Ionicons name="call" size={14} color={colors.textLight} />
              <Text style={{fontSize: 13, color: colors.textLight, marginLeft: 6}}>{item.user.phone}</Text>
            </View>
          )}
          {item.workingHospital && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <Ionicons name="business" size={14} color={colors.textLight} />
              <Text style={{fontSize: 13, color: colors.textLight, marginLeft: 6}}>{item.workingHospital}</Text>
            </View>
          )}
          {item.address && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <Ionicons name="location" size={14} color={colors.textLight} />
              <Text style={{fontSize: 13, color: colors.textLight, marginLeft: 6}}>{item.address}</Text>
            </View>
          )}
        </View>
      </View>
      
      
      <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, marginBottom: 15, borderTopWidth: 1, borderColor: colors.border, paddingTop: 10, paddingHorizontal: 5}}>
         <View style={{alignItems: 'center'}}>
           <Text style={{fontSize: 11, color: colors.textLight, marginBottom: 2}}>Booking Fee</Text>
           <Text style={{fontWeight: 'bold', color: colors.text, fontSize: 13}}>Rs. {item.bookingFee || 0}</Text>
         </View>
         {(item._distance !== undefined && !isNaN(item._distance)) ? (
           (() => {
             const distKm = Number(item._distance.toFixed(1));
             const travelFee = Math.round(distKm * (travelFeeRate || 50));
             return (
               <>
                 <View style={{alignItems: 'center'}}>
                   <Text style={{fontSize: 11, color: colors.textLight, marginBottom: 2}}>Travel ({distKm} km)</Text>
                   <Text style={{fontWeight: 'bold', color: colors.text, fontSize: 13}}>Rs. {travelFee}</Text>
                 </View>
                 <View style={{alignItems: 'center'}}>
                   <Text style={{fontSize: 12, color: colors.primary, fontWeight: 'bold', marginBottom: 2}}>Total Fee</Text>
                   <Text style={{fontWeight: 'bold', color: colors.primary, fontSize: 14}}>Rs. {(item.bookingFee || 0) + travelFee}</Text>
                 </View>
               </>
             );
           })()
         ) : (
           <View style={{alignItems: 'flex-end', flex: 1}}>
               <Text style={{fontSize: 12, color: colors.primary, fontWeight: 'bold', marginBottom: 2}}>Total Fee</Text>
               <Text style={{fontWeight: 'bold', color: colors.primary, fontSize: 14}}>Rs. {item.bookingFee || 0}</Text>
           </View>
         )}
      </View>
      <View style={{
        flexDirection: 'row', 
        gap: 10,
        marginTop: 6,
        justifyContent: Platform.OS === 'web' ? 'flex-end' : 'stretch'
      }}>
        <TouchableOpacity 
          style={styles.seeOnMapBtn} 
          onPress={() => handleSeeOnMap(item)}
        >
          <Ionicons name="map-outline" size={16} color={colors.primary} />
          <Text style={styles.seeOnMapText}>See on Map</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bookButton} 
          onPress={() => handleOpenBook(item)}
        >
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  const nearbyData = [];
  const othersData = [];

  filteredDoctors.forEach(doc => {
    let isNearby = false;
    if (patientLocation && doc.locationLat && doc.locationLng && doc.serviceRadius) {
      const dist = calculateDistance(patientLocation.lat, patientLocation.lng, doc.locationLat, doc.locationLng);
      doc._distance = !isNaN(dist) ? Number(dist.toFixed(1)) : undefined;
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

      <Text style={styles.headerTitle}>Find a Doctor</Text>
      
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
        <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 50}} />
      ) : filteredDoctors.length === 0 ? (
        <Text style={styles.noData}>No doctors found.</Text>
      ) : (
        <SectionList
          sections={[
            { title: 'Available Nearby', data: nearbyData },
            { title: 'Others (Call to confirm)', data: othersData }
          ].filter(s => s.data.length > 0)}
          keyExtractor={item => item.id.toString()}
          renderItem={renderDoctor}
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
            <Text style={styles.modalTitle}>Book with Dr. {selectedDoc?.user?.fullName}</Text>
            
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

            {isCalculating ? (
              <Text style={{color: colors.primary, marginTop: 10, fontWeight: 'bold'}}>Calculating Distance & Fee...</Text>
            ) : (
              <View style={{backgroundColor: colors.surfaceLight, padding: 10, borderRadius: 8, marginTop: 15, borderWidth: 1, borderColor: colors.border}}>
                <Text style={{color: colors.text, fontWeight: 'bold', marginBottom: 5}}>Fee Breakdown:</Text>
                <Text style={{color: colors.textLight, fontSize: 13}}>Base Booking Fee: Rs. {selectedDoc?.bookingFee || 0}</Text>
                {distance && <Text style={{color: colors.textLight, fontSize: 13}}>Distance Charge ({distance} km @ Rs. {travelFeeRate}/km): Rs. {Math.round(distance * travelFeeRate)}</Text>}
                <Text style={{color: colors.success, fontWeight: 'bold', fontSize: 16, marginTop: 5}}>Total: Rs. {finalFee}</Text>
              </View>
            )}

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
                  color={paymentMethod === 'CASH' ? colors.primary : colors.textLight} 
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
                  color={paymentMethod === 'CARD' ? colors.primary : colors.textLight} 
                />
                <Text style={[
                  styles.paymentOptionText,
                  paymentMethod === 'CARD' && styles.paymentOptionTextActive
                ]}>
                  Card Payment
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Symptoms</Text>
            <TextInput 
              style={[styles.input, {height: 80}]} 
              placeholder="e.g. Fever, Cough" 
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
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    padding: SIZES.padding,
    ...(Platform.OS === 'web' ? { width: '100%', maxWidth: 1000, alignSelf: 'center' } : {})
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: SIZES.radius, paddingHorizontal: 15, marginBottom: 20, height: 45, borderWidth: 1, borderColor: colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  noData: { color: colors.textLight, fontStyle: 'italic', textAlign: 'center', marginTop: 50 },
  card: { 
    backgroundColor: colors.surface, 
    borderRadius: SIZES.radius, 
    padding: 18, 
    marginBottom: 16, 
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  doctorInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
  name: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  specContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, marginBottom: 4 },
  specBadge: { backgroundColor: colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  specBadgeText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
  specialization: { fontSize: 14, color: colors.primary, marginTop: 2 },
  hospital: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  bookButton: { 
    backgroundColor: colors.primary, 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 8, 
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    ...(Platform.OS === 'web' ? { flexGrow: 0, minWidth: 160 } : { flex: 1 }),
  },
  bookButtonText: { color: colors.surface, fontWeight: 'bold', fontSize: 13 },
  seeOnMapBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight || colors.surface,
    minHeight: 40,
    ...(Platform.OS === 'web' ? { flexGrow: 0, minWidth: 140 } : {}),
  },
  seeOnMapText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
  noData: { textAlign: 'center', marginTop: 50, color: colors.textLight },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { 
    backgroundColor: colors.surface, 
    borderRadius: SIZES.radiusLg, 
    padding: 24,
    width: '100%',
    maxWidth: 550,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  label: { fontSize: 14, color: colors.textLight, marginBottom: 8, marginTop: 10 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text, backgroundColor: colors.background },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 30, gap: 15 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 20 },
  cancelText: { color: colors.textLight, fontWeight: 'bold' },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: SIZES.radius },
  submitText: { color: '#fff', fontWeight: 'bold' },
  quickChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  quickChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
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
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  paymentOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textLight,
  },
  paymentOptionTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default DoctorSearch;
