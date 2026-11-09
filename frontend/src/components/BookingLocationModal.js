 import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTheme } from '../context/themeContext';
import { useLanguage } from '../context/LanguageContext';
import { searchLocationByName, reverseGeocodeCoords } from '../utils/geocode';

/**
 * Universal Booking Location Selector Modal
 * Allows patient to:
 * 1. Keep / Use Current Device Location (e.g. Office)
 * 2. Use Saved Home Address (from Patient Profile)
 * 3. Search and pin custom Visit Address (e.g. Home, Parent's place)
 */
const BookingLocationModal = ({
  visible,
  onClose,
  initialVisitLocation,
  initialVisitAddress,
  patientProfileAddress,
  onLocationSelected
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const styles = getStyles(colors);

  const [addressInput, setAddressInput] = useState('');
  const [selectedCoords, setSelectedCoords] = useState(null);
  const [selectedAddressLabel, setSelectedAddressLabel] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mode, setMode] = useState('CURRENT'); // 'CURRENT' | 'HOME' | 'CUSTOM'

  useEffect(() => {
    if (visible) {
      if (initialVisitLocation && initialVisitLocation.lat) {
        setSelectedCoords({ lat: initialVisitLocation.lat, lng: initialVisitLocation.lng });
        setSelectedAddressLabel(initialVisitAddress || 'Selected Location');
        setAddressInput(initialVisitAddress || '');
        setMode('CUSTOM');
      } else {
        setMode('CURRENT');
      }
    }
  }, [visible]);

  const handleUseCurrentLocation = async () => {
    setIsSearching(true);
    setMode('CURRENT');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permissions in settings.');
        setIsSearching(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      
      const readable = await reverseGeocodeCoords(lat, lng);
      const label = readable || `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

      setSelectedCoords({ lat, lng });
      setSelectedAddressLabel(label);
      setAddressInput(label);
      onLocationSelected({
        lat,
        lng,
        address: label,
        mode: 'CURRENT'
      });
      onClose();
    } catch (err) {
      Alert.alert('Location Error', 'Failed to retrieve current GPS coordinates.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseHomeAddress = async () => {
    if (!patientProfileAddress || !patientProfileAddress.trim()) {
      Alert.alert('No Home Address', 'You do not have a home address saved in your profile yet.');
      return;
    }
    setIsSearching(true);
    setMode('HOME');
    try {
      const coords = await searchLocationByName(patientProfileAddress);
      if (coords && coords.latitude && coords.longitude) {
        const lat = coords.latitude;
        const lng = coords.longitude;
        setSelectedCoords({ lat, lng });
        setSelectedAddressLabel(patientProfileAddress);
        setAddressInput(patientProfileAddress);
        onLocationSelected({
          lat,
          lng,
          address: patientProfileAddress,
          mode: 'HOME'
        });
        onClose();
      } else {
        Alert.alert('Address Not Found', 'Could not locate your saved home address on the map. Please type and search for it below.');
      }
    } catch (err) {
      Alert.alert('Search Error', 'Failed to locate home address: ' + (err.message || 'Network error'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchCustomAddress = async () => {
    if (!addressInput.trim()) {
      Alert.alert('Empty Address', 'Please type a city, street, or address to search.');
      return;
    }
    setIsSearching(true);
    setMode('CUSTOM');
    try {
      const coords = await searchLocationByName(addressInput.trim());
      if (coords && coords.latitude && coords.longitude) {
        const lat = coords.latitude;
        const lng = coords.longitude;
        // Prefer the exact searched name/display name, then reverseGeocode, then user input
        const readable = coords.displayName || (await reverseGeocodeCoords(lat, lng)) || addressInput.trim();
        setSelectedCoords({ lat, lng });
        setSelectedAddressLabel(readable);
        onLocationSelected({
          lat,
          lng,
          address: readable,
          mode: 'CUSTOM'
        });
        onClose();
      } else {
        Alert.alert('Location Not Found', 'We could not find coordinates for this address. Try typing the city or area name (e.g. Maharagama, Colombo).');
      }
    } catch (err) {
      Alert.alert('Search Error', err.message || 'Failed to search address');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t('where_should_visit')}</Text>
              <Text style={styles.subtitle}>{t('select_visit_destination')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Quick Choice Buttons */}
            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={[styles.optionCard, mode === 'CURRENT' && styles.optionCardActive]}
                onPress={handleUseCurrentLocation}
                disabled={isSearching}
              >
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="navigate" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.optionTitle}>{t('current_device_location')}</Text>
                  <Text style={styles.optionDesc}>Wherever you are right now (office, cafe, etc.)</Text>
                </View>
              </TouchableOpacity>

              {patientProfileAddress ? (
                <TouchableOpacity
                  style={[styles.optionCard, mode === 'HOME' && styles.optionCardActive]}
                  onPress={handleUseHomeAddress}
                  disabled={isSearching}
                >
                  <View style={[styles.iconCircle, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="home" size={20} color="#10B981" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.optionTitle}>{t('use_saved_home_address')}</Text>
                    <Text style={styles.optionDesc} numberOfLines={1}>{patientProfileAddress}</Text>
                  </View>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Custom Search Form */}
            <View style={styles.customSection}>
              <Text style={styles.sectionLabel}>{t('search_custom_destination')}:</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.input}
                  placeholder={t('search_location_placeholder')}
                  placeholderTextColor={colors.textLight}
                  value={addressInput}
                  onChangeText={setAddressInput}
                  returnKeyType="search"
                  onSubmitEditing={handleSearchCustomAddress}
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  style={[styles.searchBtn, isSearching && { opacity: 0.6 }]}
                  onPress={handleSearchCustomAddress}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="search" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.helperText}>
                💡 You can book while you are at your office and have the doctor visit your home or parents.
              </Text>
            </View>

            {/* Current Selected Preview */}
            {selectedCoords && (
              <View style={styles.selectedBox}>
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.selectedLabel}>Target Visit Destination:</Text>
                  <Text style={styles.selectedAddress}>{selectedAddressLabel}</Text>
                  <Text style={styles.selectedCoords}>
                    Lat: {selectedCoords.lat.toFixed(5)}, Lng: {selectedCoords.lng.toFixed(5)}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>{t('common_close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (colors) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: colors.surface || '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '88%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text
  },
  subtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2
  },
  closeBtn: {
    padding: 4
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 16
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight || '#F8FAFC'
  },
  optionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10'
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center'
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text
  },
  optionDesc: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2
  },
  customSection: {
    marginTop: 6,
    marginBottom: 16
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted || colors.textLight,
    fontStyle: 'italic',
    marginTop: 6
  },
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.primary + '15',
    borderWidth: 1,
    borderColor: colors.primary + '30',
    marginBottom: 16
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary
  },
  selectedAddress: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    marginTop: 1
  },
  selectedCoords: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.surfaceLight || '#F1F5F9'
  },
  cancelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text
  }
});

export default BookingLocationModal;

