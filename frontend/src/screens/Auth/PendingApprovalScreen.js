import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, ActivityIndicator, Linking } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { AuthContext } from '../../context/authContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';

const { width } = Dimensions.get('window');

const PendingApprovalScreen = () => {
  const { colors } = useTheme();
  const { logout, user, checkStatus } = useContext(AuthContext);
  const [adminContact, setAdminContact] = useState({ phone: '', email: '' });

  useEffect(() => {
    // Fetch Admin Helpdesk contact details
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
        console.log('Error fetching admin contact in PendingApproval:', err);
      }
    };
    fetchAdminContact();

    // Ping the backend every 5 seconds to check if status changed
    const interval = setInterval(() => {
      checkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: user?.verificationStatus === 'REJECTED' ? colors.danger + '20' : colors.warning + '20' }]}>
          <FontAwesome5 name={user?.verificationStatus === 'REJECTED' ? "user-times" : "user-clock"} size={60} color={user?.verificationStatus === 'REJECTED' ? colors.danger : colors.warning} />
        </View>
        
        <Text style={[styles.title, { color: colors.text }]}>
          {user?.verificationStatus === 'REJECTED' ? 'Account Rejected' : 'Account Pending Approval'}
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.textLight }]}>
          Hello {user?.fullName || 'there'}, your {user?.role ? user.role.replace('_', ' ').toLowerCase() : 'account'} registration has been {user?.verificationStatus === 'REJECTED' ? 'rejected' : 'received and is currently under review'} by our administration team.
        </Text>
        
        <Text style={[styles.info, { color: colors.textLight }]}>
          {user?.verificationStatus === 'REJECTED' 
            ? 'Unfortunately, your application did not meet our requirements at this time. Please contact support for more information.' 
            : 'You will be notified once your account is verified and approved. This usually takes 24-48 hours.'}
        </Text>

        {/* Admin Support Contact Box */}
        {(adminContact.phone || adminContact.email) && (
          <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="headset" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>Need Help or Clarification?</Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 12, textAlign: 'center' }}>
              You can contact our support administration team directly:
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
              {adminContact.phone ? (
                <TouchableOpacity 
                  onPress={() => Linking.openURL(`tel:${adminContact.phone}`)}
                  style={[styles.contactBtn, { backgroundColor: colors.primary + '18' }]}
                >
                  <Ionicons name="call" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>{adminContact.phone}</Text>
                </TouchableOpacity>
              ) : null}

              {adminContact.email ? (
                <TouchableOpacity 
                  onPress={() => Linking.openURL(`mailto:${adminContact.email}?subject=Inquiry regarding Registration Approval`)}
                  style={[styles.contactBtn, { backgroundColor: colors.primary + '18' }]}
                >
                  <Ionicons name="mail" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>{adminContact.email}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: colors.primary }]} 
          onPress={logout}
        >
          <Text style={styles.btnText}>Return to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.padding * 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SIZES.padding,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SIZES.padding,
  },
  info: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: SIZES.padding * 3,
  },
  btn: {
    width: width * 0.8,
    padding: SIZES.padding,
    borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contactCard: {
    width: width * 0.88,
    maxWidth: 420,
    padding: 16,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: SIZES.padding * 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  }
});

export default PendingApprovalScreen;
