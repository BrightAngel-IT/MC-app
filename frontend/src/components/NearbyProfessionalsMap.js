import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, Image, Platform, TextInput } from 'react-native';
import * as Location from 'expo-location';
import api from '../api/axios';
import { useTheme } from '../context/themeContext';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import WebNearbyMap from './WebNearbyMap';
import NativeNearbyMap from './NativeNearbyMap';
import BookingLocationModal from './BookingLocationModal';
import { reverseGeocodeCoords } from '../utils/geocode';

const { width } = Dimensions.get('window');

const ROLE_COLORS = {
  DOCTOR: '#0891b2',
  NURSE: '#059669',
  CAREGIVER: '#14b8a6',
  LAB_TECH: '#8b5cf6',
  PARAMEDIC: '#e11d48'
};

const NearbyProfessionalsMap = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();

  // Active target location shown on the map (defaults to current GPS, or searched destination)
  const [location, setLocation] = useState(null);
  const [deviceLocation, setDeviceLocation] = useState(null);
  const [deviceAddress, setDeviceAddress] = useState('');
  const [visitAddress, setVisitAddress] = useState('');
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(true);
  const [patientProfileAddress, setPatientProfileAddress] = useState('');
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [isIslandwide, setIsIslandwide] = useState(false);
  const [distanceRate, setDistanceRate] = useState(50);

  useEffect(() => {
    (async () => {
      let locLat = 6.9271;
      let locLng = 79.8612;

      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          locLat = loc.coords.latitude;
          locLng = loc.coords.longitude;
        }
      } catch (e) {
        console.log('Location error:', e.message);
      }

      const initialLoc = {
        latitude: locLat,
        longitude: locLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      setLocation(initialLoc);
      setDeviceLocation(initialLoc);

      // Reverse geocode to get human-friendly label for current location
      reverseGeocodeCoords(locLat, locLng).then(addr => {
        if (addr) {
          setDeviceAddress(addr);
          setVisitAddress(addr);
        }
      });

      fetchProfessionals(locLat, locLng, 'ALL');
      fetchSettings();
      fetchPatientProfile();
    })();
  }, []);

  const fetchPatientProfile = async () => {
    try {
      const res = await api.get('/patient/profile');
      if (res.data?.address) {
        setPatientProfileAddress(res.data.address);
      }
    } catch (e) {
      console.log('Profile fetch error:', e.message);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data && res.data.DISTANCE_CHARGE_PER_KM) {
        setDistanceRate(parseFloat(res.data.DISTANCE_CHARGE_PER_KM));
      }
    } catch(err) {
      console.log('Error fetching settings', err);
    }
  };
  
  const fetchProfessionals = async (lat, lng, role) => {
    try {
      setLoading(true);
      const res = await api.get(`/patient/nearby-professionals?lat=${lat}&lng=${lng}&roleFilter=${role}`);
      setProfessionals(res.data);
    } catch (err) {
      console.log('Error fetching professionals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (role) => {
    setFilter(role);
    if (location) {
      fetchProfessionals(location.latitude, location.longitude, role);
    }
  };

  const handleLocationChanged = (result) => {
    const newLoc = {
      latitude: result.lat,
      longitude: result.lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    setLocation(newLoc);
    setVisitAddress(result.address || '');
    setIsUsingCurrentLocation(result.mode === 'CURRENT');
    setIsIslandwide(false);
    fetchProfessionals(result.lat, result.lng, filter);
  };

  const handleSetCurrentLocation = () => {
    if (deviceLocation) {
      setLocation(deviceLocation);
      setVisitAddress(deviceAddress || 'Current GPS Location');
      setIsUsingCurrentLocation(true);
      fetchProfessionals(deviceLocation.latitude, deviceLocation.longitude, filter);
    }
  };

  const FilterButton = ({ role, label, icon }) => (
    <TouchableOpacity 
      style={[
        styles.filterBtn, 
        { backgroundColor: filter === role ? colors.primary : colors.surface },
        filter === role && { borderColor: colors.primary }
      ]}
      onPress={() => handleFilter(role)}
    >
      <FontAwesome5 name={icon} size={14} color={filter === role ? '#fff' : colors.text} />
      <Text style={[styles.filterText, { color: filter === role ? '#fff' : colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Title & Islandwide Toggle */}
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
        <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>Nearby Healthcare Providers</Text>
        <TouchableOpacity 
          onPress={() => setIsIslandwide(!isIslandwide)} 
          style={{backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20}}
        >
          <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>{isIslandwide ? 'Show Nearby' : 'View Islandwide'}</Text>
        </TouchableOpacity>
      </View>

      {/* Prominent High-Visibility Location Selector Box */}
      <View style={[styles.locationCard, { backgroundColor: colors.surface, borderColor: isUsingCurrentLocation ? colors.border : colors.primary }]}>
        {/* Status & Quick Switch Tabs */}
        <View style={styles.locationHeaderRow}>
          <TouchableOpacity 
            style={[
              styles.switchTabBtn, 
              isUsingCurrentLocation ? { backgroundColor: '#10B981', borderColor: '#10B981' } : { backgroundColor: colors.surface, borderColor: colors.border }
            ]} 
            onPress={handleSetCurrentLocation}
            activeOpacity={0.8}
          >
            <Ionicons name="navigate" size={13} color={isUsingCurrentLocation ? '#fff' : colors.textLight} />
            <Text style={[styles.switchTabText, isUsingCurrentLocation ? { color: '#fff', fontWeight: 'bold' } : { color: colors.textLight }]}>
              Current Location
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.switchTabBtn, 
              !isUsingCurrentLocation ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border }
            ]} 
            onPress={() => setLocationModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="location" size={13} color={!isUsingCurrentLocation ? '#fff' : colors.textLight} />
            <Text style={[styles.switchTabText, !isUsingCurrentLocation ? { color: '#fff', fontWeight: 'bold' } : { color: colors.textLight }]}>
              Other Location
            </Text>
          </TouchableOpacity>
        </View>

        {/* Address Display Clickable Bar */}
        <TouchableOpacity 
          style={[styles.addressDisplayRow, { backgroundColor: colors.surfaceLight || '#F8FAFC' }]}
          onPress={() => setLocationModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="location-sharp" size={18} color={isUsingCurrentLocation ? '#10B981' : colors.primary} />
          <Text style={[styles.addressDisplayText, { color: colors.text }]} numberOfLines={1}>
            {visitAddress || 'Click to set target destination (Home, Office, or any city)...'}
          </Text>
          <View style={styles.changeActionBadge}>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary }}>Change</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Role Filters */}
      <View style={styles.filtersContainer}>
        <FilterButton role="ALL" label="All" icon="users" />
        <FilterButton role="DOCTOR" label="Doctors" icon="user-md" />
        <FilterButton role="NURSE" label="Nurses" icon="user-nurse" />
        <FilterButton role="PHARMACIST" label="Pharmacy" icon="pills" />
        <FilterButton role="PARAMEDIC" label="Ambulance" icon="ambulance" />
        <FilterButton role="LAB_TECH" label="Lab" icon="microscope" />
        <FilterButton role="ELDER_HOME" label="Elder Homes" icon="home" />
      </View>

      {/* Map */}
      <View style={[styles.mapContainer, { borderColor: colors.border }]}>
        {loading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        {Platform.OS === 'web' ? (
          <WebNearbyMap 
            location={location} 
            professionals={professionals} 
            isIslandwide={isIslandwide} 
            distanceRate={distanceRate}
            visitAddress={visitAddress}
          />
        ) : (
          <NativeNearbyMap 
            key={isIslandwide ? 'island' : `loc-${location?.latitude}-${location?.longitude}`} 
            location={isIslandwide ? { latitude: 7.8731, longitude: 80.7718 } : location} 
            professionals={professionals} 
            distanceRate={distanceRate}
            visitAddress={visitAddress}
          />
        )}
      </View>

      {/* Modal to choose / search any destination */}
      <BookingLocationModal
        visible={locationModalVisible}
        onClose={() => setLocationModalVisible(false)}
        initialVisitLocation={location ? { lat: location.latitude, lng: location.longitude } : null}
        initialVisitAddress={visitAddress}
        patientProfileAddress={patientProfileAddress}
        onLocationSelected={handleLocationChanged}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  locationCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  switchTabBtn: {
    flex: 1,
    maxWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  switchTabText: {
    fontSize: 12,
  },
  addressDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  addressDisplayText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  changeActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingLeft: 6,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    marginBottom: 8,
  },
  filterText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  mapContainer: {
    height: 270,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});

export default NearbyProfessionalsMap;
