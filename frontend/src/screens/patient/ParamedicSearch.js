import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SectionList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import CustomAlertModal from '../../components/CustomAlertModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';

const ParamedicSearch = ({ route }) => {
  const { colors } = useTheme();
  const [paramedics, setParamedics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientLocation, setPatientLocation] = useState(null);
  const [travelFeeRate, setTravelFeeRate] = useState(50);
  
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedParamedic, setSelectedParamedic] = useState(null);
  const [bookDate, setBookDate] = useState('');
  const [dateObj, setDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [reason, setReason] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'success', title: '', message: '' });

  const filteredParamedics = paramedics.filter(p => 
    p.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = getStyles(colors);

  useEffect(() => {
    fetchParamedics();
  }, []);

  useEffect(() => {
    if (paramedics.length > 0 && (route?.params?.prefill || route?.params?.professionalId)) {
      const found = paramedics.find(p => 
        (route.params.professionalId && p.id === route.params.professionalId) ||
        (route.params.prefill && p.fullName?.toLowerCase().includes(route.params.prefill.toLowerCase()))
      );
      if (found) {
        handleOpenBook(found);
      } else if (route.params.prefill) {
        setSearchQuery(route.params.prefill);
      }
    }
  }, [route?.params?.prefill, route?.params?.professionalId, paramedics.length]);

  const fetchParamedics = async () => {
    try { const res = await api.get('/settings'); if (res.data && res.data.DISTANCE_CHARGE_PER_KM) setTravelFeeRate(Number(res.data.DISTANCE_CHARGE_PER_KM)); } catch(e) {}
    try {
      const response = await api.get('/patient/paramedics');
      setParamedics(response.data.verifiedParamedics || []);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to fetch paramedics' });
    }
  };

  const fetchCurrentLocation = async () => {
    setIsFetchingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAlertConfig({ visible: true, type: 'error', title: 'Permission denied', message: 'Location permission is required to fetch current location.' });
        setIsFetchingLocation(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      let addressString = `Lat: ${location.coords.latitude}, Lng: ${location.coords.longitude}`;
      if (geocode && geocode.length > 0) {
         const addr = geocode[0];
         addressString = [addr.name, addr.street, addr.city, addr.region].filter(Boolean).join(', ');
      }
      
      setSymptoms(addressString);
    } catch (error) {
      console.error(error);
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to fetch location' });
    }
    setIsFetchingLocation(false);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDateObj(selectedDate);
      setBookDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleOpenBook = (paramedic) => {
    setSelectedParamedic(paramedic);
    setBookModalVisible(true);
  };

  const handleBookSubmit = async () => {
    if (!bookDate) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Please select a date' });
      return;
    }
    if (!reason.trim()) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Please enter a reason for booking' });
      return;
    }
    if (!symptoms) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Please pick your location' });
      return;
    }
    if (isBooking) return;
    setIsBooking(true);
    try {
      await api.post('/patient/appointment', {
        professionalId: selectedParamedic.id,
        scheduledDate: bookDate.toLowerCase() === 'immediate' ? new Date().toISOString() : new Date(bookDate).toISOString(), 
        symptoms: `${reason}\n📍 Location: ${symptoms}`,
        serviceType: 'Ambulance'
      });
      setAlertConfig({ visible: true, type: 'success', title: 'Success', message: 'Ambulance transport requested successfully!' });
      setBookModalVisible(false);
      setBookDate('');
      setSymptoms('');
      setReason('');
    } catch (error) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: error.response?.data?.message || 'Failed to request ambulance' });
    } finally {
      setIsBooking(false);
    }
  };

  const renderParamedic = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.fullName?.charAt(0) || 'P'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.fullName}</Text>
          <Text style={styles.specialization}>{item.specialization || 'Paramedic / EMT'}</Text>
          {item.user?.phone && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <Ionicons name="call" size={12} color={colors.textLight} />
              <Text style={{fontSize: 12, color: colors.textLight, marginLeft: 6}}>{item.user.phone}</Text>
            </View>
          )}
          {(item.attachedHospital || item.ambulanceVehicleNumber) && (
            <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
              <Ionicons name="car" size={12} color={colors.textLight} />
              <Text style={{fontSize: 12, color: colors.textLight, marginLeft: 6}}>{item.attachedHospital ? `${item.attachedHospital} - ` : ''}{item.ambulanceVehicleNumber}</Text>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.bio} numberOfLines={2}>
        Certified paramedic and emergency transport driver. Available for immediate dispatch.
      </Text>

      <TouchableOpacity 
        style={styles.bookBtn}
        onPress={() => handleOpenBook(item)}
      >
        <Text style={styles.bookBtnText}>Request Ambulance</Text>
      </TouchableOpacity>
    </View>
  );
  const nearbyData = [];
  const othersData = [];

  filteredParamedics.forEach(doc => {
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
        <MaterialCommunityIcons name="ambulance" size={26} color={colors.roles.PARAMEDIC.primary} style={{marginBottom: 12}} />
        <Text style={styles.heroTitle}>Ambulance & Transport</Text>
        <Text style={styles.heroSub}>Find verified paramedics and request emergency medical transport.</Text>
      </View>

      <Text style={styles.sectionTitle}>Available Paramedics</Text>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or region..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.roles.PARAMEDIC.primary} style={{marginTop: 50}} />
      ) : filteredParamedics.length === 0 ? (
        <Text style={{textAlign: 'center', marginTop: 50, color: colors.textLight}}>No paramedics found.</Text>
      ) : (
        <SectionList
          sections={[
            { title: 'Available Nearby', data: nearbyData },
            { title: 'Others (Call to confirm)', data: othersData }
          ].filter(s => s.data.length > 0)}
          keyExtractor={item => item.id.toString()}
          renderItem={renderParamedic}
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
            <Text style={styles.modalTitle}>Dispatch {selectedParamedic?.fullName}</Text>
            
            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <View pointerEvents="none">
                <TextInput 
                  style={styles.input} 
                  placeholder="2026-09-15" 
                  value={bookDate} 
                  editable={false}
                />
              </View>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            <Text style={styles.label}>Reason for Booking</Text>
            <TextInput 
              style={[styles.input, {height: 60}]} 
              placeholder="e.g. Patient is unconscious, accident, etc." 
              multiline 
              value={reason} 
              onChangeText={setReason} 
            />

            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 8}}>
              <Text style={[styles.label, {marginTop: 0, marginBottom: 0}]}>Pickup Location</Text>
            </View>

            {symptoms ? (
              <View style={[styles.input, { backgroundColor: colors.surfaceLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 50 }]}>
                <Text style={{flex: 1, color: colors.text}}>{symptoms}</Text>
                <TouchableOpacity onPress={() => setSymptoms('')} style={{padding: 5}}>
                  <Ionicons name="close-circle" size={20} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={{backgroundColor: colors.primary + '15', padding: 15, borderRadius: SIZES.radius, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.primary + '30'}} 
                onPress={fetchCurrentLocation} 
                disabled={isFetchingLocation}
              >
                {isFetchingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="location" size={20} color={colors.primary} />
                )}
                <Text style={{color: colors.primary, fontWeight: 'bold'}}>
                  {isFetchingLocation ? 'Fetching Location...' : 'Pick My Location'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBookModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, isBooking && { opacity: 0.7 }]} onPress={handleBookSubmit} disabled={isBooking}>
                <Text style={styles.submitText}>{isBooking ? 'Dispatching...' : 'Confirm Dispatch'}</Text>
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
    backgroundColor: colors.roles.PARAMEDIC.bgTint,
    padding: 20,
    borderRadius: SIZES.radiusLg,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.roles.PARAMEDIC.accent,
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
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.roles.PARAMEDIC.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: colors.roles.PARAMEDIC.primary },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  specialization: { fontSize: 13, color: colors.roles.PARAMEDIC.primary, fontWeight: '600' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { marginLeft: 4, fontSize: 12, fontWeight: 'bold', color: '#92400e' },
  bio: { fontSize: 13, color: colors.textLight, lineHeight: 20, marginBottom: 16 },
  bookBtn: { backgroundColor: colors.roles.PARAMEDIC.primary, paddingVertical: 12, borderRadius: SIZES.radius, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, width: '100%', borderRadius: SIZES.radiusLg, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  label: { fontSize: 13, color: colors.text, fontWeight: '600', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: SIZES.radius, backgroundColor: colors.surfaceLight },
  cancelText: { color: colors.text, fontWeight: 'bold' },
  submitBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: SIZES.radius, backgroundColor: colors.roles.PARAMEDIC.primary },
  submitText: { color: '#fff', fontWeight: 'bold' },
});

export default ParamedicSearch;
