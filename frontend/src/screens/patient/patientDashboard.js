import React, { useContext, useEffect, useState , useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Alert, Platform } from 'react-native';
import { AuthContext } from '../../context/authContext';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import TimeFilter from '../../components/TimeFilter';
import RecentsList from '../../components/RecentsList';
import NearbyProfessionalsMap from '../../components/NearbyProfessionalsMap';
import * as Location from 'expo-location';

import NotificationBell from '../../components/NotificationBell';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* Notifications temporarily disabled for Expo Go
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
*/

const { width } = Dimensions.get('window');

const SERVICES = [
  { id: '1', title: 'Consult\nDoctor', icon: 'stethoscope', type: 'fa5', color: '#0891b2', action: 'DoctorSearch' },
  { id: '2', title: 'Home\nNurse', icon: 'user-nurse', type: 'fa5', color: '#059669', action: 'NurseScreen' },
  { id: '3', title: 'Medical\nTests', icon: 'microscope', type: 'fa5', color: '#8b5cf6', action: 'LabTechSearch' },
  { id: '4', title: 'Pharmacy', icon: 'pill', type: 'mci', color: '#f59e0b', action: 'PharmacyScreen' },
  { id: '5', title: 'Ambulance', icon: 'ambulance', type: 'mci', color: '#e11d48', action: 'ParamedicSearch' },
  { id: '7', title: 'Elder\nCare', icon: 'human-cane', type: 'mci', color: '#14b8a6', action: 'CaregiverSearch' },
  { id: '8', title: 'Equipment', icon: 'wheelchair-accessibility', type: 'mci', color: '#64748b', action: 'AllProductsScreen' },
  { id: '9', title: 'Elder\nHomes', icon: 'home-heart', type: 'mci', color: '#f97316', action: 'ElderHomeSearch' },
];

