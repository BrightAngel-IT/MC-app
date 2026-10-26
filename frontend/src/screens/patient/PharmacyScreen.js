import React, { useState, useEffect , useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import api from '../../api/axios';

const PharmacyScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Send to Pharmacist Modal
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [pharmacists, setPharmacists] = useState([]);
  const [selectedPharmacist, setSelectedPharmacist] = useState(null);
  const [modalSearch, setModalSearch] = useState('');

  // Reply to Pharmacist Modal
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  // Chat History Toggle
  const [expandedChats, setExpandedChats] = useState({});
  const [activeFilter, setActiveFilter] = useState('ALL');

  const toggleChat = (orderId) => {
    setExpandedChats(prev => ({...prev, [orderId]: !prev[orderId]}));
  };

  const styles = getStyles(colors);

  useFocusEffect(
    useCallback(() => {
      fetchPrescriptions();
      fetchPharmacists();
    }, [])
  );

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
    setSendModalVisible(true);
    try {
      const response = await api.get('/patient/pharmacists');
      setPharmacists(response.data.vendors || response.data.pharmacists || []);
    } catch (error) {
      console.log('Failed to load vendors');
    }
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
      Alert.alert('Success', 'Prescription sent! They will process your order.');
      setSendModalVisible(false);
      setSelectedPharmacist(null);
      fetchPrescriptions();
    } catch (error) {
      Alert.alert('Error', 'Failed to send prescription');
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

  const renderPrescription = ({ item }) => (
    <View style={styles.prescCard}>
      <View style={styles.prescHeader}>
        <Text style={styles.drName}>Dr. {item.professional?.user?.fullName || 'Unknown'}</Text>
        <Text style={styles.prescDate}>{new Date(item.issuedAt).toLocaleDateString()}</Text>
      </View>
      <Text style={styles.prescNotes}>Notes: {item.notes}</Text>
      
      {item.items && item.items.length > 0 && (
        <View style={styles.medsContainer}>
          <Text style={styles.medsTitle}>Medicines:</Text>
          {item.items.map(med => (
            <View key={med.id} style={styles.medRow}>
              <View style={styles.medDot} />
              <Text style={styles.medText}>{med.medicineName} - {med.dosage} ({med.duration})</Text>
            </View>
          ))}
        </View>
      )}
      
      {item.orders && item.orders.length > 0 && item.orders[0].status !== 'CANCELED' && item.orders[0].status !== 'REJECTED' ? (
        <View>
          <View style={[styles.statusBadge, { marginTop: 10, alignSelf: 'flex-start' }]}>
            <FontAwesome5 name={item.orders[0].status === 'COMPLETED' ? "check-circle" : "clock"} size={14} color={item.orders[0].status === 'COMPLETED' ? colors.success : colors.warning} style={{marginRight: 6}} />
            <Text style={[styles.statusBadgeText, { color: item.orders[0].status === 'COMPLETED' ? colors.success : colors.warning }]}>
              {item.orders[0].status === 'COMPLETED' ? 'Confirmed by Pharmacy' : 
               item.orders[0].messages && item.orders[0].messages.length > 0 ? 
                 (item.orders[0].messages[item.orders[0].messages.length - 1].sender === 'PATIENT' ? 'Reply Sent to Pharmacy' : 'Pharmacy requested info') :
               item.orders[0].patientNotes ? 'Reply Sent to Pharmacy' :
               item.orders[0].vendorNotes ? 'Pharmacy requested info' :
               'Processing Order...'}
            </Text>
          </View>
          {item.orders[0].messages && item.orders[0].messages.length > 0 ? (
            <View style={{ marginTop: 15, padding: 10, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border }}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: expandedChats[item.orders[0].id] ? 8 : 0 }}
                onPress={() => toggleChat(item.orders[0].id)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>Chat History ({item.orders[0].messages.length})</Text>
                  {item.orders[0].messages[item.orders[0].messages.length - 1].sender === 'VENDOR' && (
                    <View style={{ backgroundColor: colors.danger || '#ff4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>New</Text>
                    </View>
                  )}
                </View>
                <FontAwesome5 name={expandedChats[item.orders[0].id] ? "chevron-up" : "chevron-down"} size={14} color={colors.textLight} />
              </TouchableOpacity>
              
              {expandedChats[item.orders[0].id] && item.orders[0].messages.map(msg => (
                <View key={msg.id} style={{ 
                  marginBottom: 8, 
                  alignSelf: msg.sender === 'PATIENT' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.sender === 'PATIENT' ? colors.primary + '20' : colors.warning + '20',
                  padding: 8, 
                  borderRadius: 10,
                  maxWidth: '85%'
                }}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: msg.sender === 'PATIENT' ? colors.primary : colors.warning, marginBottom: 2 }}>
                    {msg.sender === 'PATIENT' ? 'You' : 'Pharmacist'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.text }}>{msg.text}</Text>
                  <Text style={{ fontSize: 9, color: colors.textLight, marginTop: 4, alignSelf: 'flex-end' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <>
              {item.orders[0].vendorNotes && (
                <View style={{ backgroundColor: colors.warning + '20', padding: 10, borderRadius: SIZES.radius, marginTop: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.warning, marginBottom: 4 }}>Message from Pharmacist:</Text>
                  <Text style={{ fontSize: 13, color: colors.text }}>{item.orders[0].vendorNotes}</Text>
                </View>
              )}
              {item.orders[0].patientNotes && (
                <View style={{ backgroundColor: colors.primary + '20', padding: 10, borderRadius: SIZES.radius, marginTop: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary, marginBottom: 4 }}>Your Reply:</Text>
                  <Text style={{ fontSize: 13, color: colors.text }}>{item.orders[0].patientNotes}</Text>
                </View>
              )}
            </>
          )}
          {item.orders[0].status === 'PENDING' && (
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                {item.orders[0].vendorNotes && (
                   <TouchableOpacity 
                      style={{ flex: 1, marginTop: 10, padding: 8, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 1, borderColor: colors.primary }}
                      onPress={() => {
                         setSelectedPrescription(item);
                         setReplyText('');
                         setReplyModalVisible(true);
                      }}
                   >
                      <Text style={{ color: colors.primary, fontWeight: 'bold' }}>
                         {item.orders[0].patientNotes ? 'Edit Reply' : 'Reply to Pharmacist'}
                      </Text>
                   </TouchableOpacity>
                )}
                <TouchableOpacity 
                   style={{ flex: item.orders[0].vendorNotes ? 1 : undefined, marginTop: 10, padding: 8, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 1, borderColor: colors.danger, alignSelf: item.orders[0].vendorNotes ? 'auto' : 'flex-end', width: item.orders[0].vendorNotes ? 'auto' : '100%' }}
                   onPress={() => handleCancelOrder(item.id)}
                >
                   <Text style={{ color: colors.danger, fontWeight: 'bold' }}>Cancel Order</Text>
                </TouchableOpacity>
             </View>
          )}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          {item.status !== 'BIN' && (
            <TouchableOpacity style={[styles.sendBtn, { flex: 1 }]} onPress={() => handleOpenSend(item)}>
              <FontAwesome5 name="paper-plane" size={14} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.sendBtnText}>Send to Pharmacy</Text>
            </TouchableOpacity>
          )}
          {item.status === 'BIN' ? (
            <>
              <TouchableOpacity 
                style={{ flex: 1, marginTop: 12, padding: 12, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 1, borderColor: colors.primary }}
                onPress={() => handleUpdatePrescriptionStatus(item.id, 'ACTIVE')}
              >
                <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Restore</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ flex: 1, marginTop: 12, padding: 12, backgroundColor: colors.danger, borderRadius: SIZES.radius, alignItems: 'center' }}
                onPress={() => handleUpdatePrescriptionStatus(item.id, 'DELETED')}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete Forever</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={{ marginTop: 12, padding: 12, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 1, borderColor: colors.danger }}
              onPress={() => handleUpdatePrescriptionStatus(item.id, 'BIN')}
            >
              <FontAwesome5 name="trash" size={14} color={colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Prescriptions & Orders</Text>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textLight} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search medicines or equipment..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {!route?.params?.hidePrescriptions && (
        <>
          <Text style={styles.sectionTitle}>My Digital Prescriptions</Text>
      
      <View style={{ flexDirection: 'row', marginBottom: 15, paddingHorizontal: 5, gap: 10 }}>
        {['ALL', 'PENDING', 'COMPLETED', 'AVAILABLE'].map(filter => (
          <TouchableOpacity 
            key={filter}
            style={{ 
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, 
              backgroundColor: activeFilter === filter ? colors.primary : colors.surfaceLight,
              borderWidth: 1, borderColor: activeFilter === filter ? colors.primary : colors.border
            }}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={{ 
              fontSize: 12, fontWeight: 'bold', 
              color: activeFilter === filter ? '#fff' : colors.textLight 
            }}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : prescriptions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>You have no active prescriptions.</Text>
        </View>
      ) : (
        <FlatList
          data={prescriptions.filter(p => {
            const matchesSearch = p.professional?.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
                                  p.items?.some(med => med.medicineName.toLowerCase().includes(search.toLowerCase()));
            if (!matchesSearch) return false;
            
            if (activeFilter === 'ALL') return true;
            
            const hasOrder = p.orders && p.orders.length > 0;
            const latestStatus = hasOrder ? p.orders[0].status : null;
            
            if (activeFilter === 'PENDING') return latestStatus === 'PENDING' || latestStatus === 'PROCESSING';
            if (activeFilter === 'COMPLETED') return latestStatus === 'COMPLETED';
            if (activeFilter === 'AVAILABLE') return !hasOrder || latestStatus === 'CANCELED' || latestStatus === 'REJECTED';
            
            return true;
          })}
          keyExtractor={(item) => item.id}
          renderItem={renderPrescription}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No prescriptions match this filter.</Text>
            </View>
          }
        />
      )}
      </>
      )}

   
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Available Pharmacies</Text>
      {pharmacists.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No pharmacies available.</Text>
        </View>
      ) : (
        <ScrollView style={{ marginBottom: 20 }}>
          {pharmacists.filter(pharma => 
            (pharma.businessName || pharma.user?.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
            (pharma.address || '').toLowerCase().includes(search.toLowerCase())
          ).map((pharma) => (
            <TouchableOpacity 
              key={pharma.id}
              style={styles.pharmaCard}
              onPress={() => navigation.navigate('PharmacyShopScreen', { pharmacyId: pharma.id, pharmacyName: pharma.businessName || pharma.user?.fullName })}
            >
              <Text style={styles.pharmaName}>{pharma.businessName || pharma.user?.fullName}</Text>
              <Text style={styles.pharmaRole}>Pharmacy</Text>
              <Text style={styles.pharmaAddress}>{pharma.address || 'Location unavailable'}</Text>
              {pharma.user?.phone && (
                <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                  <Ionicons name="call" size={12} color={colors.textLight} />
                  <Text style={{fontSize: 12, color: colors.textLight, marginLeft: 6}}>{pharma.user.phone}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Send to Pharmacy Modal */}
      <Modal visible={sendModalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Prescription</Text>
            <Text style={styles.label}>Select a nearby pharmacy to fulfill this prescription:</Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, paddingHorizontal: 12, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, marginTop: 10, height: 45 }}>
              <Ionicons name="search" size={18} color={colors.textLight} />
              <TextInput
                style={{ flex: 1, marginLeft: 8, fontSize: 14, color: colors.text }}
                placeholder="Search by pharmacy name or town..."
                placeholderTextColor={colors.textLight}
                value={modalSearch}
                onChangeText={setModalSearch}
              />
            </View>
            
            <ScrollView style={{ maxHeight: 200, marginVertical: 15 }}>
              {pharmacists.length === 0 ? (
                <Text style={styles.emptyText}>No pharmacies available</Text>
              ) : (
                pharmacists.filter(pharma => 
                  (pharma.businessName || pharma.user?.fullName || '').toLowerCase().includes(modalSearch.toLowerCase()) ||
                  (pharma.address || '').toLowerCase().includes(modalSearch.toLowerCase())
                ).map((pharma) => (
                  <TouchableOpacity 
                    key={pharma.id}
                    style={[styles.pharmaCard, selectedPharmacist?.id === pharma.id && {borderColor: colors.primary, borderWidth: 2}]}
                    onPress={() => setSelectedPharmacist(pharma)}
                  >
                    <Text style={styles.pharmaName}>{pharma.businessName || pharma.user?.fullName}</Text>
                    <Text style={styles.pharmaRole}>Pharmacy</Text>
                    <Text style={styles.pharmaAddress}>{pharma.address || 'Location unavailable'}</Text>
                    {pharma.user?.phone && (
                      <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 4}}>
                        <Ionicons name="call" size={12} color={colors.textLight} />
                        <Text style={{fontSize: 12, color: colors.textLight, marginLeft: 6}}>{pharma.user.phone}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSendModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, !selectedPharmacist && {opacity: 0.5}]} onPress={handleSendToPharmacy} disabled={!selectedPharmacist}>
                <Text style={styles.submitText}>Send Order</Text>
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
              placeholder="Type your reply here..."
              placeholderTextColor={colors.textLight}
              multiline
              value={replyText}
              onChangeText={setReplyText}
            />

            <TouchableOpacity 
              style={{ backgroundColor: colors.primary, padding: 15, borderRadius: SIZES.radius, alignItems: 'center', marginTop: 15, marginBottom: 20 }}
              onPress={handleSendReply}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Send Reply</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: SIZES.padding, paddingTop: 50 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 16, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: colors.border, marginBottom: 20, height: 50 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 16, color: colors.text },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  
  prescCard: { backgroundColor: colors.surfaceLight, padding: 16, borderRadius: SIZES.radius, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  prescHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  drName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  prescDate: { fontSize: 14, color: colors.textLight },
  prescNotes: { fontSize: 14, color: colors.text, fontStyle: 'italic', marginBottom: 10 },
  medsContainer: { backgroundColor: colors.roles.PATIENT.bgTint, padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.roles.PATIENT.accent },
  medsTitle: { fontSize: 13, fontWeight: 'bold', color: colors.roles.PATIENT.textTint, marginBottom: 6 },
  medRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  medDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 8 },
  medText: { fontSize: 13, color: colors.text },
  sendBtn: { flexDirection: 'row', backgroundColor: colors.secondary, padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sendBtnText: { color: '#fff', fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', backgroundColor: colors.primary + '15', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '40' },
  statusBadgeText: { color: colors.primary, fontWeight: 'bold', fontSize: 14 },
  
  emptyState: { padding: 20, alignItems: 'center', backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, marginBottom: 16 },
  emptyText: { color: colors.textLight, fontStyle: 'italic' },
  
  uploadPrescription: { flexDirection: 'row', backgroundColor: colors.roles.PATIENT.bgTint, padding: 16, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.roles.PATIENT.accent, alignItems: 'center' },
  uploadTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  uploadSub: { fontSize: 12, color: colors.textLight },
  uploadBtn: { flexDirection: 'row', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: SIZES.radius, alignItems: 'center', marginLeft: 12 },
  uploadBtnText: { color: '#ffffff', fontWeight: 'bold' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: SIZES.radiusLg, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  label: { fontSize: 14, color: colors.textLight },
  pharmaCard: { backgroundColor: colors.surfaceLight, padding: 16, borderRadius: SIZES.radius, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  pharmaName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  pharmaRole: { fontSize: 13, fontWeight: '600', color: colors.primary, marginTop: 2 },
  pharmaAddress: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 15 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { color: colors.textLight, fontWeight: 'bold' },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: SIZES.radius },
  submitText: { color: '#fff', fontWeight: 'bold' }
});

export default PharmacyScreen;
