import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl, 
  Linking, 
  Alert,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/themeContext';
import api from '../../api/axios';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { SIZES } from '../../styles/theme';

const ParamedicSOS = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const [sosRequests, setSosRequests] = useState([]);
  const [myAcceptedSOS, setMyAcceptedSOS] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  // Complete Ride & Payment Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedSOS, setSelectedSOS] = useState(null);
  const [rideAmount, setRideAmount] = useState('1500'); // Default base transport fee
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' or 'CARD'

  const fetchSOS = async () => {
    try {
      const res = await api.get('/professional/sos');
      setSosRequests(res.data.activeSOS || []);
      setMyAcceptedSOS(res.data.myAcceptedSOS || null);
    } catch (error) {
      console.log('Error fetching SOS', error);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSOS();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSOS();
  };

  const handleNavigate = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      if (Platform.OS === 'web') window.alert('Unable to open Google Maps navigation.');
      else Alert.alert('Error', 'Unable to open maps.');
    });
  };

  const handleCallPatient = (phone) => {
    if (!phone) {
      if (Platform.OS === 'web') window.alert('Patient phone number not available.');
      else Alert.alert('Notice', 'Patient phone number not available.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const executeAccept = async (id) => {
    try {
      setLoadingAction(true);
      const res = await api.post(`/professional/sos/${id}/accept`);
      if (Platform.OS === 'web') {
        window.alert('SUCCESS: Emergency SOS Accepted!\nNavigation and patient contact are now active.');
      } else {
        Alert.alert('Success 🚑', 'Emergency SOS Accepted! You can now navigate to the patient.');
      }
      fetchSOS();
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Failed to accept SOS request.';
      if (error.response?.status === 409) {
        // Race condition: another driver accepted it first!
        if (Platform.OS === 'web') {
          window.alert(`Already Taken!\n${errorMsg}`);
        } else {
          Alert.alert('Request Already Claimed ⚠️', errorMsg);
        }
      } else {
        if (Platform.OS === 'web') window.alert(`Error: ${errorMsg}`);
        else Alert.alert('Error', errorMsg);
      }
      fetchSOS(); // Refresh list to remove the already taken item
    } finally {
      setLoadingAction(false);
    }
  };

  const handleAccept = (id) => {
    if (Platform.OS === 'web') {
      const confirmAccept = window.confirm("Are you sure you want to accept this SOS request? You will be assigned to dispatch immediately.");
      if (confirmAccept) executeAccept(id);
    } else {
      Alert.alert(
        'Accept SOS 🚑', 
        'Are you sure you want to accept this request and navigate to the patient?', 
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Accept Dispatch', 
            style: 'default',
            onPress: () => executeAccept(id)
          }
        ]
      );
    }
  };

  const openCompleteModal = (sos) => {
    setSelectedSOS(sos);
    setPaymentMethod('CASH');
    setRideAmount(sos.totalAmount ? String(sos.totalAmount) : '1500');
    setShowCompleteModal(true);
  };

  const handleConfirmCompletion = async () => {
    if (!selectedSOS) return;
    const numericFee = parseFloat(rideAmount);
    if (isNaN(numericFee) || numericFee < 0) {
      if (Platform.OS === 'web') window.alert('Please enter a valid transport fee amount.');
      else Alert.alert('Invalid Amount', 'Please enter a valid transport fee amount.');
      return;
    }

    try {
      setLoadingAction(true);
      const res = await api.post(`/professional/sos/${selectedSOS.id}/complete`, {
        paymentMethod: paymentMethod,
        totalAmount: numericFee
      });

      setShowCompleteModal(false);
      setSelectedSOS(null);

      const successNotice = `Ride successfully completed!\nTotal: Rs. ${numericFee.toFixed(2)} (${paymentMethod})\nPatient has been notified.`;
      if (Platform.OS === 'web') {
        window.alert(successNotice);
      } else {
        Alert.alert('Ride Completed 🎉', successNotice);
      }
      fetchSOS();
    } catch (error) {
      console.error(error);
      const err = error.response?.data?.message || 'Failed to complete emergency ride.';
      if (Platform.OS === 'web') window.alert(err);
      else Alert.alert('Error', err);
    } finally {
      setLoadingAction(false);
    }
  };

  // Render Card for an Active / Ongoing Ride assigned to THIS Paramedic
  const renderMyOngoingRide = (item) => {
    if (!item) return null;
    const patientUser = item.patient?.user;

    return (
      <View style={[styles.activeRideBox, { borderColor: colors.primary }]}>
        <View style={styles.activeRideHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={[styles.pulsingBadge, { backgroundColor: colors.primary }]}>
              <FontAwesome5 name="ambulance" size={16} color="#fff" />
            </View>
            <View style={{marginLeft: 10}}>
              <Text style={styles.activeRideTitle}>Active Emergency Dispatch</Text>
              <Text style={styles.activeRideSubtitle}>In Progress • En route to Patient / Hospital</Text>
            </View>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>ACCEPTED</Text>
          </View>
        </View>

        <View style={styles.patientInfoRow}>
          <Ionicons name="person" size={18} color={colors.textLight} />
          <Text style={styles.patientInfoText}>{patientUser?.fullName || 'Emergency Patient'}</Text>
        </View>

        {patientUser?.phone && (
          <View style={styles.patientInfoRow}>
            <Ionicons name="call" size={18} color={colors.textLight} />
            <Text style={styles.patientInfoText}>{patientUser.phone}</Text>
          </View>
        )}

        <View style={styles.patientInfoRow}>
          <Ionicons name="navigate" size={18} color={colors.textLight} />
          <Text style={styles.patientInfoText}>
            Coordinates: {Number(item.locationLat).toFixed(4)}, {Number(item.locationLng).toFixed(4)}
          </Text>
        </View>

        <View style={styles.activeRideActions}>
          <TouchableOpacity 
            style={[styles.rideBtn, { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1 }]}
            onPress={() => handleNavigate(item.locationLat, item.locationLng)}
          >
            <Ionicons name="map" size={18} color={colors.primary} />
            <Text style={[styles.rideBtnText, { color: colors.primary }]}>Live GPS Route</Text>
          </TouchableOpacity>

          {patientUser?.phone && (
            <TouchableOpacity 
              style={[styles.rideBtn, { backgroundColor: '#0284c7' }]}
              onPress={() => handleCallPatient(patientUser.phone)}
            >
              <Ionicons name="call" size={18} color="#fff" />
              <Text style={[styles.rideBtnText, { color: '#fff' }]}>Call Patient</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.rideBtn, { backgroundColor: colors.success || '#059669', flex: 1.2 }]}
            onPress={() => openCompleteModal(item)}
          >
            <MaterialCommunityIcons name="check-decagram" size={20} color="#fff" />
            <Text style={[styles.rideBtnText, { color: '#fff' }]}>Complete & Bill</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSOS = ({ item }) => {
    const isEmergency = item.status === 'TRIGGERED_EMERGENCY' || item.status === 'TRIGGERED';
    const bgColor = isEmergency ? colors.error + '20' : colors.primary + '20';
    const iconColor = isEmergency ? colors.error : colors.primary;
    
    return (
      <View style={[styles.card, { borderLeftColor: iconColor }]}>
        <View style={styles.cardHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
              <FontAwesome5 name={isEmergency ? "ambulance" : "car"} size={20} color={iconColor} />
            </View>
            <View style={{marginLeft: 10}}>
              <Text style={styles.patientName}>{item.patient?.user?.fullName || 'Emergency Patient'}</Text>
              <Text style={[styles.typeText, { color: iconColor }]}>
                {isEmergency ? '🚨 CRITICAL EMERGENCY' : 'TRANSPORT REQUEST'}
              </Text>
            </View>
          </View>
          <Text style={styles.timeText}>
            {new Date(item.triggeredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} 
            onPress={() => handleNavigate(item.locationLat, item.locationLng)}
          >
            <Ionicons name="map" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>View Location</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.success || '#059669' }]} 
            onPress={() => handleAccept(item.id)}
            disabled={loadingAction}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Accept Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.header}>Ambulance Dispatch Control</Text>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Show Assigned Ongoing Ride if Paramedic accepted an SOS */}
      {myAcceptedSOS && renderMyOngoingRide(myAcceptedSOS)}

      <Text style={styles.sectionSubtitle}>
        Incoming Emergency Broadcasts ({sosRequests.length})
      </Text>
      
      <FlatList
        data={sosRequests}
        keyExtractor={item => item.id}
        renderItem={renderSOS}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="check-circle" size={50} color={colors.success || '#059669'} />
            <Text style={styles.emptyText}>No pending emergency broadcasts.</Text>
            <Text style={styles.emptySubtext}>Any new SOS will trigger a siren push notification immediately.</Text>
          </View>
        }
      />

      {/* Complete Ride & Payment Modal */}
      <Modal
        visible={showCompleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="cash-outline" size={24} color={colors.primary} />
              </View>
              <View style={{marginLeft: 10}}>
                <Text style={styles.modalTitle}>Complete Ride & Collect Payment</Text>
                <Text style={styles.modalSubtitle}>Specify final fare and payment collection method</Text>
              </View>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Transport / Ambulance Fee (LKR)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={rideAmount}
                onChangeText={setRideAmount}
                placeholder="e.g. 1500"
                placeholderTextColor={colors.textLight}
              />

              <Text style={[styles.inputLabel, { marginTop: 15 }]}>Select Payment Method</Text>
              <View style={styles.paymentMethodRow}>
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    paymentMethod === 'CASH' && styles.methodCardSelected,
                    { borderColor: paymentMethod === 'CASH' ? colors.success || '#059669' : colors.border }
                  ]}
                  onPress={() => setPaymentMethod('CASH')}
                >
                  <FontAwesome5 
                    name="money-bill-wave" 
                    size={22} 
                    color={paymentMethod === 'CASH' ? (colors.success || '#059669') : colors.textLight} 
                  />
                  <Text style={[
                    styles.methodText, 
                    paymentMethod === 'CASH' && { color: colors.success || '#059669', fontWeight: 'bold' }
                  ]}>
                    Cash to Driver
                  </Text>
                  <Text style={styles.methodHint}>Patient pays cash in hand</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    paymentMethod === 'CARD' && styles.methodCardSelected,
                    { borderColor: paymentMethod === 'CARD' ? colors.primary : colors.border }
                  ]}
                  onPress={() => setPaymentMethod('CARD')}
                >
                  <Ionicons 
                    name="card" 
                    size={24} 
                    color={paymentMethod === 'CARD' ? colors.primary : colors.textLight} 
                  />
                  <Text style={[
                    styles.methodText, 
                    paymentMethod === 'CARD' && { color: colors.primary, fontWeight: 'bold' }
                  ]}>
                    Online / Card
                  </Text>
                  <Text style={styles.methodHint}>Paid via App Gateway</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setShowCompleteModal(false)}
                disabled={loadingAction}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.success || '#059669' }]}
                onPress={handleConfirmCompletion}
                disabled={loadingAction}
              >
                {loadingAction ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                    <Text style={[styles.modalBtnText, { color: '#fff' }]}>Confirm & Settle</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: SIZES.padding,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  refreshIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginTop: 10,
  },
  // Active Ongoing Ride Card
  activeRideBox: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius + 4,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  activeRideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pulsingBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeRideTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  activeRideSubtitle: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  statusPill: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  patientInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  patientInfoText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  activeRideActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  rideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    gap: 6,
  },
  rideBtnText: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  // SOS Broadcast Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
    color: colors.textLight,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    gap: 8,
  },
  actionBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 6,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius + 6,
    width: '100%',
    maxWidth: 480,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary + '18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textLight,
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 12,
  },
  methodCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: SIZES.radius,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  methodCardSelected: {
    backgroundColor: colors.surface,
  },
  methodText: {
    fontSize: 13,
    marginTop: 6,
    color: colors.text,
  },
  methodHint: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    gap: 6,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  }
});

export default ParamedicSOS;
