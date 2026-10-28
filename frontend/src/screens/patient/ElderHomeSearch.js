import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SectionList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, Linking, Image, Platform } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import CustomAlertModal from '../../components/CustomAlertModal';

const ElderHomeSearch = ({ navigation }) => {
  const { colors } = useTheme();
  const [elderHomes, setElderHomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientLocation, setPatientLocation] = useState(null);
  const [travelFeeRate, setTravelFeeRate] = useState(50);
  
  const [bookModalVisible, setBookModalVisible] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState(null);
  const [bookDate, setBookDate] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'success', title: '', message: '' });

  const handleSeeOnMap = (home) => {
    if (home.locationLat && home.locationLng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${home.locationLat},${home.locationLng}(${home.fullName || 'Elder Home'})`,
        android: `geo:0,0?q=${home.locationLat},${home.locationLng}(${home.fullName || 'Elder Home'})`,
        default: `https://www.google.com/maps/search/?api=1&query=${home.locationLat},${home.locationLng}`
      });
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${home.locationLat},${home.locationLng}`);
      });
    } else {
      Alert.alert('Location Notice', `${home.fullName || 'Elder Home'} has not pinned an exact map location yet. Address: ${home.address || home.workingHospital || 'Available on request'}`);
    }
  };

  const filteredElderHomes = elderHomes.filter(c => 
    c.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = getStyles(colors);

  useEffect(() => {
    fetchElderHomes();
  }, []);

  const fetchElderHomes = async () => {
    try { const res = await api.get('/settings'); if (res.data && res.data.DISTANCE_CHARGE_PER_KM) setTravelFeeRate(Number(res.data.DISTANCE_CHARGE_PER_KM)); } catch(e) {}
    try {
      const response = await api.get('/patient/elder-homes');
      setElderHomes(response.data.verifiedElderHomes || []);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Failed to fetch elderHomes' });
    }
  };

  const resolveImage = (imgPath) => {
    if (!imgPath) return null;
    let url = imgPath;
    if (url.includes('localhost:5000')) {
      url = url.replace('http://localhost:5000', 'https://mcbackend.crescereluna.com');
    }
    if (url.startsWith('http') || url.startsWith('data:image')) return url;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'https://mcbackend.crescereluna.com';
    return `${baseUrl}${cleanPath}`;
  };

  const handleOpenBook = (caregiver) => {
    setSelectedCaregiver(caregiver);
    setBookModalVisible(true);
  };

  const handleBookSubmit = async () => {
    if (!bookDate) {
      setAlertConfig({ visible: true, type: 'error', title: 'Error', message: 'Please enter a date' });
      return;
    }
    if (isBooking) return;
    setIsBooking(true);
    try {
      await api.post('/patient/appointment', {
        professionalId: selectedCaregiver.id,
        scheduledDate: new Date(bookDate).toISOString(), 
        symptoms: symptoms || 'Elder Care / General Assistance',
        serviceType: 'Caregiver'
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

  const renderElderHome = ({ item }) => {
    const profileUri = resolveImage(item.profileImage);
    const coverUri = resolveImage(item.coverImage);
    const phone = item.contactPhone || item.user?.phone;

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ElderHomeDetail', { 
          id: item.id || item.userId, 
          elderHomeId: item.id || item.userId, 
          elderHome: item 
        })}
      >
        {coverUri ? (
          <Image source={{ uri: coverUri }} style={styles.cardCover} resizeMode="cover" />
        ) : null}

        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            {profileUri ? (
              <Image source={{ uri: profileUri }} style={{ width: 50, height: 50, borderRadius: 25 }} />
            ) : (
              <Text style={styles.avatarText}>{item.fullName?.charAt(0) || 'E'}</Text>
            )}
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.name}>{item.fullName}</Text>
            <Text style={styles.specialization}>Owner: {item.specialization || 'In-charge'}</Text>
            {phone && (
              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                <Ionicons name="call" size={12} color={colors.textLight} />
                <Text style={{fontSize: 12, color: colors.textLight, marginLeft: 6}}>{phone}</Text>
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
            <Text style={styles.ratingText}>{item.rating || '4.8'}</Text>
          </View>
        </View>

        <View style={styles.featureChipsRow}>
          <View style={styles.featureChip}>
            <MaterialCommunityIcons name="newspaper-variant" size={12} color={colors.primary} />
            <Text style={styles.featureChipText}>{item.postsCount ? `${item.postsCount} Updates` : 'Ads & Feed'}</Text>
          </View>
          <View style={styles.featureChip}>
            <MaterialCommunityIcons name="currency-usd" size={12} color="#10b981" />
            <Text style={[styles.featureChipText, { color: '#10b981' }]}>{item.servicesCount ? `${item.servicesCount} Packages` : 'Services & Rates'}</Text>
          </View>
          <View style={styles.featureChip}>
            <Ionicons name="shield-checkmark" size={12} color="#6366f1" />
            <Text style={[styles.featureChipText, { color: '#6366f1' }]}>Verified</Text>
          </View>
        </View>

        {/* Social Links Quick Badges */}
        {(item.socialFacebook || item.socialInstagram || item.socialWebsite) ? (
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {item.socialFacebook ? (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1877F212', borderWidth: 1, borderColor: '#1877F235', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 }}
                onPress={() => {
                  const url = item.socialFacebook.startsWith('http') ? item.socialFacebook : `https://${item.socialFacebook}`;
                  Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open Facebook link'));
                }}
              >
                <FontAwesome5 name="facebook" size={11} color="#1877F2" />
                <Text style={{ fontSize: 11, color: '#1877F2', fontWeight: '600' }}>Facebook</Text>
              </TouchableOpacity>
            ) : null}

            {item.socialInstagram ? (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E1306C12', borderWidth: 1, borderColor: '#E1306C35', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 }}
                onPress={() => {
                  const url = item.socialInstagram.startsWith('http') ? item.socialInstagram : `https://${item.socialInstagram}`;
                  Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open Instagram link'));
                }}
              >
                <FontAwesome5 name="instagram" size={11} color="#E1306C" />
                <Text style={{ fontSize: 11, color: '#E1306C', fontWeight: '600' }}>Instagram</Text>
              </TouchableOpacity>
            ) : null}

            {item.socialWebsite ? (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0284c712', borderWidth: 1, borderColor: '#0284c735', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, gap: 4 }}
                onPress={() => {
                  const url = item.socialWebsite.startsWith('http') ? item.socialWebsite : `https://${item.socialWebsite}`;
                  Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open Website link'));
                }}
              >
                <Ionicons name="globe-outline" size={12} color="#0284c7" />
                <Text style={{ fontSize: 11, color: '#0284c7', fontWeight: '600' }}>Website</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.bio} numberOfLines={2}>
          {item.facilities || 'Dedicated elder care facility with full-time boarding, dining, doctor visits and caregiver support.'}
        </Text>

        <View style={styles.cardActionsRow}>
          <TouchableOpacity 
            style={styles.seeOnMapBtn}
            onPress={() => handleSeeOnMap(item)}
          >
            <Ionicons name="map-outline" size={15} color={colors.primary} />
            <Text style={styles.seeOnMapBtnText}>Map</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.viewProfileBtn, { flex: 1 }]}
            onPress={() => navigation.navigate('ElderHomeDetail', { 
              id: item.id || item.userId, 
              elderHomeId: item.id || item.userId, 
              elderHome: item 
            })}
          >
            <Ionicons name="eye-outline" size={16} color={colors.roles.CAREGIVER.primary} />
            <Text style={styles.viewProfileBtnText}>View Posts & Details</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactBtn}
            onPress={() => phone ? Linking.openURL(`tel:${phone}`) : Alert.alert('Notice', 'No phone number available.')}
          >
            <Ionicons name="call" size={15} color="#ffffff" />
            <Text style={styles.contactBtnText}>Call</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };
  const nearbyData = [];
  const othersData = [];

  filteredElderHomes.forEach(doc => {
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
        <Text style={styles.heroSub}>Find verified elder homes in your area for your loved ones.</Text>
      </View>

      <Text style={styles.sectionTitle}>Available Elder Homes</Text>

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
      ) : filteredElderHomes.length === 0 ? (
        <Text style={{textAlign: 'center', marginTop: 50, color: colors.textLight}}>No elderHomes found.</Text>
      ) : (
        <SectionList
          sections={[
            { title: 'Available Nearby', data: nearbyData },
            { title: 'Others (Call to confirm)', data: othersData }
          ].filter(s => s.data.length > 0)}
          keyExtractor={item => item.id.toString()}
          renderItem={renderElderHome}
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
            
            <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 2026-10-01" 
              value={bookDate} 
              onChangeText={setBookDate} 
            />

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
  container: { flex: 1, backgroundColor: colors.background, padding: SIZES.padding },
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
    padding: 16, 
    marginBottom: 16, 
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardCover: {
    width: '100%',
    height: 120,
    borderRadius: SIZES.radius - 2,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.roles.CAREGIVER.primary + '20', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: colors.roles.CAREGIVER.primary },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 2 },
  specialization: { fontSize: 13, color: colors.roles.CAREGIVER.primary, fontWeight: '600' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  ratingText: { marginLeft: 4, fontSize: 12, fontWeight: 'bold', color: '#92400e' },
  featureChipsRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  featureChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight || colors.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4, borderWidth: 1, borderColor: colors.border },
  featureChipText: { fontSize: 11, fontWeight: '600', color: colors.text },
  bio: { fontSize: 13, color: colors.textLight, lineHeight: 18, marginBottom: 14 },
  cardActionsRow: { flexDirection: 'row', gap: 8 },
  viewProfileBtn: { flex: 1.2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.roles.CAREGIVER.primary, paddingVertical: 10, borderRadius: SIZES.radius, gap: 6 },
  viewProfileBtnText: { color: colors.roles.CAREGIVER.primary, fontSize: 13, fontWeight: 'bold' },
  contactBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.roles.CAREGIVER.primary, paddingVertical: 10, borderRadius: SIZES.radius, gap: 6 },
  contactBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  seeOnMapBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1.5, 
    borderColor: colors.primary, 
    paddingHorizontal: 10, 
    paddingVertical: 10, 
    borderRadius: SIZES.radius, 
    gap: 4,
    backgroundColor: colors.surfaceLight || colors.background
  },
  seeOnMapBtnText: { color: colors.primary, fontSize: 13, fontWeight: 'bold' },
  bookBtn: { backgroundColor: colors.roles.CAREGIVER.primary, paddingVertical: 12, borderRadius: SIZES.radius, alignItems: 'center' },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, width: '100%', borderRadius: SIZES.radiusLg, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  label: { fontSize: 13, color: colors.text, fontWeight: '600', marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: SIZES.radius, backgroundColor: colors.surfaceLight },
  cancelText: { color: colors.text, fontWeight: 'bold' },
  submitBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: SIZES.radius, backgroundColor: colors.roles.CAREGIVER.primary },
  submitText: { color: '#fff', fontWeight: 'bold' },
});

export default ElderHomeSearch;
