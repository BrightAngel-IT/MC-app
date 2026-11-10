import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SectionList, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Linking, Platform, Image, ScrollView } from 'react-native';
import api from '../../api/axios';
import { useTheme } from '../../context/themeContext';
import { useLanguage } from '../../context/LanguageContext';
import { SIZES } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import CustomAlertModal from '../../components/CustomAlertModal';
import BookingLocationModal from '../../components/BookingLocationModal';
import { reverseGeocodeCoords } from '../../utils/geocode';
import * as Location from 'expo-location';

const DoctorSearch = ({ navigation, route }) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [travelFeeRate, setTravelFeeRate] = useState(50);
  const { colors } = useTheme();
  const { t } = useLanguage();
  
  const styles = getStyles(colors);
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [patientLocation, setPatientLocation] = useState(null);
  const [visitLocation, setVisitLocation] = useState(null);
  const [visitAddress, setVisitAddress] = useState('');
  const [currentAddressLabel, setCurrentAddressLabel] = useState('');
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [patientProfileAddress, setPatientProfileAddress] = useState('');
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

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const clean = timeStr.trim().toUpperCase();
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const parts = clean.replace(/[^\d:]/g, '').split(':').map(Number);
    let hours = parts[0] || 0;
    let minutes = parts[1] || 0;
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const formatMinutesTo12Hour = (totalMinutes) => {
    let hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const isPM = hours >= 12;
    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
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

  const getAvailableTimeSlots = () => {
    const startStr = selectedDoc?.visitStartHour || '08:00 AM';
    const endStr = selectedDoc?.visitEndHour || '08:00 PM';
    const startMin = parseTimeToMinutes(startStr);
    const endMin = parseTimeToMinutes(endStr);

    const slots = [];
    const step = 90; // 1.5 hours interval
    for (let m = startMin; m <= endMin; m += step) {
      slots.push(formatMinutesTo12Hour(m));
    }
    if (slots.length === 0) {
      slots.push('09:00 AM', '11:00 AM', '02:00 PM', '04:30 PM', '06:00 PM');
    }
    return slots;
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
          if (!visitLocation) {
            setVisitLocation(currentPatientLoc);
            reverseGeocodeCoords(loc.coords.latitude, loc.coords.longitude).then(addr => {
              if (addr && !visitAddress) setVisitAddress(addr);
            });
          }
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

  
  useEffect(() => {
    if (route?.params?.passedVisitLocation) {
      setVisitLocation(route.params.passedVisitLocation);
      if (route.params.passedVisitAddress) {
        setVisitAddress(route.params.passedVisitAddress);
      }
    }
  }, [route?.params?.passedVisitLocation, route?.params?.passedVisitAddress]);

  const handleOpenBook = async (doctor) => {
    // If route passed a visit destination, set it immediately
    if (route?.params?.passedVisitAddress) {
      setVisitAddress(route.params.passedVisitAddress);
    }
    if (route?.params?.passedVisitLocation) {
      setVisitLocation(route.params.passedVisitLocation);
    }
    setSelectedDoc(doctor);
    const today = getTodayStr();
    setBookDate(today);

    // Pick first slot in working hours
    const startStr = doctor.visitStartHour || '08:00 AM';
    const endStr = doctor.visitEndHour || '08:00 PM';
    const startMin = parseTimeToMinutes(startStr);
    const endMin = parseTimeToMinutes(endStr);
    
    // Check current time if booking today
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    let initialSlot = formatMinutesTo12Hour(startMin);
    for (let m = startMin; m <= endMin; m += 90) {
      if (m > currentMin + 15) {
        initialSlot = formatMinutesTo12Hour(m);
        break;
      }
    }

    setBookTime('');
    setSymptoms('');
    setDistance(null);
    setPaymentMethod('CASH');
    setFinalFee(doctor.bookingFee || 0);
    setBookModalVisible(true);
    api.get('/patient/profile').then(res => {
      if (res.data?.address) setPatientProfileAddress(res.data.address);
    }).catch(e => console.log('Profile address fetch error:', e.message));
    
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
         const targetCalcLat = (route?.params?.passedVisitLocation?.lat) || (visitLocation?.lat) || locLat;
         const targetCalcLng = (route?.params?.passedVisitLocation?.lng) || (visitLocation?.lng) || locLng;
         const rawDist = calculateDistance(targetCalcLat, targetCalcLng, doctor.locationLat, doctor.locationLng); 
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
    if (!bookDate || !bookDate.trim()) {
      setAlertConfig({ visible: true, type: 'error', title: 'Invalid Date', message: t('val_select_date_req') });
      return;
    }

    if (!bookTime || !bookTime.trim()) {
      setAlertConfig({ visible: true, type: 'error', title: 'Invalid Time', message: t('val_select_time_req') });
      return;
    }

    if (!visitAddress && !visitLocation?.lat && !patientLocation?.lat) {
      setAlertConfig({ visible: true, type: 'error', title: 'Destination Required 📍', message: t('val_select_destination_req') });
      return;
    }

    if (!symptoms || !symptoms.trim()) {
      setAlertConfig({ visible: true, type: 'error', title: 'Symptoms Required', message: t('val_enter_symptoms_req') });
      return;
    }

    const todayStr = getTodayStr();
    if (bookDate < todayStr) {
      setAlertConfig({ 
        visible: true, 
        type: 'error', 
        title: 'Past Date Not Allowed ❌', 
        message: 'You cannot book an appointment for a past date. Please select Today or a future date.' 
      });
      return;
    }

    const scheduledDateISO = getCombinedDateTime(bookDate, bookTime);
    const appointmentDate = new Date(scheduledDateISO);
    const now = new Date();

    if (appointmentDate.getTime() < now.getTime() - 2 * 60 * 1000) {
      setAlertConfig({ 
        visible: true, 
        type: 'error', 
        title: 'Past Time Not Allowed ❌', 
        message: 'The selected appointment time has already passed. Please choose an upcoming time slot.' 
      });
      return;
    }

    // Validate Doctor's working hours
    if (selectedDoc?.visitStartHour && selectedDoc?.visitEndHour) {
      const selectedMin = parseTimeToMinutes(bookTime);
      const startMin = parseTimeToMinutes(selectedDoc.visitStartHour);
      const endMin = parseTimeToMinutes(selectedDoc.visitEndHour);

      if (selectedMin < startMin || selectedMin > endMin) {
        setAlertConfig({
          visible: true,
          type: 'error',
          title: 'Outside Visiting Hours 🕒',
          message: `Dr. ${selectedDoc.user?.fullName} is available for home visits between ${selectedDoc.visitStartHour} and ${selectedDoc.visitEndHour}. Please pick a time within this duration.`
        });
        return;
      }
    }

    if (isBooking) return;
    setIsBooking(true);
    try {
      await api.post('/patient/appointment', {
        professionalId: selectedDoc.id,
        scheduledDate: scheduledDateISO, 
        symptoms: symptoms.trim(),
        serviceType: 'Consultation',
        locationLat: (visitLocation && visitLocation.lat) ? visitLocation.lat : (patientLocation ? patientLocation.lat : null),
        locationLng: (visitLocation && visitLocation.lng) ? visitLocation.lng : (patientLocation ? patientLocation.lng : null),
        visitAddress: visitAddress || null,
        bookedAtLat: patientLocation ? patientLocation.lat : null,
        bookedAtLng: patientLocation ? patientLocation.lng : null,
        bookedAtAddress: currentAddressLabel || null,
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
          {item.visitStartHour && item.visitEndHour && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <Ionicons name="time" size={14} color={colors.primary} />
              <Text style={{fontSize: 12, color: colors.primary, fontWeight: '600', marginLeft: 6}}>
                Visits: {item.visitStartHour} - {item.visitEndHour}
              </Text>
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
          <Text style={styles.seeOnMapText}>{t('see_on_map')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.bookButton} 
          onPress={() => handleOpenBook(item)}
        >
          <Text style={styles.bookButtonText}>{t('book_appointment_btn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  const nearbyData = [];
  const othersData = [];
  const activeLocation = visitLocation || patientLocation;

  filteredDoctors.forEach(doc => {
    let isNearby = false;
    if (activeLocation && doc.locationLat && doc.locationLng) {
      const dist = calculateDistance(activeLocation.lat, activeLocation.lng, doc.locationLat, doc.locationLng);
      doc._distance = !isNaN(dist) ? Number(dist.toFixed(1)) : undefined;
      const radius = doc.serviceRadius || 25;
      if (dist <= radius) {
        isNearby = true;
      }
    }
    if (isNearby) {
      nearbyData.push(doc);
    } else {
      othersData.push(doc);
    }
  });
  nearbyData.sort((a, b) => ((a._distance ?? 9999) - (b._distance ?? 9999)));
  othersData.sort((a, b) => ((a._distance ?? 9999) - (b._distance ?? 9999)));

  return (
    <View style={styles.container}>

      <Text style={styles.headerTitle}>{t('find_a_doctor')}</Text>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('search_placeholder_doc')}
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Target Location Filter Banner */}
      <TouchableOpacity 
        style={styles.targetLocationBanner}
        onPress={() => setLocationModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.targetLocationLeft}>
          <Ionicons name="location-sharp" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.targetLocationSubText}>{t('searching_near')}</Text>
            <Text style={styles.targetLocationMainText} numberOfLines={1}>
              {visitAddress || 'Current Location'}
            </Text>
          </View>
        </View>
        <View style={styles.changeLocationPill}>
          <Text style={styles.changeLocationText}>{t('change_location')}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 50}} />
      ) : filteredDoctors.length === 0 ? (
        <Text style={styles.noData}>{t('no_professionals_found')}</Text>
      ) : (
        <SectionList
          sections={[
            { title: t('available_nearby'), data: nearbyData, isNearby: true },
            { title: t('other_professionals'), data: othersData, isNearby: false }
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
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
            <Text style={styles.modalTitle}>{t('book_with_professional', { name: `Dr. ${selectedDoc?.user?.fullName || ''}` })}</Text>
            
            <Text style={styles.label}>{t('select_date')}</Text>
            <View style={{flexDirection: 'row', gap: 8, marginBottom: 8}}>
              <TouchableOpacity 
                style={[styles.quickChip, bookDate === getTodayStr() && styles.quickChipActive]}
                onPress={() => setQuickDate(0)}
              >
                <Text style={[styles.quickChipText, bookDate === getTodayStr() && styles.quickChipTextActive]}>{t('today')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickChip, bookDate === getTomorrowStr() && styles.quickChipActive]}
                onPress={() => setQuickDate(1)}
              >
                <Text style={[styles.quickChipText, bookDate === getTomorrowStr() && styles.quickChipTextActive]}>{t('tomorrow')}</Text>
              </TouchableOpacity>
            </View>
            <TextInput 
              style={styles.input} 
              placeholder="Date (YYYY-MM-DD)" 
              value={bookDate} 
              onChangeText={setBookDate} 
            />

            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8}}>
              <Text style={styles.label}>{t('select_time')}</Text>
              {selectedDoc?.visitStartHour && selectedDoc?.visitEndHour ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                  <Ionicons name="time-outline" size={13} color={colors.primary} />
                  <Text style={{fontSize: 11, color: colors.primary, fontWeight: 'bold'}}>
                    {t('visiting_hours', { start: selectedDoc.visitStartHour, end: selectedDoc.visitEndHour })}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8}}>
              {getAvailableTimeSlots().map((slot) => {
                const isSelected = bookTime === slot;
                // If selected date is today, check if this slot is already in the past
                const isToday = bookDate === getTodayStr();
                const now = new Date();
                const currentMin = now.getHours() * 60 + now.getMinutes();
                const slotMin = parseTimeToMinutes(slot);
                const isPastSlot = isToday && slotMin <= currentMin;

                return (
                  <TouchableOpacity
                    key={slot}
                    disabled={isPastSlot}
                    style={[
                      styles.quickChip, 
                      isSelected && styles.quickChipActive,
                      isPastSlot && { opacity: 0.35, backgroundColor: colors.border }
                    ]}
                    onPress={() => setBookTime(slot)}
                  >
                    <Text style={[
                      styles.quickChipText, 
                      isSelected && styles.quickChipTextActive,
                      isPastSlot && { color: colors.textMuted, textDecorationLine: 'line-through' }
                    ]}>
                      {slot}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 10:00 AM or 14:30" 
              value={bookTime} 
              onChangeText={setBookTime} 
            />

            {isCalculating ? (
              <Text style={{color: colors.primary, marginTop: 10, fontWeight: 'bold'}}>{t('calculating_distance_fee')}</Text>
            ) : (
              <View style={{backgroundColor: colors.surfaceLight, padding: 10, borderRadius: 8, marginTop: 15, borderWidth: 1, borderColor: colors.border}}>
                <Text style={{color: colors.text, fontWeight: 'bold', marginBottom: 5}}>{t('fee_breakdown_title')}</Text>
                <Text style={{color: colors.textLight, fontSize: 13}}>{t('base_booking_fee', { fee: selectedDoc?.bookingFee || 0 })}</Text>
                {distance ? <Text style={{color: colors.textLight, fontSize: 13}}>{t('distance_charge_calc', { dist: distance, rate: travelFeeRate, fee: Math.round(distance * travelFeeRate) })}</Text> : null}
                <Text style={{color: colors.success, fontWeight: 'bold', fontSize: 16, marginTop: 5}}>{t('total_display', { total: finalFee })}</Text>
              </View>
            )}

            
            {/* Visit Destination Selector */}
            <Text style={styles.label}>{t('where_should_visit')}</Text>
            <TouchableOpacity 
              style={{
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: colors.surfaceLight || '#F8FAFC',
                borderWidth: 1.5,
                borderColor: visitAddress ? colors.primary : colors.border,
                borderRadius: 10,
                padding: 12,
                marginBottom: 10
              }}
              onPress={() => setLocationModalVisible(true)}
            >
              <Ionicons name="location" size={20} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>
                  {visitAddress ? visitAddress : t('choose_visit_location')}
                </Text>
                {visitLocation?.lat ? (
                  <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 2 }}>
                    Destination GPS: {visitLocation.lat.toFixed(4)}, {visitLocation.lng.toFixed(4)}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
            </TouchableOpacity>

            <Text style={styles.label}>{t('select_payment_method')}</Text>
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
            
            <Text style={styles.label}>{t('symptoms_label')}</Text>
            <TextInput 
              style={[styles.input, {height: 80}]} 
              placeholder={t('symptoms_placeholder')} 
              multiline 
              value={symptoms} 
              onChangeText={setSymptoms} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookModalVisible(false)}>
                <Text style={styles.cancelText}>{t('common_cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, isBooking && { opacity: 0.7 }]} onPress={handleBookSubmit} disabled={isBooking}>
                <Text style={styles.submitText}>{isBooking ? t('booking_in_progress') : t('confirm_booking_btn')}</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BookingLocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        initialVisitLocation={visitLocation}
        initialVisitAddress={visitAddress}
        patientProfileAddress={patientProfileAddress}
        onLocationSelected={(res) => {
          setVisitLocation({ lat: res.lat, lng: res.lng });
          setVisitAddress(res.address);
          if (selectedDoc?.locationLat && selectedDoc?.locationLng) {
            const rawDist = calculateDistance(res.lat, res.lng, selectedDoc.locationLat, selectedDoc.locationLng);
            const distKm = Number(rawDist.toFixed(1));
            setDistance(distKm);
            const baseFee = selectedDoc.bookingFee || 0;
            const distFee = Math.round(distKm * travelFeeRate);
            setFinalFee(baseFee + distFee);
          }
        }}
      />

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
  targetLocationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  targetLocationLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetLocationSubText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  targetLocationMainText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  changeLocationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  changeLocationText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: 'bold',
  },
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    padding: SIZES.padding,
    width: '100%',
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

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  modalContent: { 
    backgroundColor: colors.surface, 
    borderRadius: SIZES.radiusLg, 
    padding: 18,
    width: '100%',
    maxWidth: 550,
    maxHeight: '94%',
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
