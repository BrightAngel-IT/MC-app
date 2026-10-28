import React, { useState, useEffect , useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, Alert, ActivityIndicator, Image, Linking, Platform } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const PharmacyScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Patient Location for distance calculation
  const [patientLocation, setPatientLocation] = useState(null);

  // Send to Pharmacist Modal
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [pharmacists, setPharmacists] = useState([]);
  const [selectedPharmacist, setSelectedPharmacist] = useState(null);
  const [modalSearch, setModalSearch] = useState('');

  // Reply to Pharmacist Modal
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  // View Bill Image Modal
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [viewingBillUrl, setViewingBillUrl] = useState(null);
  const [downloadingBill, setDownloadingBill] = useState(false);

  const resolveBillUrl = (url) => {
    if (!url) return null;
    const apiBase = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'https://mcbackend.crescereluna.com';
    // If it's a relative path like /uploads/bills/...
    if (url.startsWith('/uploads')) {
      return `${apiBase}${url}`;
    }
    // If it contains localhost/127.0.0.1 on a live mobile device or live web domain
    if (url.includes('localhost:5000') || url.includes('127.0.0.1:5000')) {
      const isLocalHost = Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      if (!isLocalHost) {
        return url.replace(/^http:\/\/(localhost|127\.0\.0\.1):5000/, apiBase);
      }
    }
    return url;
  };

  const handleDownloadBill = async () => {
    const targetUrl = resolveBillUrl(viewingBillUrl);
    if (!targetUrl) return;
    try {
      setDownloadingBill(true);
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = targetUrl;
        link.download = `pharmacy_bill_${Date.now()}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fileUri = FileSystem.documentDirectory + `pharmacy_bill_${Date.now()}.png`;
        if (targetUrl.startsWith('http')) {
          await FileSystem.downloadAsync(targetUrl, fileUri);
        } else {
          let base64Code = targetUrl.includes(',') ? targetUrl.split(',')[1] : targetUrl;
          base64Code = base64Code.replace(/[^A-Za-z0-9+/=]/g, '');
          while (base64Code.length % 4 > 0) {
            base64Code += '=';
          }
          await FileSystem.writeAsStringAsync(fileUri, base64Code, { encoding: FileSystem.EncodingType.Base64 });
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Download Bill' });
        } else {
          Alert.alert('Notice', 'Sharing is not supported on this device');
        }
      }
    } catch (err) {
      console.log('Error downloading bill:', err);
      Alert.alert('Download Failed', err.message || 'Could not download bill.');
    } finally {
      setDownloadingBill(false);
    }
  };

  // Chat History Toggle
  const [expandedChats, setExpandedChats] = useState({});
  const [activeFilter, setActiveFilter] = useState('ALL');

  const toggleChat = (orderId) => {
    setExpandedChats(prev => ({...prev, [orderId]: !prev[orderId]}));
  };

  const styles = getStyles(colors);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const handleOpenMap = (pharma) => {
    if (pharma.locationLat && pharma.locationLng) {
      const label = pharma.businessName || pharma.user?.fullName || 'Pharmacy';
      const url = Platform.select({
        ios: `maps:0,0?q=${pharma.locationLat},${pharma.locationLng}(${label})`,
        android: `geo:0,0?q=${pharma.locationLat},${pharma.locationLng}(${label})`,
        default: `https://www.google.com/maps/search/?api=1&query=${pharma.locationLat},${pharma.locationLng}`
      });
      Linking.openURL(url).catch(() => {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${pharma.locationLat},${pharma.locationLng}`);
      });
    } else {
      Alert.alert('Location Notice', `${pharma.businessName || 'Pharmacy'} location: ${pharma.address || 'Address provided on contact'}`);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPrescriptions();
      fetchPharmacists();
      getUserLocation();
    }, [])
  );

  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let loc = await Location.getCurrentPositionAsync({});
        setPatientLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch (e) {
      console.log('Location fetch failed');
    }
  };

  useEffect(() => {
    if (route?.params?.orderId) {
      setExpandedChats(prev => ({...prev, [route.params.orderId]: true}));
    }
  }, [route?.params?.orderId]);

  const fetchPrescriptions = async () => {
    try {
      const response = await api.get('/patient/prescriptions');
      setPrescriptions(response.data.prescriptions || []);
    } catch (error) {
      console.log('Failed to fetch prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPharmacists = async () => {
    try {
      const response = await api.get('/patient/pharmacists');
      setPharmacists(response.data.vendors || response.data.pharmacists || []);
    } catch (error) {
      console.log('Failed to load pharmacists');
    }
  };

  const handleOpenSend = async (prescription) => {
    setSelectedPrescription(prescription);
    setSelectedPharmacist(null);
    setSendModalVisible(true);
    fetchPharmacists();
  };

  const handleSendToPharmacy = async () => {
    if (!selectedPharmacist) {
      Alert.alert('Error', 'Please select a pharmacy');
      return;
    }
    try {
      await api.post('/patient/order', {
        prescriptionId: selectedPrescription.id,
        pharmacistId: selectedPharmacist.id
      });
      Alert.alert('Success', `Prescription sent to ${selectedPharmacist.businessName || 'Pharmacy'}! They will prepare your medicines and bill.`);
      setSendModalVisible(false);
      setSelectedPharmacist(null);
      fetchPrescriptions();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to send prescription');
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return Alert.alert('Error', 'Please enter a reply');
    try {
      await api.put(`/patient/order/${selectedPrescription.id}/reply`, {
        patientNotes: replyText
      });
      Alert.alert('Success', 'Reply sent to pharmacist!');
      setReplyModalVisible(false);
      setReplyText('');
      fetchPrescriptions();
    } catch (error) {
      Alert.alert('Error', 'Failed to send reply');
    }
  };

  const handleCancelOrder = async (prescriptionId) => {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order? You will be able to send it to another pharmacy.', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try {
            await api.put(`/patient/order/${prescriptionId}/cancel`);
            Alert.alert('Success', 'Order cancelled successfully!');
            fetchPrescriptions();
          } catch (error) {
            Alert.alert('Error', 'Failed to cancel order');
          }
      }}
    ]);
  };

  const handleUpdatePrescriptionStatus = async (prescriptionId, status) => {
    let title = status === 'BIN' ? 'Move to Bin' : (status === 'DELETED' ? 'Delete Permanently' : 'Restore');
    let message = status === 'BIN' ? 'Are you sure you want to move this prescription to the bin?' : 
                  (status === 'DELETED' ? 'Are you sure you want to PERMANENTLY delete this prescription? This cannot be undone.' : 
                  'Are you sure you want to restore this prescription?');

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: title, style: status === 'DELETED' ? 'destructive' : 'default', onPress: async () => {
          try {
            await api.put(`/patient/prescription/${prescriptionId}/status`, { status });
            Alert.alert('Success', `Prescription ${status === 'BIN' ? 'moved to bin' : status === 'DELETED' ? 'deleted' : 'restored'}`);
            fetchPrescriptions();
          } catch (error) {
            Alert.alert('Error', 'Failed to update prescription');
          }
      }}
    ]);
  };

  const renderPrescription = ({ item }) => {
    const latestOrder = item.orders && item.orders.length > 0 ? item.orders[0] : null;
    const isOrderActive = latestOrder && latestOrder.status !== 'CANCELED' && latestOrder.status !== 'REJECTED';
    const isOrderAccepted = latestOrder && (latestOrder.status === 'ACCEPTED' || latestOrder.status === 'COMPLETED');
    const isOrderRejected = latestOrder && latestOrder.status === 'REJECTED';

    return (
      <View style={styles.prescCard}>
        <View style={styles.prescHeader}>
          <View>
            <Text style={styles.drName}>Dr. {item.professional?.user?.fullName || 'Assigned Doctor'}</Text>
            <Text style={styles.prescDate}>Issued: {new Date(item.issuedAt).toLocaleDateString()}</Text>
          </View>
          {latestOrder && (
            <View style={[
              styles.miniStatusBadge,
              isOrderAccepted ? { backgroundColor: colors.success + '20', borderColor: colors.success } :
              (isOrderRejected ? { backgroundColor: colors.danger + '20', borderColor: colors.danger } :
              { backgroundColor: colors.warning + '20', borderColor: colors.warning })
            ]}>
              <Text style={{
                fontSize: 11,
                fontWeight: 'bold',
                color: isOrderAccepted ? colors.success : (isOrderRejected ? colors.danger : colors.warning)
              }}>
                {latestOrder.status}
              </Text>
            </View>
          )}
        </View>

        {item.notes ? (
          <Text style={styles.prescNotes}>Doctor Notes: "{item.notes}"</Text>
        ) : null}
        
        {item.items && item.items.length > 0 && (
          <View style={styles.medsContainer}>
            <Text style={styles.medsTitle}>Prescribed Medicines:</Text>
            {item.items.map(med => (
              <View key={med.id} style={styles.medRow}>
                <View style={styles.medDot} />
                <Text style={styles.medText}>
                  <Text style={{ fontWeight: 'bold' }}>{med.medicineName}</Text> — {med.dosage} ({med.duration})
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Active Order Section */}
        {isOrderActive ? (
          <View style={{ marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            {/* Pharmacy Info Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialCommunityIcons name="storefront-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>
                  {latestOrder.pharmacist?.businessName || 'Partner Pharmacy'}
                </Text>
              </View>
              {latestOrder.pharmacist?.user?.phone && (
                <TouchableOpacity 
                  onPress={() => Linking.openURL(`tel:${latestOrder.pharmacist.user.phone}`).catch(() => {})}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <Ionicons name="call" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: 'bold' }}>Call</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Bill Details if Accepted */}
            {isOrderAccepted && (
              <View style={{ backgroundColor: colors.success + '15', padding: 12, borderRadius: SIZES.radius, marginBottom: 10, borderWidth: 1, borderColor: colors.success + '40' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.success }}>
                    Medicine Bill Ready
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.success }}>
                    Rs. {(latestOrder.totalAmount || 0).toFixed(2)}
                  </Text>
                </View>
                {latestOrder.billImageUrl && (
                  <TouchableOpacity 
                    style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 8, borderRadius: 6 }}
                    onPress={() => {
                      setViewingBillUrl(latestOrder.billImageUrl);
                      setBillModalVisible(true);
                    }}
                  >
                    <Ionicons name="receipt-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: 'bold' }}>View Pharmacist Invoice / Bill</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Status explanation */}
            <View style={[styles.statusBadge, { alignSelf: 'flex-start', marginBottom: 8 }]}>
              <FontAwesome5 
                name={latestOrder.status === 'COMPLETED' ? "check-circle" : (latestOrder.status === 'ACCEPTED' ? "clipboard-check" : "clock")} 
                size={13} 
                color={isOrderAccepted ? colors.success : colors.warning} 
                style={{marginRight: 6}} 
              />
              <Text style={[styles.statusBadgeText, { color: isOrderAccepted ? colors.success : colors.warning }]}>
                {latestOrder.status === 'COMPLETED' ? 'Order Fulfilled & Completed' : 
                 latestOrder.status === 'ACCEPTED' ? 'Prescription Accepted & Bill Sent' :
                 latestOrder.messages && latestOrder.messages.length > 0 ? 
                   (latestOrder.messages[latestOrder.messages.length - 1].sender === 'PATIENT' ? 'Reply Sent to Pharmacy' : 'Pharmacy requested info') :
                 latestOrder.patientNotes ? 'Reply Sent to Pharmacy' :
                 latestOrder.vendorNotes ? 'Pharmacy requested info' :
                 'Waiting for Pharmacy Approval...'}
              </Text>
            </View>

            {/* Chat History */}
            {latestOrder.messages && latestOrder.messages.length > 0 ? (
              <View style={{ marginTop: 8, padding: 10, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border }}>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: expandedChats[latestOrder.id] ? 8 : 0 }}
                  onPress={() => toggleChat(latestOrder.id)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text }}>Conversation ({latestOrder.messages.length})</Text>
                    {latestOrder.messages[latestOrder.messages.length - 1].sender === 'VENDOR' && (
                      <View style={{ backgroundColor: colors.danger, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 8 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>New</Text>
                      </View>
                    )}
                  </View>
                  <FontAwesome5 name={expandedChats[latestOrder.id] ? "chevron-up" : "chevron-down"} size={12} color={colors.textLight} />
                </TouchableOpacity>
                
                {expandedChats[latestOrder.id] && latestOrder.messages.map(msg => (
                  <View key={msg.id} style={{ 
                    marginBottom: 6, 
                    alignSelf: msg.sender === 'PATIENT' ? 'flex-end' : 'flex-start',
                    backgroundColor: msg.sender === 'PATIENT' ? colors.primary + '20' : colors.surface,
                    padding: 8, 
                    borderRadius: 8,
                    maxWidth: '85%',
                    borderWidth: msg.sender === 'PATIENT' ? 0 : 1,
                    borderColor: colors.border
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: msg.sender === 'PATIENT' ? colors.primary : colors.warning, marginBottom: 2 }}>
                      {msg.sender === 'PATIENT' ? 'You' : 'Pharmacist'}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text }}>{msg.text}</Text>
                    <Text style={{ fontSize: 9, color: colors.textLight, marginTop: 2, alignSelf: 'flex-end' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <>
                {latestOrder.vendorNotes && (
                  <View style={{ backgroundColor: colors.warning + '20', padding: 8, borderRadius: SIZES.radius, marginTop: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.warning, marginBottom: 2 }}>Message from Pharmacist:</Text>
                    <Text style={{ fontSize: 12, color: colors.text }}>{latestOrder.vendorNotes}</Text>
                  </View>
                )}
                {latestOrder.patientNotes && (
                  <View style={{ backgroundColor: colors.primary + '20', padding: 8, borderRadius: SIZES.radius, marginTop: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary, marginBottom: 2 }}>Your Reply:</Text>
                    <Text style={{ fontSize: 12, color: colors.text }}>{latestOrder.patientNotes}</Text>
                  </View>
                )}
              </>
            )}

            {/* Action buttons while PENDING */}
            {latestOrder.status === 'PENDING' && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
                {latestOrder.vendorNotes && (
                  <TouchableOpacity 
                    style={{ flex: 1, padding: 10, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 1, borderColor: colors.primary }}
                    onPress={() => {
                      setSelectedPrescription(item);
                      setReplyText('');
                      setReplyModalVisible(true);
                    }}
                  >
                    <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>
                      {latestOrder.patientNotes ? 'Edit Reply' : 'Reply to Pharmacist'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={{ flex: latestOrder.vendorNotes ? 1 : undefined, padding: 10, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 1, borderColor: colors.danger, width: latestOrder.vendorNotes ? 'auto' : '100%' }}
                  onPress={() => handleCancelOrder(item.id)}
                >
                  <Text style={{ color: colors.danger, fontWeight: 'bold', fontSize: 13 }}>Cancel Order</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* If no active order, or rejected order */
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            {isOrderRejected && (
              <View style={{ backgroundColor: colors.danger + '15', padding: 10, borderRadius: SIZES.radius, marginBottom: 10, borderWidth: 1, borderColor: colors.danger + '40' }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.danger, marginBottom: 2 }}>
                  Declined by {latestOrder.pharmacist?.businessName || 'Pharmacy'}
                </Text>
                {latestOrder.rejectionReason && (
                  <Text style={{ fontSize: 12, color: colors.text }}>
                    Reason: {latestOrder.rejectionReason}
                  </Text>
                )}
                <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 4 }}>
                  You can send this prescription to another pharmacy below.
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              {item.status !== 'BIN' && (
                <TouchableOpacity style={[styles.sendBtn, { flex: 1 }]} onPress={() => handleOpenSend(item)}>
                  <FontAwesome5 name="paper-plane" size={14} color="#fff" style={{marginRight: 8}} />
                  <Text style={styles.sendBtnText}>{isOrderRejected ? 'Send to Another Pharmacy' : 'Send to Pharmacy'}</Text>
                </TouchableOpacity>
              )}
              {item.status === 'BIN' ? (
                <>
                  <TouchableOpacity 
                    style={{ flex: 1, padding: 12, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 1, borderColor: colors.primary }}
                    onPress={() => handleUpdatePrescriptionStatus(item.id, 'ACTIVE')}
                  >
                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Restore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={{ flex: 1, padding: 12, backgroundColor: colors.danger, borderRadius: SIZES.radius, alignItems: 'center' }}
                    onPress={() => handleUpdatePrescriptionStatus(item.id, 'DELETED')}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete Forever</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={{ padding: 12, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 1, borderColor: colors.danger }}
                  onPress={() => handleUpdatePrescriptionStatus(item.id, 'BIN')}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const filteredPrescriptions = prescriptions.filter(item => {
    const isBin = item.status === 'BIN';
    if (activeFilter === 'BIN') return isBin;
    if (isBin) return false;

    const matchesSearch = 
      (item.professional?.user?.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.items && item.items.some(m => m.medicineName.toLowerCase().includes(search.toLowerCase())));
    
    if (!matchesSearch) return false;

    if (activeFilter === 'SENT') {
      return item.orders && item.orders.length > 0 && item.orders[0].status !== 'CANCELED' && item.orders[0].status !== 'REJECTED';
    }
    if (activeFilter === 'PENDING') {
      return !item.orders || item.orders.length === 0 || item.orders[0].status === 'CANCELED' || item.orders[0].status === 'REJECTED';
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>My Prescriptions</Text>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by doctor or medicine..."
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {['ALL', 'PENDING', 'SENT', 'BIN'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, activeFilter === filter && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterChipText, activeFilter === filter && { color: '#fff' }]}>
              {filter === 'ALL' ? 'All' : filter === 'PENDING' ? 'Unsent / Ready' : filter === 'SENT' ? 'Sent to Pharmacy' : 'Bin'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {filteredPrescriptions.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No prescriptions found.</Text>
            </View>
          ) : (
            filteredPrescriptions.map(item => renderPrescription({ item, key: item.id }))
          )}
        </ScrollView>
      )}

      {/* Send to Pharmacy Modal */}
      <Modal visible={sendModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.modalTitle}>Choose Pharmacy</Text>
              <TouchableOpacity onPress={() => setSendModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Select a nearby pharmacy with distance & address:</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, paddingHorizontal: 12, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, marginTop: 10, height: 45 }}>
              <Ionicons name="search" size={18} color={colors.textLight} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.text }}
                placeholder="Search pharmacy name, town..."
                placeholderTextColor={colors.textLight}
                value={modalSearch}
                onChangeText={setModalSearch}
              />
            </View>
            
            <ScrollView style={{ maxHeight: 280, marginVertical: 14 }}>
              {pharmacists.length === 0 ? (
                <Text style={styles.emptyText}>No pharmacies available</Text>
              ) : (
                pharmacists.filter(pharma => 
                  (pharma.businessName || pharma.user?.fullName || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
                  (pharma.address || '').toLowerCase().includes(modalSearch.toLowerCase())
                ).map((pharma) => {
                  const dist = patientLocation && pharma.locationLat && pharma.locationLng ?
                    calculateDistance(patientLocation.lat, patientLocation.lng, pharma.locationLat, pharma.locationLng) : null;

                  return (
                    <TouchableOpacity 
                      key={pharma.id}
                      style={[styles.pharmaCard, selectedPharmacist?.id === pharma.id && { borderColor: colors.primary, borderWidth: 2, backgroundColor: colors.primary + '10' }]}
                      onPress={() => setSelectedPharmacist(pharma)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.pharmaName}>{pharma.businessName || pharma.user?.fullName}</Text>
                          <Text style={styles.pharmaAddress}>{pharma.address || 'Address provided on contact'}</Text>
                        </View>
                        {dist !== null && (
                          <View style={{ backgroundColor: colors.primary + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary }}>{dist} km away</Text>
                          </View>
                        )}
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                        {pharma.user?.phone ? (
                          <Text style={{ fontSize: 12, color: colors.textLight }}>Phone: {pharma.user.phone}</Text>
                        ) : (
                          <Text style={{ fontSize: 12, color: colors.textLight }}>Available for delivery</Text>
                        )}
                        <TouchableOpacity onPress={() => handleOpenMap(pharma)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="location-outline" size={14} color={colors.primary} style={{ marginRight: 3 }} />
                          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: 'bold' }}>Map</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSendModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, !selectedPharmacist && { opacity: 0.5 }]} onPress={handleSendToPharmacy} disabled={!selectedPharmacist}>
                <Text style={styles.submitText}>Send Prescription</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reply Modal */}
      <Modal visible={replyModalVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: SIZES.radiusLg, borderTopRightRadius: SIZES.radiusLg, padding: 20, maxHeight: '80%' }}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Reply to Pharmacist</Text>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={{ backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text, minHeight: 100, textAlignVertical: 'top' }}
              placeholder="Type your message or confirmation here..."
              placeholderTextColor={colors.textLight}
              multiline
              value={replyText}
              onChangeText={setReplyText}
            />

            <TouchableOpacity 
              style={{ backgroundColor: colors.primary, padding: 14, borderRadius: SIZES.radius, alignItems: 'center', marginTop: 15, marginBottom: 20 }}
              onPress={handleSendReply}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Send Reply</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* Bill Image Viewer Modal */}
      <Modal visible={billModalVisible} animationType="fade" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.background, borderRadius: SIZES.radiusLg, padding: 16, width: '100%', maxHeight: '85%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>Medicine Invoice / Bill</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity 
                  onPress={handleDownloadBill} 
                  disabled={downloadingBill}
                  style={{ padding: 4 }}
                >
                  {downloadingBill ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="download-outline" size={22} color={colors.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setBillModalVisible(false)} style={{ padding: 4 }}>
                  <Ionicons name="close" size={24} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }} style={{ width: '100%', maxHeight: 420 }}>
              {viewingBillUrl ? (
                <Image 
                  source={{ uri: resolveBillUrl(viewingBillUrl) }} 
                  style={{ width: '100%', height: 380, resizeMode: 'contain', borderRadius: 8 }} 
                />
              ) : null}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  flexDirection: 'row', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  padding: 12, 
                  backgroundColor: colors.success || '#10b981', 
                  borderRadius: SIZES.radius,
                  gap: 8,
                  opacity: downloadingBill ? 0.7 : 1
                }}
                onPress={handleDownloadBill}
                disabled={downloadingBill}
              >
                {downloadingBill ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Download Bill</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ 
                  flex: 1, 
                  padding: 12, 
                  backgroundColor: colors.surfaceLight || '#e2e8f0', 
                  borderRadius: SIZES.radius, 
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border
                }}
                onPress={() => setBillModalVisible(false)}
              >
                <Text style={{ color: colors.text, fontWeight: 'bold' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: SIZES.padding, paddingTop: 50 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 16, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: colors.border, marginBottom: 14, height: 48 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: colors.text },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  prescCard: { backgroundColor: colors.surfaceLight, padding: 16, borderRadius: SIZES.radius, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  prescHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  drName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  prescDate: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  miniStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  prescNotes: { fontSize: 13, color: colors.text, fontStyle: 'italic', marginBottom: 8 },
  medsContainer: { backgroundColor: colors.roles.PATIENT.bgTint, padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: colors.roles.PATIENT.accent },
  medsTitle: { fontSize: 12, fontWeight: 'bold', color: colors.roles.PATIENT.textTint, marginBottom: 6 },
  medRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  medDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.primary, marginRight: 8 },
  medText: { fontSize: 12, color: colors.text },
  sendBtn: { flexDirection: 'row', backgroundColor: colors.secondary, padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  statusBadge: { flexDirection: 'row', backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '40' },
  statusBadgeText: { color: colors.primary, fontWeight: 'bold', fontSize: 12 },
  
  emptyState: { padding: 30, alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, marginTop: 20 },
  emptyText: { color: colors.textLight, fontStyle: 'italic' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: SIZES.radiusLg, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  label: { fontSize: 13, color: colors.textLight },
  pharmaCard: { backgroundColor: colors.surfaceLight, padding: 12, borderRadius: SIZES.radius, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  pharmaName: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  pharmaAddress: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 12 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { color: colors.textLight, fontWeight: 'bold' },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 10, paddingHorizontal: 18, borderRadius: SIZES.radius },
  submitText: { color: '#fff', fontWeight: 'bold' }
});

export default PharmacyScreen;
