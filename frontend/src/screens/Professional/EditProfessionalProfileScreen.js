import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Platform, Modal, Image, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../../context/authContext';
import { useTheme } from '../../context/themeContext';
import api from '../../api/axios';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import CustomAlertModal from '../../components/CustomAlertModal';

import MapComponent from '../../components/MapComponent';


const EditProfessionalProfileScreen = ({ navigation }) => {
  const { user, setUser } = useContext(AuthContext);
  const { colors } = useTheme();

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [bookingFee, setBookingFee] = useState('');
  const [workingHospital, setWorkingHospital] = useState('');
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [newImageBase64, setNewImageBase64] = useState(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const [adminContact, setAdminContact] = useState({ phone: '', email: '' });
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'success', title: '', message: '', onConfirm: null });

  useEffect(() => {
    fetchProfile();
    fetchAdminContact();
  }, []);

  const fetchAdminContact = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data) {
        setAdminContact({
          phone: res.data.SUPPORT_PHONE || '0112345678',
          email: res.data.SUPPORT_EMAIL || 'admin@medicalcare.com'
        });
      }
    } catch (err) {
      console.log('Error fetching admin contact info:', err);
    }
  };

  const resolveImage = (imgPath) => {
    if (!imgPath) return null;
    if (imgPath.startsWith('http') || imgPath.startsWith('data:image')) return imgPath;
    const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'http://localhost:5000';
    return `${baseUrl}${imgPath}`;
  };

  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setNewImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/professional/profile');
      if (res.data) {
        setBookingFee(res.data.bookingFee?.toString() || '0');
        setWorkingHospital(res.data.workingHospital || '');
        setAddress(res.data.address || '');
        setPhone(res.data.user?.phone || '');
        setLocationLat(res.data.locationLat);
        setLocationLng(res.data.locationLng);
        setProfileImage(res.data.profileImage || null);
      }
    } catch (err) {
      console.log('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    setFetchingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access location was denied');
        setFetchingLocation(false);
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocationLat(loc.coords.latitude);
      setLocationLng(loc.coords.longitude);
      Alert.alert('Success', 'Location updated successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch location');
    }
    setFetchingLocation(false);
  };

  const handleSave = async () => {
    // Password validation if entered
    if (newPassword || currentPassword || confirmPassword) {
      if (!currentPassword) {
        setAlertConfig({
          visible: true,
          type: 'error',
          title: 'Validation Error',
          message: 'Please enter your current password to change it.',
          onConfirm: null
        });
        return;
      }
      if (!newPassword || newPassword.length < 6) {
        setAlertConfig({
          visible: true,
          type: 'error',
          title: 'Validation Error',
          message: 'New password must be at least 6 characters long.',
          onConfirm: null
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        setAlertConfig({
          visible: true,
          type: 'error',
          title: 'Validation Error',
          message: 'New password and confirm password do not match.',
          onConfirm: null
        });
        return;
      }
    }

    try {
      setSaving(true);
      const payload = {
        bookingFee: parseFloat(bookingFee) || 0,
        workingHospital,
        address,
        phone,
        locationLat,
        locationLng
      };

      if (newImageBase64) {
        payload.profileImage = newImageBase64;
      }

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await api.put('/professional/profile', payload);
      
      // Update local authContext user phone if returned
      if (res.data?.profile?.user && setUser) {
        setUser(prev => ({
          ...prev,
          phone: res.data.profile.user.phone
        }));
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);

      // Show Beautiful Success Popup
      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Profile Updated! 🎉',
        message: 'Your personal details, contact number, and profile picture have been updated successfully.',
        onConfirm: () => {
          setAlertConfig(prev => ({ ...prev, visible: false }));
          handleBack();
        }
      });
    } catch (err) {
      console.log('Error saving profile:', err);
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Update Failed',
        message: err.response?.data?.message || 'Failed to update profile details.',
        onConfirm: null
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('ProfessionalApp', { screen: 'ProfileTab' });
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header with Back Button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <TouchableOpacity 
          onPress={handleBack}
          style={{ 
            padding: 8, 
            borderRadius: 20, 
            backgroundColor: colors.surface, 
            marginRight: 12,
            borderWidth: 1,
            borderColor: colors.border
          }}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>Edit Profile Details</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        
        {/* Profile Picture (Avatar) Section */}
        <View style={{ alignItems: 'center', marginBottom: 24, paddingBottom: 18, borderBottomWidth: 1, borderColor: colors.border }}>
          <View style={{ position: 'relative' }}>
            {newImageBase64 || profileImage ? (
              <Image 
                source={{ uri: newImageBase64 || resolveImage(profileImage) }}
                style={{ width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: colors.primary }}
              />
            ) : (
              <View style={{ 
                width: 100, 
                height: 100, 
                borderRadius: 50, 
                backgroundColor: colors.primary + '20', 
                justifyContent: 'center', 
                alignItems: 'center',
                borderWidth: 2,
                borderColor: colors.primary,
                borderStyle: 'dashed'
              }}>
                <Text style={{ fontSize: 36, fontWeight: 'bold', color: colors.primary }}>
                  {user?.fullName?.charAt(0) || 'D'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={pickProfileImage}
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: colors.primary,
                width: 34,
                height: 34,
                borderRadius: 17,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: colors.surface,
                elevation: 3,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
              }}
            >
              <Ionicons name="camera" size={17} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={pickProfileImage}
            style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Ionicons name="image-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>
              {newImageBase64 || profileImage ? 'Change Profile Picture' : 'Upload Profile Picture'}
            </Text>
          </TouchableOpacity>
          {newImageBase64 ? (
            <Text style={{ fontSize: 11, color: colors.success || '#10b981', marginTop: 4, fontWeight: '600' }}>
              New photo selected (tap Save to apply)
            </Text>
          ) : null}
        </View>

        {/* Contact Phone Number */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Direct Contact Phone Number 📞</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="e.g. 0771234567"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Working Hospital / Clinic */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Now Working Place (Hospital/Clinic) 🏥</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={workingHospital}
            onChangeText={setWorkingHospital}
            placeholder="e.g. Asiri Hospital / Kalubowila Hospital"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Practice / Clinic Address */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Clinic / Residential Address 📍</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={address}
            onChangeText={setAddress}
            placeholder="e.g. No. 12, Station Road, Dehiwala"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Booking Fee */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Booking / Home Visit Fee (Rs.) 💳</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={bookingFee}
            onChangeText={setBookingFee}
            keyboardType="numeric"
            placeholder="e.g. 2500"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Location Pin */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Service Center Location GPS 📍</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <TouchableOpacity 
              style={[styles.locationBtn, { backgroundColor: colors.primary }]}
              onPress={handleGetLocation}
              disabled={fetchingLocation}
            >
              {fetchingLocation ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="location" size={18} color="#fff" />
                  <Text style={styles.locationBtnText}>
                    {locationLat && locationLng ? 'Update Current Location' : 'Get Current GPS'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {locationLat && locationLng && (
              <Text style={{ marginLeft: 12, color: colors.success || '#10b981', fontWeight: 'bold', fontSize: 13 }}>Location Set ✅</Text>
            )}
          </View>
        </View>

        {/* Password Update Toggle Section */}
        <View style={{ marginTop: 10, borderTopWidth: 1, borderColor: colors.border, paddingTop: 16 }}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }}
            onPress={() => setShowPasswordSection(!showPasswordSection)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="key-outline" size={18} color={colors.primary} />
              <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }}>Change Account Password</Text>
            </View>
            <Ionicons name={showPasswordSection ? "chevron-up" : "chevron-down"} size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {showPasswordSection && (
            <View style={{ marginTop: 14, backgroundColor: colors.background, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: colors.border }}>
              <View style={styles.inputContainer}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>Current Password</Text>
                </View>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.textMuted}
                />

                {/* Forgot Current Password Notice Box */}
                <View style={{ 
                  marginTop: 8, 
                  padding: 10, 
                  backgroundColor: colors.surface, 
                  borderRadius: 8, 
                  borderWidth: 1, 
                  borderColor: colors.border,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginRight: 5 }} />
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text }}>Forgot Current Password?</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textLight, lineHeight: 16 }}>
                    If you do not remember your current password, please contact the System Administrator to reset it:
                  </Text>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                    {adminContact.phone ? (
                      <TouchableOpacity 
                        onPress={() => Linking.openURL(`tel:${adminContact.phone}`)}
                        style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          backgroundColor: colors.primary + '15', 
                          paddingHorizontal: 8, 
                          paddingVertical: 5, 
                          borderRadius: 6 
                        }}
                      >
                        <Ionicons name="call" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{adminContact.phone}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {adminContact.email ? (
                      <TouchableOpacity 
                        onPress={() => Linking.openURL(`mailto:${adminContact.email}?subject=Request Password Reset`)}
                        style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          backgroundColor: colors.primary + '15', 
                          paddingHorizontal: 8, 
                          paddingVertical: 5, 
                          borderRadius: 6 
                        }}
                      >
                        <Ionicons name="mail" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 12, fontWeight: '600', color: colors.primary }}>{adminContact.email}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>New Password (min 6 characters)</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={[styles.label, { color: colors.text }]}>Confirm New Password</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  placeholder="Re-type new password"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? "checkbox" : "square-outline"} size={18} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.textLight }}>Show Passwords</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: colors.primary, marginTop: 24 }, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Profile Changes</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Modern Pop-up Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => {
          if (alertConfig.onConfirm) {
            alertConfig.onConfirm();
          } else {
            setAlertConfig(prev => ({ ...prev, visible: false }));
          }
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  locationBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  saveBtn: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default EditProfessionalProfileScreen;
