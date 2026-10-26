import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, Image, Platform } from 'react-native';
import * as Location from 'expo-location';
import api from '../api/axios';
import { useTheme } from '../context/themeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import WebNearbyMap from './WebNearbyMap';
import NativeNearbyMap from './NativeNearbyMap';

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

  const [location, setLocation] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [isIslandwide, setIsIslandwide] = useState(false);
  const [distanceRate, setDistanceRate] = useState(50);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLoading(false);
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      fetchProfessionals(loc.coords.latitude, loc.coords.longitude, 'ALL');
      fetchSettings();
    })();
  }, []);

  
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

    if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
          <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>Nearby Healthcare Providers</Text>
          <TouchableOpacity onPress={() => setIsIslandwide(!isIslandwide)} style={{backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20}}>
            <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>{isIslandwide ? 'Show Nearby' : 'View Islandwide'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filtersContainer}>
          <FilterButton role="ALL" label="All" icon="users" />
          <FilterButton role="DOCTOR" label="Doctors" icon="user-md" />
          <FilterButton role="NURSE" label="Nurses" icon="user-nurse" />
          <FilterButton role="PHARMACIST" label="Pharmacy" icon="pills" />
          <FilterButton role="PARAMEDIC" label="Ambulance" icon="ambulance" />
          <FilterButton role="LAB_TECH" label="Lab" icon="microscope" />
          <FilterButton role="ELDER_HOME" label="Elder Homes" icon="home" />
        </View>
        <View style={[styles.mapContainer, { borderColor: colors.border }]}>
          {loading && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          <WebNearbyMap location={location} professionals={professionals} isIslandwide={isIslandwide} distanceRate={distanceRate} />
        </View>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: colors.textMuted }}>Location permission required for nearby map.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10}}>
          <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>Nearby Healthcare Providers</Text>
          <TouchableOpacity onPress={() => setIsIslandwide(!isIslandwide)} style={{backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20}}>
            <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>{isIslandwide ? 'Show Nearby' : 'View Islandwide'}</Text>
          </TouchableOpacity>
        </View>
      
      <View style={styles.filtersContainer}>
        <FilterButton role="ALL" label="All" icon="users" />
        <FilterButton role="DOCTOR" label="Doctors" icon="user-md" />
        <FilterButton role="NURSE" label="Nurses" icon="user-nurse" />
        <FilterButton role="PHARMACIST" label="Pharmacy" icon="pills" />
        <FilterButton role="PARAMEDIC" label="Ambulance" icon="ambulance" />
        <FilterButton role="LAB_TECH" label="Lab" icon="microscope" />
        <FilterButton role="ELDER_HOME" label="Elder Homes" icon="home" />
      </View>

      <View style={[styles.mapContainer, { borderColor: colors.border }]}>
        {loading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        <NativeNearbyMap key={isIslandwide ? 'island' : 'near'} location={isIslandwide ? { latitude: 7.8731, longitude: 80.7718 } : location} professionals={professionals} distanceRate={distanceRate} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
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
    height: 250,
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
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callout: {
    padding: 5,
    minWidth: 120,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  calloutRole: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },
  calloutFee: {
    fontSize: 12,
    color: '#059669',
    fontWeight: 'bold',
  },
  calloutLink: {
    fontSize: 12,
    color: '#0891b2',
    marginTop: 4,
  }
});

export default NearbyProfessionalsMap;
// Force Metro reload
