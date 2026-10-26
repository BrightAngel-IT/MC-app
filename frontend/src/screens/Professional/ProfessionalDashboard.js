import React, { useState, useEffect, useContext , useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, Modal, TextInput, Switch, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { AuthContext } from '../../context/authContext';
import api from '../../api/axios';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SIZES } from '../../styles/theme';
import TimeFilter from '../../components/TimeFilter';
import RecentsList from '../../components/RecentsList';
import NotificationBell from '../../components/NotificationBell';
import { searchLocationByName } from '../../utils/geocode';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import MapComponent from '../../components/MapComponent';

/* Notifications disabled for localhost
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
*/

const ProfessionalDashboard = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);
  
  const [stats, setStats] = useState({ pending: 0, homeVisits: 0, completed: 0, canceled: 0 });
  const [recents, setRecents] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [todayAppointments, setTodayAppointments] = useState(0);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState({ latitude: 7.8731, longitude: 80.7718, latitudeDelta: 0.1, longitudeDelta: 0.1 });
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
   const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  
  const [serviceRadius, setServiceRadius] = useState('10');
  const [bookingFee, setBookingFee] = useState('0');
  const [isAvailable, setIsAvailable] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [timeFilter])
  );

  
  
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied. Please enable it in settings.');
        setIsGettingLocation(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setSelectedRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1
      });
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your current location.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingLocation(true);
    try {
      const result = await searchLocationByName(searchQuery.trim());
      if (result) {
        setSelectedRegion({
          latitude: result.latitude,
          longitude: result.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1
        });
      } else {
        Alert.alert('Location Not Found', 'Could not find the location you searched for.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Failed to search location.');
    } finally {
      setIsSearchingLocation(false);
    }
  };


  const updateWorkingArea = async (lat, lng) => {
    try {
      setIsUpdatingLocation(true);
      await api.put('/professional/profile', { locationLat: lat, locationLng: lng, serveEverywhere: false, serviceRadius: parseInt(serviceRadius) || 10, availabilityStatus: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE', bookingFee: parseFloat(bookingFee) || 0 });
      setLocationLat(lat);
      setLocationLng(lng);
      setMapModalVisible(false);
      Alert.alert('Success', 'Working Area updated successfully!');
    } catch (err) {
      console.log('Update error', err);
      Alert.alert('Error', 'Failed to update location');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await api.get(`/professional/dashboard?filter=${timeFilter}`);
      setStats(response.data.stats);
      setRecents(response.data.recents);
      
      if (response.data.profile) {
        const prof = response.data.profile;
        if (prof.locationLat) setLocationLat(prof.locationLat);
        if (prof.locationLng) setLocationLng(prof.locationLng);
        // removed serveEverywhere
        if (prof.serviceRadius) setServiceRadius(prof.serviceRadius.toString());
        if (prof.bookingFee !== undefined && prof.bookingFee !== null) setBookingFee(prof.bookingFee.toString());
        if (prof.availabilityStatus) setIsAvailable(prof.availabilityStatus === 'AVAILABLE');
      }
      
      const allApts = response.data.appointments || [];
      const today = new Date();
      const todayApts = allApts.filter(apt => {
          const d = new Date(apt.scheduledDate);
          return d.getDate() === today.getDate() &&
                 d.getMonth() === today.getMonth() &&
                 d.getFullYear() === today.getFullYear() &&
                 (apt.status === 'PENDING' || apt.status === 'CONFIRMED');
      });
      setTodayAppointments(todayApts.length);
      checkAndScheduleNotification(todayApts.length);

    } catch (error) {
      console.log('Error fetching dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const checkAndScheduleNotification = async (count) => {
    if (count === 0) return;
    try {
      const todayStr = new Date().toDateString();
      const lastNotified = await AsyncStorage.getItem('lastAppointmentNotifiedDate');
      
      if (lastNotified !== todayStr) {
        const { status } = await Notifications.getPermissionsAsync();
        let finalStatus = status;
        if (status !== 'granted') {
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          finalStatus = newStatus;
        }
        
        if (finalStatus === 'granted') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Appointment Reminder 📅",
              body: `You have ${count} appointment(s) scheduled for today. Please check your dashboard!`,
              sound: true,
            },
            trigger: { seconds: 5 }, 
          });
          await AsyncStorage.setItem('lastAppointmentNotifiedDate', todayStr);
        }
      }
    } catch (e) {
      console.log('Notification error', e);
    }
  };

  const renderRecentAppointment = (apt) => (
    <View style={styles.recentItem}>
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
         <View style={styles.iconCircle}>
           <FontAwesome5 name="user" size={16} color={colors.primary} />
         </View>
         <View>
           <Text style={styles.recentTitle}>{apt.patient?.user?.fullName || 'Patient'}</Text>
           <Text style={styles.recentSub}>{new Date(apt.scheduledDate).toLocaleDateString()}</Text>
         </View>
      </View>
      <View style={[styles.statusBadge, apt.status === 'PENDING' ? styles.bgWarning : (apt.status === 'CONFIRMED' ? styles.bgPrimary : styles.bgSuccess)]}>
        <Text style={styles.statusText}>{apt.status}</Text>
      </View>
    </View>
  );

  const styles = getStyles(colors);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Dr. {user?.fullName}</Text>
          <Text style={styles.roleText}>{user?.role}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
            <Ionicons name="location" size={12} color={colors.primary} />
            <Text style={{ fontSize: 12, color: colors.primary, marginLeft: 4, fontWeight: 'bold' }}>
              {!locationLat ? 'Service area not set' : (!isAvailable ? 'Currently Unavailable' : `Serving: ${serviceRadius || 10}km Radius`)}
            </Text>
          </View>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={() => setMapModalVisible(true)} style={{marginRight: 15}}><Ionicons name='map-outline' size={24} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Calendar')} style={{marginRight: 15}}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
          <NotificationBell />
        </View>
      </View>

      {todayAppointments > 0 && (
        <View style={styles.bannerContainer}>
          <Ionicons name="calendar" size={24} color="#fff" style={{marginRight: 10}} />
          <View style={{flex: 1}}>
            <Text style={styles.bannerTitle}>Appointments Today!</Text>
            <Text style={styles.bannerText}>You have {todayAppointments} appointment(s) scheduled for today.</Text>
          </View>
        </View>
      )}

      <TimeFilter selected={timeFilter} onSelect={setTimeFilter} />

      <View style={styles.statsGrid}>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('AppointmentsTab', {statusFilter: 'PENDING'})}>
          <Text style={styles.statTitle}>Pending</Text>
          <Text style={[styles.statCount, {color: colors.warning}]}>{stats.pending}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('AppointmentsTab', {statusFilter: 'CONFIRMED'})}>
          <Text style={styles.statTitle}>Home Visits</Text>
          <Text style={[styles.statCount, {color: colors.primary}]}>{stats.homeVisits}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('AppointmentsTab', {statusFilter: 'COMPLETED'})}>
          <Text style={styles.statTitle}>Completed</Text>
          <Text style={[styles.statCount, {color: colors.success}]}>{stats.completed}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('AppointmentsTab', {statusFilter: 'CANCELED'})}>
          <Text style={styles.statTitle}>Canceled</Text>
          <Text style={[styles.statCount, {color: colors.danger}]}>{stats.canceled}</Text>
        </TouchableOpacity>
      </View>

      <RecentsList 
        title="Recent Appointments" 
        items={recents} 
        renderItem={renderRecentAppointment} 
        onSeeAll={() => navigation.navigate('AppointmentsTab')} 
      />
          <Modal visible={mapModalVisible} animationType="slide">
        <View style={{ flex: 1 }}>
          <View style={{ padding: 15, backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 40 : 15 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Select Working Area</Text>
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1 }}>
            
            <View style={{ flexDirection: 'row', padding: 10, backgroundColor: 'white', zIndex: 10 }}>
              <TextInput 
                style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 10, marginRight: 10 }}
                placeholder="Search area (e.g. Colombo)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchLocation}
              />
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center', minWidth: 50, marginRight: 10 }}
                onPress={searchLocation}
                disabled={isSearchingLocation}
              >
                {isSearchingLocation ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="search" size={20} color="white" />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ backgroundColor: '#28a745', padding: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center', minWidth: 50 }}
                onPress={getCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? <ActivityIndicator size="small" color="white" /> : <MaterialIcons name="my-location" size={20} color="white" />}
              </TouchableOpacity>
            </View>
            {mapModalVisible && (
              <MapComponent selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion}  serviceRadius={serviceRadius} isAvailable={isAvailable} />
            )}
            
            
            <View style={{ position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', padding: 15, borderRadius: 10 }}>
              {user?.role !== 'ELDER_HOME' && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: (!locationLat ? 5 : 15), paddingBottom: (!locationLat ? 5 : 15), borderBottomWidth: (!locationLat ? 0 : 1), borderBottomColor: '#ddd' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: !locationLat ? '#999' : '#000' }}>Currently Available</Text>
                <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: colors.primary }} />
              </View>
              {!locationLat && (
                <Text style={{ color: 'red', fontSize: 12, marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
                  Please set your available service area first to enable availability.
                </Text>
              )}
              </>
              )}
              
              {user?.role !== 'ELDER_HOME' && isAvailable && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={{ flex: 1, fontWeight: 'bold' }}>Service Radius (km):</Text>
                      <TextInput 
                        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, width: 60, textAlign: 'center' }}
                        keyboardType="numeric"
                        value={serviceRadius}
                        onChangeText={setServiceRadius}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                      <Text style={{ flex: 1, fontWeight: 'bold' }}>Booking Fee (Rs.):</Text>
                      <TextInput 
                        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, width: 80, textAlign: 'center' }}
                        keyboardType="numeric"
                        value={bookingFee}
                        onChangeText={setBookingFee}
                      />
                    </View>
                  </>
              )}
              
              <TouchableOpacity 
                style={{ backgroundColor: (user?.role !== 'ELDER_HOME' && !isAvailable) ? '#ccc' : colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: (user?.role === 'ELDER_HOME' || isAvailable) ? 0 : 10 }}
                onPress={() => updateWorkingArea(selectedRegion.latitude, selectedRegion.longitude)}
                disabled={isUpdatingLocation || (user?.role !== 'ELDER_HOME' && !isAvailable)}
              >
                {isUpdatingLocation ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Confirm Location</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
    letterSpacing: 1,
  },
  bannerContainer: {
    flexDirection: 'row',
    margin: 20,
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  bannerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statCard: {
    backgroundColor: colors.surface,
    width: '47%',
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 8,
  },
  statCount: {
    fontSize: 32,
    fontWeight: '800',
  },
  recentItem: {
    backgroundColor: colors.surface,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  recentTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  recentSub: {
    fontSize: 13,
    color: colors.textLight,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  bgWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  bgPrimary: {
    backgroundColor: colors.primary + '20',
  },
  bgSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

export default ProfessionalDashboard;
// Force rebuild



