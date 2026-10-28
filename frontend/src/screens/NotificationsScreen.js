import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/themeContext';
import { AuthContext } from '../context/authContext';
import { Ionicons } from '@expo/vector-icons';
export default function NotificationsScreen({ navigation }) {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();
  const { colors } = useTheme();
  const { user } = React.useContext(AuthContext);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      markAsRead(item.id);
    }
    
    const role = user?.role;
    let rootStack = 'PatientApp';
    if (role === 'ADMIN') rootStack = 'AdminApp';
    else if (role === 'VENDOR' || role === 'PHARMACIST') rootStack = 'VendorApp';
    else if (role === 'ELDER_HOME') rootStack = 'ElderHomeApp';
    else if (role === 'DOCTOR' || role === 'NURSE' || role === 'PARAMEDIC' || role === 'LAB_TECH' || role === 'CAREGIVER') rootStack = 'ProfessionalApp';

    const titleLower = (item.title || '').toLowerCase();
    const msgLower = (item.message || '').toLowerCase();

    // 1. ADMIN - Registration Approval or System Alert
    if (role === 'ADMIN') {
      if (item.type === 'SYSTEM_ALERT' || titleLower.includes('approval') || titleLower.includes('registration') || msgLower.includes('approval') || msgLower.includes('registered')) {
        let detectedRole = 'ALL';
        if (msgLower.includes('elder_home') || msgLower.includes('elder home')) detectedRole = 'ELDER_HOME';
        else if (msgLower.includes('doctor')) detectedRole = 'DOCTOR';
        else if (msgLower.includes('nurse')) detectedRole = 'NURSE';
        else if (msgLower.includes('paramedic')) detectedRole = 'PARAMEDIC';
        else if (msgLower.includes('lab_tech') || msgLower.includes('lab tech')) detectedRole = 'LAB_TECH';
        else if (msgLower.includes('caregiver')) detectedRole = 'CAREGIVER';
        else if (msgLower.includes('pharmacist') || msgLower.includes('vendor')) detectedRole = 'PHARMACIST';

        navigation.navigate('AdminApp', {
          screen: 'AdminHome',
          params: {
            screen: 'Approvals',
            params: { roleFilter: detectedRole, userId: item.relatedId }
          }
        });
        return;
      }
      navigation.navigate('AdminApp', { screen: 'AdminHome', params: { screen: 'Overview' } });
      return;
    }

    // 2. APPOINTMENT & MESSAGE
    if (item.type === 'APPOINTMENT' || item.type === 'MESSAGE') {
      if (rootStack === 'PatientApp') {
        navigation.navigate('PatientApp', {
          screen: 'MainTabs',
          params: {
            screen: 'AppointmentsTab',
            params: { appointmentId: item.relatedId, action: item.type === 'MESSAGE' ? 'openChat' : 'view' }
          }
        });
      } else if (rootStack === 'ProfessionalApp') {
        navigation.navigate('ProfessionalApp', {
          screen: 'AppointmentsTab',
          params: { appointmentId: item.relatedId, action: item.type === 'MESSAGE' ? 'openChat' : 'view' }
        });
      } else if (rootStack === 'ElderHomeApp') {
        navigation.navigate('ElderHomeApp', { screen: 'ElderHomeHome' });
      }
      return;
    }

    // 3. ORDER (Prescriptions / Vendor store)
    if (item.type === 'ORDER') {
      if (rootStack === 'PatientApp') {
        navigation.navigate('PatientApp', {
          screen: 'MainTabs',
          params: { screen: 'PrescriptionsTab', params: { orderId: item.relatedId } }
        });
      } else {
        navigation.navigate('VendorApp', { screen: 'VendorOrders', params: { orderId: item.relatedId } });
      }
      return;
    }

    // 4. PRESCRIPTION ISSUED
    if (item.type === 'PRESCRIPTION') {
      if (rootStack === 'PatientApp') {
        navigation.navigate('PatientApp', {
          screen: 'MainTabs',
          params: { screen: 'PrescriptionsTab', params: { appointmentId: item.relatedId } }
        });
      }
      return;
    }

    // 5. SOS EMERGENCY
    if (item.type === 'SOS') {
      if (role === 'PARAMEDIC') {
        navigation.navigate('ProfessionalApp', { screen: 'SOSRequests', params: { sosId: item.relatedId } });
      } else if (rootStack === 'PatientApp') {
        navigation.navigate('PatientApp', { screen: 'MainTabs', params: { screen: 'HomeTab' } });
      }
      return;
    }

    // 6. ACCOUNT APPROVAL NOTIFICATIONS
    if (titleLower.includes('approved') || msgLower.includes('approved')) {
      if (rootStack === 'ElderHomeApp') navigation.navigate('ElderHomeApp', { screen: 'ElderHomeHome' });
      else if (rootStack === 'ProfessionalApp') navigation.navigate('ProfessionalApp', { screen: 'ProfessionalHome' });
      else if (rootStack === 'VendorApp') navigation.navigate('VendorApp', { screen: 'VendorHome' });
      else navigation.navigate('PatientApp', { screen: 'MainTabs', params: { screen: 'HomeTab' } });
      return;
    }

    // 7. General fallback
    if (rootStack === 'ElderHomeApp') {
      navigation.navigate('ElderHomeApp', { screen: 'ElderHomeHome' });
    } else if (rootStack === 'ProfessionalApp') {
      navigation.navigate('ProfessionalApp', { screen: 'ProfessionalHome' });
    } else if (rootStack === 'VendorApp') {
      navigation.navigate('VendorApp', { screen: 'VendorHome' });
    } else {
      navigation.navigate('PatientApp', { screen: 'MainTabs', params: { screen: 'HomeTab' } });
    }
  };

  const getNotificationIcon = (item) => {
    const titleLower = (item.title || '').toLowerCase();
    const msgLower = (item.message || '').toLowerCase();
    if (item.type === 'APPOINTMENT') return 'calendar';
    if (item.type === 'MESSAGE') return 'chatbubble-ellipses';
    if (item.type === 'ORDER') return 'cube';
    if (item.type === 'PRESCRIPTION') return 'document-text';
    if (item.type === 'SOS') return 'alert-circle';
    if (titleLower.includes('approval') || titleLower.includes('registration') || msgLower.includes('approval')) return 'person-add';
    return 'notifications';
  };

  const getNotificationColor = (item) => {
    const titleLower = (item.title || '').toLowerCase();
    if (item.type === 'SOS') return colors.danger || '#ef4444';
    if (titleLower.includes('approval') || titleLower.includes('registration')) return '#0ea5e9';
    if (item.type === 'APPOINTMENT') return '#10b981';
    if (item.type === 'ORDER') return '#8b5cf6';
    return colors.primary;
  };

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleString();
  };

  const renderItem = ({ item }) => {
    const iconName = getNotificationIcon(item);
    const iconColor = getNotificationColor(item);

    return (
      <TouchableOpacity 
        style={[styles.notificationCard, { backgroundColor: item.isRead ? colors.background : colors.primary + '10' }]} 
        onPress={() => handleNotificationClick(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          <Ionicons 
            name={iconName} 
            size={22} 
            color={iconColor} 
          />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: colors.text, fontWeight: item.isRead ? 'normal' : 'bold' }]}>
            {item.title}
          </Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{item.message}</Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>{formatTime(item.createdAt)}</Text>
        </View>
        {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Recent Updates & Alerts</Text>
        <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
          <Ionicons name="checkmark-done" size={16} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={[styles.markAllText, { color: colors.primary }]}>Mark all as read</Text>
        </TouchableOpacity>
      </View>
      
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
  }
});
