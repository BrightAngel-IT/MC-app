import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, RefreshControl, Image, ActivityIndicator, Platform } from 'react-native';
import { AuthContext } from '../../context/authContext';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const VendorOrdersScreen = ({ route, navigation }) => {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  
  const [prescriptionOrders, setPrescriptionOrders] = useState([]);
  const [regularOrders, setRegularOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('PRESCRIPTIONS'); 
  const [activeStatus, setActiveStatus] = useState('TOTAL'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const styles = getStyles(colors);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [vendorNotes, setVendorNotes] = useState('');
  const [chatExpanded, setChatExpanded] = useState(true);

  // Pharmacist Actions State
  const [billAmount, setBillAmount] = useState('');
  const [billImage, setBillImage] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionTab, setActionTab] = useState('ACCEPT'); // 'ACCEPT', 'REJECT', 'NOTES'

  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
    if (route.params?.initialStatus) setActiveStatus(route.params.initialStatus);
  }, [route.params?.initialTab, route.params?.initialStatus]);

  useEffect(() => {
    if (route.params?.orderId) {
      const order = prescriptionOrders.find(o => o.id === route.params.orderId) || regularOrders.find(o => o.id === route.params.orderId);
      if (order) {
        openOrderDetails(order);
      }
    }
  }, [route.params?.orderId, prescriptionOrders.length, regularOrders.length]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/vendor/dashboard?filter=all');
      setPrescriptionOrders(response.data.prescriptionOrders || []);
      setRegularOrders(response.data.regularOrders || []);
    } catch (error) {
      console.log('Failed to fetch orders');
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, []);

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setVendorNotes('');
    setBillAmount(order.totalAmount && order.totalAmount > 0 ? String(order.totalAmount) : '');
    setBillImage(null);
    setRejectionReason('');
    setActionTab(order.prescription ? 'ACCEPT' : 'ACCEPT');
    setOrderModalVisible(true);
  };

  const pickBillImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]?.base64) {
        setBillImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleAcceptWithBill = async () => {
    const amountVal = parseFloat(billAmount);
    if (!billAmount || isNaN(amountVal) || amountVal <= 0) {
      showAlert('Bill Amount Required', 'Please enter a valid total medicine bill amount (Rs.) before accepting.');
      return;
    }

    if (!billImage) {
      showAlert('Bill Image Required', 'Please upload or capture a photo of the medicine bill/invoice before accepting this order.');
      return;
    }

    try {
      setActionLoading(true);
      await api.put(`/vendor/orders/${selectedOrder.id}`, {
        status: 'ACCEPTED',
        totalAmount: amountVal,
        billImage: billImage,
        vendorNotes: vendorNotes.trim() ? vendorNotes : undefined
      });
      showAlert('Prescription Accepted', 'Order accepted successfully and medicine bill sent to patient!');
      setOrderModalVisible(false);
      fetchOrders();
    } catch (error) {
      showAlert('Error', error.response?.data?.message || 'Failed to accept prescription order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!rejectionReason.trim()) {
      if (Platform.OS === 'web') {
        window.alert('Rejection Reason Required: Please provide a clear reason for declining (e.g. Out of stock, expired, or unavailable).');
      } else {
        Alert.alert('Rejection Reason Required', 'Please provide a clear reason for declining (e.g. Out of stock, expired, or unavailable).');
      }
      return;
    }

    const executeReject = async () => {
      try {
        setActionLoading(true);
        await api.put(`/vendor/orders/${selectedOrder.id}`, {
          status: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
          vendorNotes: vendorNotes.trim() ? vendorNotes : undefined
        });
        if (Platform.OS === 'web') {
          window.alert('Prescription Declined: Order rejected. Patient has been notified.');
        } else {
          Alert.alert('Prescription Declined', 'Order rejected. Patient has been notified.');
        }
        setOrderModalVisible(false);
        fetchOrders();
      } catch (error) {
        const msg = error.response?.data?.message || 'Failed to reject order';
        if (Platform.OS === 'web') {
          window.alert('Error: ' + msg);
        } else {
          Alert.alert('Error', msg);
        }
      } finally {
        setActionLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to reject this prescription order? The patient will be notified and can send it to another nearby pharmacy.');
      if (confirmed) {
        executeReject();
      }
    } else {
      Alert.alert(
        'Decline Prescription',
        'Are you sure you want to reject this prescription order? The patient will be notified and can send it to another nearby pharmacy.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Decline',
            style: 'destructive',
            onPress: executeReject
          }
        ]
      );
    }
  };

  const handleSendNotesOnly = async () => {
    if (!vendorNotes.trim()) {
      Alert.alert('Empty Message', 'Please enter a message to send to the patient.');
      return;
    }
    try {
      setActionLoading(true);
      await api.put(`/vendor/orders/${selectedOrder.id}`, {
        status: 'PENDING',
        vendorNotes: vendorNotes.trim(),
        clearPatientNotes: true
      });
      Alert.alert('Success', 'Message sent to patient!');
      setVendorNotes('');
      fetchOrders();
    } catch (error) {
      Alert.alert('Error', 'Failed to send note');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteOrder = async () => {
    try {
      setActionLoading(true);
      await api.put(`/vendor/orders/${selectedOrder.id}`, {
        status: 'COMPLETED',
        vendorNotes: vendorNotes.trim() ? vendorNotes : undefined
      });
      Alert.alert('Success', 'Order marked as Completed / Dispatched!');
      setOrderModalVisible(false);
      fetchOrders();
    } catch (error) {
      Alert.alert('Error', 'Failed to complete order');
    } finally {
      setActionLoading(false);
    }
  };

  const listSource = activeTab === 'PRESCRIPTIONS' ? prescriptionOrders : regularOrders;
  const filteredList = listSource.filter(o => {
    const matchesSearch = o.patient?.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          o.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeStatus === 'TOTAL') return true;
    if (activeStatus === 'PENDING') return o.status === 'PENDING' || o.status === 'PROCESSING';
    return o.status === activeStatus;
  });

  const renderOrderItem = (order) => {
    let activityText = 'Order Received';
    if (order.status === 'ACCEPTED') activityText = 'Prescription Accepted';
    if (order.status === 'COMPLETED') activityText = 'Order Completed';
    if (order.status === 'CANCELED') activityText = 'Order Canceled';
    if (order.status === 'REJECTED') activityText = 'Order Rejected';
    
    return (
      <TouchableOpacity 
        key={order.id} 
        style={styles.recentItem} 
        activeOpacity={0.7}
        onPress={() => openOrderDetails(order)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="pill" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.recentTitle}>{activityText}</Text>
            <Text style={styles.recentSub} numberOfLines={1}>Order #{order.id.slice(0,6)} • {order.patient?.user?.fullName}</Text>
            <Text style={styles.recentDate}>{new Date(order.updatedAt || order.createdAt).toLocaleString()}</Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge, 
          order.status === 'PENDING' || order.status === 'PROCESSING' ? styles.bgWarning : 
          (order.status === 'COMPLETED' || order.status === 'ACCEPTED' ? styles.bgSuccess : styles.bgDanger)
        ]}>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Management</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Patient Name or Order ID..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'PRESCRIPTIONS' && styles.activeTab]}
          onPress={() => { setActiveTab('PRESCRIPTIONS'); setActiveStatus('TOTAL'); }}
        >
          <Text style={[styles.tabText, activeTab === 'PRESCRIPTIONS' && styles.activeTabText]}>Prescriptions</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'ORDERS' && styles.activeTab]}
          onPress={() => { setActiveTab('ORDERS'); setActiveStatus('TOTAL'); }}
        >
          <Text style={[styles.tabText, activeTab === 'ORDERS' && styles.activeTabText]}>Normal Orders</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: SIZES.padding, paddingBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {['TOTAL', 'PENDING', 'ACCEPTED', 'COMPLETED', 'REJECTED'].map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusFilterBtn, activeStatus === status && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setActiveStatus(status)}
            >
              <Text style={[styles.statusFilterText, activeStatus === status && { color: '#fff' }]}>
                {status === 'TOTAL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingHorizontal: SIZES.padding, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {filteredList.length === 0 ? (
          <Text style={{ textAlign: 'center', color: colors.textLight, marginTop: 40, fontStyle: 'italic' }}>No orders found.</Text>
        ) : (
          filteredList.map(renderOrderItem)
        )}
      </ScrollView>

      {/* Order Modal */}
      <Modal visible={orderModalVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
          <View style={{ backgroundColor: colors.background, borderRadius: SIZES.radiusLg, padding: 20, width: '100%', maxHeight: '90%' }}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                  {selectedOrder?.prescription ? 'Prescription Order' : 'Order Details'}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textLight }}>Order #{selectedOrder?.id?.slice(0,8)}</Text>
              </View>
              <TouchableOpacity onPress={() => setOrderModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Patient Info */}
              <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: SIZES.radius, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.primary }}>
                  Patient: {selectedOrder?.patient?.user?.fullName}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textLight, marginTop: 2 }}>
                  Phone: {selectedOrder?.patient?.user?.phone || 'Not provided'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <Text style={{ fontSize: 12, color: colors.textLight, marginRight: 6 }}>Status: </Text>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: (selectedOrder?.status === 'ACCEPTED' || selectedOrder?.status === 'COMPLETED') ? colors.success + '20' : (selectedOrder?.status === 'REJECTED' || selectedOrder?.status === 'CANCELED' ? colors.danger + '20' : colors.warning + '20')
                  }}>
                    <Text style={{ 
                      fontSize: 11, 
                      fontWeight: 'bold', 
                      color: (selectedOrder?.status === 'ACCEPTED' || selectedOrder?.status === 'COMPLETED') ? colors.success : (selectedOrder?.status === 'REJECTED' || selectedOrder?.status === 'CANCELED' ? colors.danger : colors.warning) 
                    }}>
                      {selectedOrder?.status}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Status Notice Banner (Accepted / Rejected / Completed) */}
              {selectedOrder?.status === 'ACCEPTED' && (
                <View style={{ backgroundColor: colors.success + '15', borderWidth: 1, borderColor: colors.success + '40', borderRadius: SIZES.radius, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.success }}>Prescription Accepted</Text>
                    <Text style={{ fontSize: 12, color: colors.text, marginTop: 2 }}>Medicine bill and confirmation sent to the patient.</Text>
                  </View>
                </View>
              )}

              {selectedOrder?.status === 'REJECTED' && (
                <View style={{ backgroundColor: colors.danger + '15', borderWidth: 1, borderColor: colors.danger + '40', borderRadius: SIZES.radius, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="close-circle" size={24} color={colors.danger} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.danger }}>Prescription Rejected</Text>
                    <Text style={{ fontSize: 12, color: colors.text, marginTop: 2 }}>This prescription order has been declined. Patient has been notified.</Text>
                  </View>
                </View>
              )}

              {selectedOrder?.status === 'COMPLETED' && (
                <View style={{ backgroundColor: colors.success + '15', borderWidth: 1, borderColor: colors.success + '40', borderRadius: SIZES.radius, padding: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="shield-checkmark" size={24} color={colors.success} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.success }}>Order Completed</Text>
                    <Text style={{ fontSize: 12, color: colors.text, marginTop: 2 }}>This order has been fulfilled successfully.</Text>
                  </View>
                </View>
              )}

              {/* Prescription Details */}
              {selectedOrder?.prescription ? (
                <View style={{ backgroundColor: colors.surfaceLight, padding: 15, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, marginBottom: 15 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <MaterialCommunityIcons name="doctor" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>
                      Issued by Dr. {selectedOrder.prescription?.professional?.user?.fullName || 'Assigned Doctor'}
                    </Text>
                  </View>
                  {selectedOrder.prescription?.notes && (
                    <Text style={{ fontSize: 13, color: colors.text, fontStyle: 'italic', marginBottom: 8, paddingLeft: 4 }}>
                      Notes: "{selectedOrder.prescription.notes}"
                    </Text>
                  )}
                  {Array.isArray(selectedOrder.prescription?.items) && selectedOrder.prescription.items.length > 0 && (
                    <View style={{ marginTop: 6, backgroundColor: colors.surface, padding: 10, borderRadius: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.textMuted, marginBottom: 6 }}>Prescribed Medicines:</Text>
                      {selectedOrder.prescription.items.map((item, idx) => (
                        <View key={item?.id || idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 8 }} />
                          <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>
                            <Text style={{ fontWeight: 'bold' }}>{item.medicineName}</Text> ({item.dosage}) — <Text style={{ color: colors.textLight }}>{item.duration}</Text>
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ backgroundColor: colors.warning + '20', padding: 12, borderRadius: SIZES.radius, marginBottom: 15 }}>
                  <Text style={{ color: colors.warning, marginBottom: selectedOrder?.items?.length > 0 ? 8 : 0, fontSize: 13 }}>No doctor prescription attached to this order.</Text>
                  {Array.isArray(selectedOrder?.items) && selectedOrder.items.length > 0 && (
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.warning + '40', paddingTop: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.warning, marginBottom: 5 }}>Products Ordered:</Text>
                      {selectedOrder.items.map(item => (
                        <View key={item?.id || Math.random()} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, color: colors.text }}>{item?.product?.name} x{item?.quantity}</Text>
                          <Text style={{ fontSize: 13, color: colors.text, fontWeight: 'bold' }}>Rs. {((item?.priceAtPurchase || 0) * (item?.quantity || 0)).toFixed(2)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Already Uploaded Bill or Existing Rejection Details */}
              {selectedOrder?.billImageUrl && (
                <View style={{ backgroundColor: colors.success + '15', padding: 12, borderRadius: SIZES.radius, marginBottom: 15, borderWidth: 1, borderColor: colors.success + '40' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.success, marginBottom: 6 }}>
                    Uploaded Medicine Bill (Rs. {(selectedOrder.totalAmount || 0).toFixed(2)})
                  </Text>
                  <Image 
                    source={{ 
                      uri: (() => {
                        const url = selectedOrder.billImageUrl;
                        if (!url) return null;
                        const apiBase = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'https://mcbackend.crescereluna.com';
                        if (url.startsWith('/uploads')) return `${apiBase}${url}`;
                        if (url.includes('localhost:5000') || url.includes('127.0.0.1:5000')) {
                          const isLocalHost = Platform.OS === 'web' && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                          if (!isLocalHost) return url.replace(/^http:\/\/(localhost|127\.0\.0\.1):5000/, apiBase);
                        }
                        return url;
                      })() 
                    }} 
                    style={{ width: '100%', height: 160, borderRadius: 8, resizeMode: 'cover' }} 
                  />
                </View>
              )}

              {selectedOrder?.rejectionReason && (
                <View style={{ backgroundColor: colors.danger + '15', padding: 12, borderRadius: SIZES.radius, marginBottom: 15, borderWidth: 1, borderColor: colors.danger + '40' }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.danger, marginBottom: 4 }}>
                    Rejection Reason Given:
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.text }}>{selectedOrder.rejectionReason}</Text>
                </View>
              )}

              {/* Chat History */}
              {Array.isArray(selectedOrder?.messages) && selectedOrder.messages.length > 0 && (
                <View style={{ marginBottom: 15 }}>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: chatExpanded ? 8 : 0 }}
                    onPress={() => setChatExpanded(!chatExpanded)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text }}>Conversation History ({selectedOrder.messages.length})</Text>
                    </View>
                    <Ionicons name={chatExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.textLight} />
                  </TouchableOpacity>
                  
                  {chatExpanded && (
                    <View style={{ backgroundColor: colors.surfaceLight, padding: 10, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border }}>
                      {selectedOrder.messages.map(msg => (
                        <View key={msg?.id || Math.random()} style={{ 
                          marginBottom: 8, 
                          alignSelf: msg.sender === 'VENDOR' ? 'flex-end' : 'flex-start',
                          backgroundColor: msg.sender === 'VENDOR' ? colors.primary + '20' : colors.surface,
                          padding: 8, 
                          borderRadius: 10,
                          maxWidth: '85%',
                          borderWidth: msg.sender === 'VENDOR' ? 0 : 1,
                          borderColor: colors.border
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: msg.sender === 'VENDOR' ? colors.primary : colors.textMuted, marginBottom: 2 }}>
                            {msg.sender === 'VENDOR' ? 'You' : 'Patient'}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.text }}>{msg.text}</Text>
                          <Text style={{ fontSize: 9, color: colors.textLight, marginTop: 2, alignSelf: 'flex-end' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Action Form if order is not completed/rejected/canceled */}
              {selectedOrder?.status !== 'COMPLETED' && selectedOrder?.status !== 'CANCELED' && selectedOrder?.status !== 'REJECTED' && (
                <View style={{ marginTop: 5, padding: 12, backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border }}>
                  
                  {/* Action Mode Toggle */}
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                    <TouchableOpacity 
                      style={[styles.actionTabBtn, actionTab === 'ACCEPT' && { backgroundColor: colors.success, borderColor: colors.success }]}
                      onPress={() => setActionTab('ACCEPT')}
                    >
                      <Ionicons name="checkmark-circle-outline" size={14} color={actionTab === 'ACCEPT' ? '#fff' : colors.text} style={{ marginRight: 4 }} />
                      <Text style={[styles.actionTabText, actionTab === 'ACCEPT' && { color: '#fff' }]}>Accept & Bill</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionTabBtn, actionTab === 'REJECT' && { backgroundColor: colors.danger, borderColor: colors.danger }]}
                      onPress={() => setActionTab('REJECT')}
                    >
                      <Ionicons name="close-circle-outline" size={14} color={actionTab === 'REJECT' ? '#fff' : colors.text} style={{ marginRight: 4 }} />
                      <Text style={[styles.actionTabText, actionTab === 'REJECT' && { color: '#fff' }]}>Reject Order</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.actionTabBtn, actionTab === 'NOTES' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => setActionTab('NOTES')}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color={actionTab === 'NOTES' ? '#fff' : colors.text} style={{ marginRight: 4 }} />
                      <Text style={[styles.actionTabText, actionTab === 'NOTES' && { color: '#fff' }]}>Send Note</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Accept Tab Content */}
                  {actionTab === 'ACCEPT' && (
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                        Medicine Bill Amount (Rs.) *
                      </Text>
                      <TextInput
                        style={styles.actionInput}
                        placeholder="e.g. 1450.00"
                        placeholderTextColor={colors.textLight}
                        keyboardType="numeric"
                        value={billAmount}
                        onChangeText={setBillAmount}
                      />

                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 6, marginTop: 4 }}>
                        Attach Medicine Bill / Invoice Image *
                      </Text>
                      {billImage ? (
                        <View style={{ marginBottom: 10, position: 'relative' }}>
                          <Image source={{ uri: billImage }} style={{ width: '100%', height: 140, borderRadius: 8 }} />
                          <TouchableOpacity 
                            style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 20 }}
                            onPress={() => setBillImage(null)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity style={styles.imagePickerBtn} onPress={pickBillImage}>
                          <Ionicons name="camera-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                          <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>Upload Bill Image</Text>
                        </TouchableOpacity>
                      )}

                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 4, marginTop: 6 }}>
                        Message to Patient (Optional)
                      </Text>
                      <TextInput
                        style={[styles.actionInput, { minHeight: 60 }]}
                        placeholder="e.g. Medicines ready for pickup / delivery"
                        placeholderTextColor={colors.textLight}
                        multiline
                        value={vendorNotes}
                        onChangeText={setVendorNotes}
                      />

                      <TouchableOpacity 
                        style={[styles.mainActionBtn, { backgroundColor: colors.success }]}
                        onPress={handleAcceptWithBill}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.mainActionBtnText}>Accept & Send Bill to Patient</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Reject Tab Content */}
                  {actionTab === 'REJECT' && (
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.danger, marginBottom: 4 }}>
                        Reason for Rejection *
                      </Text>
                      <TextInput
                        style={[styles.actionInput, { minHeight: 70 }]}
                        placeholder="e.g. Prescribed medicines are currently out of stock."
                        placeholderTextColor={colors.textLight}
                        multiline
                        value={rejectionReason}
                        onChangeText={setRejectionReason}
                      />
                      <Text style={{ fontSize: 11, color: colors.textLight, marginBottom: 10, fontStyle: 'italic' }}>
                        The patient will be immediately notified and given the option to send this prescription to another nearby pharmacy.
                      </Text>

                      <TouchableOpacity 
                        style={[styles.mainActionBtn, { backgroundColor: colors.danger }]}
                        onPress={handleRejectOrder}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.mainActionBtnText}>Reject Prescription Order</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Notes Tab Content */}
                  {actionTab === 'NOTES' && (
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                        Message / Query to Patient *
                      </Text>
                      <TextInput
                        style={[styles.actionInput, { minHeight: 70 }]}
                        placeholder="e.g. We have Paracetamol instead of Panadol, is that acceptable?"
                        placeholderTextColor={colors.textLight}
                        multiline
                        value={vendorNotes}
                        onChangeText={setVendorNotes}
                      />

                      <TouchableOpacity 
                        style={[styles.mainActionBtn, { backgroundColor: colors.primary }]}
                        onPress={handleSendNotesOnly}
                        disabled={actionLoading}
                      >
                        {actionLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.mainActionBtnText}>Send Message to Patient</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                </View>
              )}

              {/* Order completion option if accepted */}
              {selectedOrder?.status === 'ACCEPTED' && (
                <TouchableOpacity 
                  style={[styles.mainActionBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
                  onPress={handleCompleteOrder}
                  disabled={actionLoading}
                >
                  <Text style={styles.mainActionBtnText}>Mark Order as Fully Completed</Text>
                </TouchableOpacity>
              )}

            </ScrollView>

            <TouchableOpacity 
              style={{ marginTop: 12, paddingVertical: 10, alignItems: 'center' }}
              onPress={() => setOrderModalVisible(false)}
            >
              <Text style={{ color: colors.textLight, fontWeight: 'bold' }}>Close Window</Text>
            </TouchableOpacity>

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
  },
  header: {
    padding: SIZES.padding,
    paddingTop: 60,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: SIZES.radius,
    paddingHorizontal: 15,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.padding,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 10
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 16,
    color: colors.textLight,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  statusFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusFilterText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  recentSub: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  recentDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  bgWarning: { backgroundColor: colors.warning },
  bgSuccess: { backgroundColor: colors.success },
  bgDanger: { backgroundColor: colors.danger },

  actionTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  actionTabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text,
  },
  actionInput: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radius,
    padding: 10,
    color: colors.text,
    marginBottom: 10,
  },
  imagePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: colors.primary + '10',
    marginBottom: 10,
  },
  mainActionBtn: {
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  mainActionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default VendorOrdersScreen;
