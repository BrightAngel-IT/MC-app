import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, Image, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../../context/authContext';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, Ionicons, MaterialIcons } from '@expo/vector-icons';
import api from '../../api/axios';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const { colors, isDarkMode, toggleTheme } = useTheme();
  
  const styles = getStyles(colors);

  const [distanceCharge, setDistanceCharge] = useState('50');
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [adminContact, setAdminContact] = useState({ phone: '', email: '' });
  const [showHelpCenter, setShowHelpCenter] = useState(false);

  const resolveImage = (imgPath) => {
    if (!imgPath) return null;
    if (imgPath.startsWith('http') || imgPath.startsWith('data:image')) return imgPath;
    const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'http://localhost:5000';
    return `${baseUrl}${imgPath}`;
  };

  const fetchProfileData = async () => {
    try {
      if (user?.role !== 'PATIENT' && user?.role !== 'ADMIN') {
        const res = await api.get('/professional/profile');
        if (res.data?.profileImage) {
          setProfileImage(res.data.profileImage);
        }
      }
    } catch (e) {}
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [user])
  );

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data) {
        if (res.data.DISTANCE_CHARGE_PER_KM) setDistanceCharge(res.data.DISTANCE_CHARGE_PER_KM);
        setAdminContact({
          phone: res.data.SUPPORT_PHONE || '0112345678',
          email: res.data.SUPPORT_EMAIL || 'admin@medicalcare.com'
        });
      }
    } catch(err) {}
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdateSettings = async () => {
    try {
      setUpdatingSettings(true);
      setSuccessMessage('');
      await api.put('/admin/settings', { key: 'DISTANCE_CHARGE_PER_KM', value: distanceCharge });
      setSuccessMessage('Settings updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch(err) { Alert.alert('Error', 'Failed to update settings'); } finally { setUpdatingSettings(false); }
  };

  const handleSupport = () => {
    Alert.alert('Contact Support', 'Our team will reach out to you shortly via email.');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      {/* User Info Card */}
      <View style={styles.profileCard}>
        {profileImage ? (
          <Image 
            source={{ uri: resolveImage(profileImage) }} 
            style={[styles.avatar, { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: colors.primary }]} 
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'U'}</Text>
          </View>
        )}
        <Text style={styles.name}>{user?.fullName || 'User Name'}</Text>
        <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role || 'PATIENT'}</Text>
        </View>
      </View>

      {user?.role === 'ADMIN' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Settings</Text>
          
          <View style={[styles.settingItem, { paddingVertical: 12 }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="car" size={24} color={colors.primary} />
              <Text style={styles.settingText}>Travel Fee (per km)</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>Rs.</Text>
              <TextInput 
                style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, width: 40, textAlign: 'center', marginLeft: 4 }}
                value={distanceCharge.toString()}
                onChangeText={setDistanceCharge}
                keyboardType="numeric"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={{ backgroundColor: colors.primary, padding: 14, borderRadius: SIZES.radius, alignItems: 'center', marginTop: 5 }}
            onPress={handleUpdateSettings}
            disabled={updatingSettings}
          >
            {updatingSettings ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16 }}>Save Changes</Text>}
          </TouchableOpacity>
          {successMessage ? <Text style={{ color: colors.success || '#10b981', textAlign: 'center', marginTop: 10, fontWeight: 'bold' }}>{successMessage}</Text> : null}
        </View>
      )}

      {/* Settings Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => { if (user.role !== 'PATIENT' && user.role !== 'ADMIN') { navigation.navigate('EditProfessionalProfile'); } else { alert('Edit profile is currently available for professionals only.'); } }}>
          <View style={styles.settingLeft}>
            <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
            <Text style={styles.settingText}>Edit Profile</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={14} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={toggleTheme}>
          <View style={styles.settingLeft}>
            <Ionicons name={isDarkMode ? "moon" : "sunny"} size={24} color={colors.primary} />
            <Text style={styles.settingText}>Dark Mode</Text>
          </View>
          <View style={styles.toggleTrack}>
            <View style={[styles.toggleThumb, isDarkMode ? styles.thumbDark : styles.thumbLight]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={24} color={colors.primary} />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Support Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity 
          style={styles.settingItem} 
          onPress={() => setShowHelpCenter(!showHelpCenter)}
        >
          <View style={styles.settingLeft}>
            <MaterialIcons name="support-agent" size={24} color={colors.primary} />
            <Text style={styles.settingText}>Help Center & Support Hotline</Text>
          </View>
          <FontAwesome5 name={showHelpCenter ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Inline Help Center Details Card */}
        {showHelpCenter && (
          <View style={{
            marginTop: 12,
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border
          }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
              Direct Support & Assistance 🎧
            </Text>
            <Text style={{ fontSize: 12, color: colors.textLight, lineHeight: 18, marginBottom: 14 }}>
              For queries, technical assistance, appointment issues or general support, you can contact our Admin helpdesk team:
            </Text>

            <View style={{ gap: 10 }}>
              {adminContact.phone ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${adminContact.phone}`)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                >
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.primary + '18',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12
                  }}>
                    <Ionicons name="call" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: colors.textLight }}>Support Hotline / WhatsApp</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.primary }}>{adminContact.phone}</Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}

              {adminContact.email ? (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`mailto:${adminContact.email}?subject=Patient / Professional Helpdesk Support Request`)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                >
                  <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: colors.primary + '18',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12
                  }}>
                    <Ionicons name="mail" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: colors.textLight }}>Official Support Email</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.primary }}>{adminContact.email}</Text>
                  </View>
                  <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={24} color={colors.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
  },
  header: {
    padding: SIZES.padding,
    paddingTop: 40,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: colors.text, 
  },
  profileCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20', // 20% opacity primary
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: colors.roles.PATIENT.bgTint,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: {
    color: colors.roles.PATIENT.textTint,
    fontWeight: 'bold',
    fontSize: 12,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: SIZES.padding,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textLight,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: SIZES.radius,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
    fontWeight: '500',
  },
  toggleTrack: {
    width: 50,
    height: 28,
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  thumbLight: {
    backgroundColor: '#cbd5e1',
    alignSelf: 'flex-start',
  },
  thumbDark: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-end',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: SIZES.padding,
    marginTop: 40,
    marginBottom: 40,
    padding: 16,
    borderRadius: SIZES.radius,
    backgroundColor: colors.danger + '10',
    borderWidth: 1,
    borderColor: colors.danger + '30',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.danger,
    marginLeft: 10,
  }
});

export default ProfileScreen;