const PatientDashboard = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const { colors, isDarkMode, toggleTheme } = useTheme();
  
  const [stats, setStats] = useState({ active: 0, completed: 0, canceled: 0 });
  const [recents, setRecents] = useState([]);
  const [timeFilter, setTimeFilter] = useState('all');
  const [todayAppointments, setTodayAppointments] = useState(0);
  
  const styles = getStyles(colors);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (Platform.OS === 'web') {
            window.alert('Please allow location access. This app needs your location to find nearby healthcare professionals and calculate accurate fees.');
          } else {
            Alert.alert('Location Required', 'Please allow location access to find nearby healthcare professionals and calculate accurate fees.');
          }
        }
      } catch (e) {
        console.log('Location permission error:', e);
      }
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [timeFilter])
  );

  const fetchDashboard = async () => {
    try {
      const res = await api.get(`/patient/dashboard?filter=${timeFilter}`);
      setStats(res.data.stats || { active: 0, completed: 0, canceled: 0 });
      setRecents(res.data.recents || []);

      const allApts = res.data.appointments || [];
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

    } catch (err) {
      console.log('Failed to fetch dashboard');
    }
  };

  const checkAndScheduleNotification = async (count) => {
    if (count === 0) return;
    try {
      const todayStr = new Date().toDateString();
      const lastNotified = await AsyncStorage.getItem('lastPatientAppointmentNotified');
      
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
              title: "Healthcare Reminder 📅",
              body: `You have ${count} appointment(s) scheduled for today. Check your dashboard!`,
              sound: true,
            },
            trigger: { seconds: 5 }, 
          });
          await AsyncStorage.setItem('lastPatientAppointmentNotified', todayStr);
        }
      }
    } catch (e) {
      console.log('Notification error', e);
    }
  };

  const handleSOS = () => {
    const triggerLogic = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert("Permission Denied", "Location access is required to dispatch an ambulance.");
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        
        await api.post('/patient/sos', {
          locationLat: location.coords.latitude,
          locationLng: location.coords.longitude,
          type: 'EMERGENCY'
        });

        if (Platform.OS === 'web') {
          window.alert('SOS TRIGGERED\nDispatching ambulance to your location immediately!');
        } else {
          Alert.alert('SOS TRIGGERED', 'Dispatching ambulance to your location immediately!');
        }
      } catch (error) {
        console.error(error);
        if (Platform.OS === 'web') window.alert("Failed to send SOS. Please check your internet connection.");
        else Alert.alert("Error", "Failed to send SOS. Please check your internet connection.");
      }
    };

    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm("Are you sure you want to trigger an Emergency SOS? A paramedic will be dispatched to your current location immediately.");
      if (confirmWeb) triggerLogic();
    } else {
      Alert.alert(
        "Emergency SOS",
        "Are you sure you want to trigger an Emergency SOS? A paramedic will be dispatched to your current location immediately.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Trigger SOS", style: "destructive", onPress: triggerLogic }
        ]
      );
    }
  };

  const handleServiceClick = (service) => {
    if (service.action !== 'ComingSoon') {
      navigation.navigate(service.action, service.params);
    } else {
      if (Platform.OS === 'web') {
        window.alert('Coming Soon\nThis service will be available in the next update.');
      } else {
        Alert.alert('Coming Soon', 'This service will be available in the next update.');
      }
    }
  };

  const renderRecentAppointment = (apt) => {
    let activityText = 'Appointment Booked';
    if(apt.status === 'COMPLETED') activityText = 'Appointment Completed';
    if(apt.status === 'CANCELED') activityText = 'Appointment Canceled';
    if(apt.status === 'IN_PROGRESS') activityText = 'Appointment In Progress';
    if(apt.status === 'CONFIRMED') activityText = 'Appointment Confirmed';

    return (
      <TouchableOpacity key={apt.id} style={styles.recentItem} onPress={() => navigation.navigate('AppointmentsTab')}>
        <View style={styles.recentItemLeft}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="user-md" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.recentTitle}>{activityText}</Text>
            <Text style={styles.recentSub}>Dr. {apt.professional?.user?.fullName || 'Unknown'} • {new Date(apt.updatedAt || apt.createdAt || apt.scheduledDate).toLocaleString()}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, apt.status === 'PENDING' ? styles.bgWarning : (apt.status === 'CONFIRMED' ? styles.bgPrimary : (apt.status === 'COMPLETED' ? styles.bgSuccess : styles.bgDanger))]}>
          <Text style={styles.statusText}>{apt.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.appName}>Health Care</Text>
          <Text style={styles.welcomeText}>Hello, {user?.fullName || 'Guest'}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => navigation.navigate('Calendar')} style={styles.themeBtn}>
            <MaterialCommunityIcons name="calendar-month" size={24} color={colors.primary} />
          </TouchableOpacity>
          <NotificationBell />
          <TouchableOpacity onPress={toggleTheme} style={styles.themeBtn}>
            <Text style={styles.themeBtnText}>{isDarkMode ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={logout} style={styles.themeBtn}>
            <Ionicons name="log-out-outline" size={24} color={colors.danger || '#ef4444'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* SOS Button */}
        <TouchableOpacity style={styles.sosButton} onPress={handleSOS} activeOpacity={0.8}>
          <Text style={styles.sosText}>🚨 SOS EMERGENCY</Text>
          <Text style={styles.sosSubtext}>Tap to dispatch ambulance</Text>
        </TouchableOpacity>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>24/7 Verified Home Care Network</Text>
          </View>
          <Text style={styles.heroTitle}>Book trusted healthcare professionals to your doorstep.</Text>
          
          <View style={styles.heroActions}>
            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: colors.roles.PATIENT.primary }]}
              onPress={() => navigation.navigate('DoctorSearch')}
            >
              <Text style={styles.primaryBtnText}>Book Doctor Visit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('NurseScreen')}>
              <Text style={styles.secondaryBtnText}>Home Nurse</Text>
            </TouchableOpacity>
          </View>
        </View>
        

        {/* Today's Appointments Banner */}
        {todayAppointments > 0 && (
          <TouchableOpacity style={styles.todayBanner} onPress={() => navigation.navigate('AppointmentsTab')}>
            <MaterialCommunityIcons name="calendar-alert" size={24} color="#fff" style={{marginRight: 10}} />
            <View style={{flex: 1}}>
              <Text style={styles.todayBannerTitle}>Appointment Today!</Text>
              <Text style={styles.todayBannerText}>You have {todayAppointments} appointment(s) scheduled for today.</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Active Appointments Banner */}
        {stats.active > 0 && (
          <TouchableOpacity style={styles.activeBanner} onPress={() => navigation.navigate('AppointmentsTab')}>
            <View style={styles.activeBannerIndicator} />
            <View style={styles.activeBannerTextCol}>
              <Text style={styles.activeBannerTitle}>{stats.active} Active Appointment{stats.active !== 1 ? 's' : ''}</Text>
              <Text style={styles.activeBannerSub}>Tap to view live status & GPS route tracking</Text>
            </View>
            <FontAwesome5 name="chevron-right" size={16} color={colors.roles.PATIENT.accent} />
          </TouchableOpacity>
        )}

        {/* Service Grid */}
        <NearbyProfessionalsMap />
          <Text style={styles.sectionTitle}>Our Services</Text>
        <View style={styles.grid}>
          {SERVICES.map(service => (
            <TouchableOpacity 
              key={service.id} 
              style={styles.gridItem} 
              onPress={() => handleServiceClick(service)}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                {service.type === 'fa5' ? (
                  <FontAwesome5 name={service.icon} size={22} color={service.color} />
                ) : (
                  <MaterialCommunityIcons name={service.icon} size={26} color={service.color} />
                )}
              </View>
              <Text style={styles.gridItemText}>{service.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <RecentsList 
          title="Recent Appointments" 
          items={recents} 
          renderItem={renderRecentAppointment} 
          onSeeAll={() => navigation.navigate('AppointmentsTab')} 
        />

      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: SIZES.padding,
    paddingVertical: 15,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  appName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800', // Made bolder to match demo
  },
  welcomeText: {
    color: colors.textLight,
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
  },
  themeBtnText: {
    fontSize: 16,
  },
  langPill: {
    backgroundColor: colors.roles.PATIENT.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  langText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoutText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: SIZES.padding,
    paddingBottom: 40,
  },
  sosButton: {
    backgroundColor: colors.danger,
    borderRadius: SIZES.radiusLg,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sosText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sosSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  heroBanner: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeContainer: {
    backgroundColor: colors.roles.PATIENT.bgTint,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.roles.PATIENT.accent,
  },
  badgeText: {
    color: colors.roles.PATIENT.textTint,
    fontSize: 12,
    fontWeight: 'bold',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    lineHeight: 28,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    shadowColor: colors.roles.PATIENT.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  todayBanner: {
    backgroundColor: colors.roles.PATIENT.primary,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: colors.roles.PATIENT.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  todayBannerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  todayBannerText: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.95,
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.roles.PATIENT.accent,
    marginBottom: 24,
    shadowColor: colors.roles.PATIENT.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  activeBannerIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
    marginRight: 12,
  },
  activeBannerTextCol: {
    flex: 1,
  },
  activeBannerTitle: {
    color: colors.text,
    fontWeight: 'bold',
    fontSize: 14,
  },
  activeBannerSub: {
    color: colors.textLight,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: (width - (SIZES.padding * 2) - 16) / 2, // Changed to 2 columns for better visibility
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridItemText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border },
  recentItemLeft: { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recentTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  recentSub: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bgWarning: { backgroundColor: colors.warning + '20' },
  bgPrimary: { backgroundColor: colors.primary + '20' },
  bgSuccess: { backgroundColor: colors.success + '20' },
  bgDanger: { backgroundColor: colors.danger + '20' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: colors.text },
});

export default PatientDashboard;
