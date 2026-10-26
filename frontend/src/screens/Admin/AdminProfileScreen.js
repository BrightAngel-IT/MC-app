import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Image, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { AuthContext } from '../../context/authContext';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';
import CustomAlertModal from '../../components/CustomAlertModal';

const AdminProfileScreen = () => {
  const { user, logout } = useContext(AuthContext);
  const { colors, toggleTheme, isDarkMode } = useTheme();
  
  const styles = getStyles(colors);

  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [distanceCharge, setDistanceCharge] = useState('50');
  const [savingSettings, setSavingSettings] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await api.get('/admin/settings');
      if (res.data) {
        if (res.data.SUPPORT_PHONE) setSupportPhone(res.data.SUPPORT_PHONE);
        if (res.data.SUPPORT_EMAIL) setSupportEmail(res.data.SUPPORT_EMAIL);
        if (res.data.DISTANCE_CHARGE_PER_KM) setDistanceCharge(res.data.DISTANCE_CHARGE_PER_KM);
      }
    } catch(err) {
      console.log('Error fetching admin settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await api.put('/admin/settings', { key: 'SUPPORT_PHONE', value: supportPhone.trim() });
      await api.put('/admin/settings', { key: 'SUPPORT_EMAIL', value: supportEmail.trim() });
      await api.put('/admin/settings', { key: 'DISTANCE_CHARGE_PER_KM', value: distanceCharge.trim() });
      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Settings Saved! 🎉',
        message: 'Helpdesk Support hotline number and email address have been updated successfully.'
      });
    } catch(err) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to update support contact settings. Please try again.'
      });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{user?.fullName?.charAt(0) || 'A'}</Text>
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>

      {/* Admin Support Contact Details Section */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <Ionicons name="headset-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.sectionTitle}>Helpdesk & Support Contact Info</Text>
        </View>
        <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: 14 }}>
          Users and Professionals who forget their password or need assistance will be instructed to contact these details:
        </Text>

        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 6 }}>Support Hotline / WhatsApp 📞</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={supportPhone}
            onChangeText={setSupportPhone}
            placeholder="e.g. +94 77 123 4567 or 011 234 5678"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 6 }}>Support Email Address ✉️</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={supportEmail}
            onChangeText={setSupportEmail}
            placeholder="e.g. admin@medicalcare.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSaveSettings}
          disabled={savingSettings}
        >
          {savingSettings ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Save Support Contact Details</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* App Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Preferences</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <MaterialCommunityIcons name="theme-light-dark" size={24} color={colors.primary} />
            <Text style={styles.settingText}>Dark Mode</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary + '80' }}
            thumbColor={isDarkMode ? colors.primary : '#f4f3f4'}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <MaterialCommunityIcons name="logout" size={20} color="#ffffff" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: SIZES.padding,
  },
  header: {
    alignItems: 'center',
    marginVertical: 30,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  email: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 4,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    marginTop: 20,
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    padding: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: colors.text,
    marginLeft: 12,
  },
  logoutBtn: {
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: SIZES.radius,
    marginTop: 40,
  },
  logoutText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
});

export default AdminProfileScreen;
