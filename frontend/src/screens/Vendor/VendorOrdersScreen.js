import React, { useContext, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, RefreshControl } from 'react-native';
import { AuthContext } from '../../context/authContext';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

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

  useEffect(() => {
    if (route.params?.initialTab) setActiveTab(route.params.initialTab);
    if (route.params?.initialStatus) setActiveStatus(route.params.initialStatus);
  }, [route.params?.initialTab, route.params?.initialStatus]);

  useEffect(() => {
    if (route.params?.orderId) {
      const order = prescriptionOrders.find(o => o.id === route.params.orderId) || regularOrders.find(o => o.id === route.params.orderId);
      if (order) {
        setSelectedOrder(order);
        setOrderModalVisible(true);
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

  const handleUpdateOrder = async (status) => {
    try {
      await api.put(`/vendor/orders/${selectedOrder.id}`, {
        status,
        vendorNotes,
        clearPatientNotes: status === 'PENDING' ? true : false
      });
      Alert.alert('Success', status === 'COMPLETED' ? 'Order Confirmed!' : 'Notes sent!');
      if (status === 'COMPLETED' || status === 'REJECTED') {
        setOrderModalVisible(false);
      } else {
        setVendorNotes(''); // clear the input so they can type the next message
      }
      fetchOrders();
    } catch (error) {
      Alert.alert('Error', 'Failed to update order');
    }
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setVendorNotes('');
    setOrderModalVisible(true);
  };

  const listSource = activeTab === 'PRESCRIPTIONS' ? prescriptionOrders : regularOrders;
  
  const filteredList = listSource.filter(o => {
    const matchesSearch = o.patient?.user?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          o.id?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeStatus === 'TOTAL') return true;
    if (activeStatus === 'REJECTED') return o.status === 'REJECTED' || o.status === 'CANCELED';
    if (activeStatus === 'PENDING') return o.status === 'PENDING' || o.status === 'PROCESSING';
    return o.status === activeStatus;
  });

  const renderOrderItem = (order) => {
    let activityText = 'Order Received';
    if(order.status === 'COMPLETED') activityText = 'Order Completed';
    if(order.status === 'CANCELED') activityText = 'Order Canceled';
    if(order.status === 'REJECTED') activityText = 'Order Rejected';
    
    return (
      <TouchableOpacity 
        key={order.id} 
        style={styles.recentItem} 
        activeOpacity={0.7}
        onPress={() => openOrderDetails(order)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="pill" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.recentTitle}>{activityText}</Text>
            <Text style={styles.recentSub}>Order #{order.id.slice(0,6)} • {order.patient?.user?.fullName}</Text>
            <Text style={styles.recentDate}>{new Date(order.updatedAt || order.createdAt).toLocaleString()}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, order.status === 'PENDING' || order.status === 'PROCESSING' ? styles.bgWarning : (order.status === 'COMPLETED' ? styles.bgSuccess : styles.bgDanger)]}>
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
          {['TOTAL', 'PENDING', 'COMPLETED', 'REJECTED'].map((status) => (
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

      <Modal visible={orderModalVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: colors.background, borderRadius: SIZES.radiusLg, padding: 20, width: '100%', maxHeight: '80%' }}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Order Details</Text>
              <TouchableOpacity onPress={() => setOrderModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 5 }}>
                Patient: {selectedOrder?.patient?.user?.fullName}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textLight, marginBottom: 5 }}>
                Phone: {selectedOrder?.patient?.user?.phone || 'Not provided'}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textLight, marginBottom: 15 }}>
                Order #{selectedOrder?.id?.slice(0,8)}
              </Text>

              {selectedOrder?.prescription ? (
                <View style={{ backgroundColor: colors.surfaceLight, padding: 15, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, marginBottom: 15 }}>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 5 }}>
                    Prescription attached from Dr. {selectedOrder.prescription?.professional?.user?.fullName}
                  </Text>
                  {selectedOrder.prescription?.notes && (
                    <Text style={{ fontSize: 13, color: colors.text, fontStyle: 'italic', marginBottom: 10 }}>
                      Notes: {selectedOrder.prescription.notes}
                    </Text>
                  )}
                  {Array.isArray(selectedOrder.prescription?.items) && selectedOrder.prescription.items.length > 0 && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.textMuted, marginBottom: 5 }}>Medicines:</Text>
                      {selectedOrder.prescription.items.map(item => (
                        <View key={item?.id || Math.random()} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
                          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginRight: 6 }} />
                          <Text style={{ fontSize: 13, color: colors.text }}>{item.medicineName} ({item.dosage}) - {item.duration}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ backgroundColor: colors.warning + '20', padding: 15, borderRadius: SIZES.radius, marginBottom: 15 }}>
                  <Text style={{ color: colors.warning, marginBottom: selectedOrder?.items?.length > 0 ? 10 : 0 }}>No prescription attached to this order.</Text>
                  
                  {Array.isArray(selectedOrder?.items) && selectedOrder.items.length > 0 && (
                    <View style={{ borderTopWidth: 1, borderTopColor: colors.warning + '40', paddingTop: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.warning, marginBottom: 5 }}>Products Ordered:</Text>
                      {selectedOrder.items.map(item => (
                        <View key={item?.id || Math.random()} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, color: colors.text }}>{item?.product?.name} x{item?.quantity}</Text>
                          <Text style={{ fontSize: 13, color: colors.text, fontWeight: 'bold' }}>Rs. {((item?.priceAtPurchase || 0) * (item?.quantity || 0)).toFixed(2)}</Text>
                        </View>
                      ))}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.warning + '40' }}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>Total Amount</Text>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.primary }}>Rs. {(selectedOrder?.totalAmount || 0).toFixed(2)}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {Array.isArray(selectedOrder?.messages) && selectedOrder.messages.length > 0 ? (
                <View style={{ marginBottom: 15 }}>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: chatExpanded ? 10 : 0 }}
                    onPress={() => setChatExpanded(!chatExpanded)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>Conversation History ({selectedOrder.messages.length})</Text>
                      {selectedOrder.messages[selectedOrder.messages.length - 1]?.sender === 'PATIENT' && (
                        <View style={{ backgroundColor: colors.danger || '#ff4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>New Message</Text>
                        </View>
                      )}
                    </View>
                    <Ionicons name={chatExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.textLight} />
                  </TouchableOpacity>
                  
                  {chatExpanded && (
                    <View style={{ backgroundColor: colors.surfaceLight, padding: 10, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border }}>
                      {selectedOrder.messages.map(msg => (
                        <View key={msg?.id || Math.random()} style={{ 
                          marginBottom: 10, 
                          alignSelf: msg.sender === 'VENDOR' ? 'flex-end' : 'flex-start',
                          backgroundColor: msg.sender === 'VENDOR' ? colors.primary + '20' : colors.surface,
                          padding: 10, 
                          borderRadius: 12,
                          maxWidth: '85%',
                          borderWidth: msg.sender === 'VENDOR' ? 0 : 1,
                          borderColor: colors.border
                        }}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: msg.sender === 'VENDOR' ? colors.primary : colors.textMuted, marginBottom: 2 }}>
                            {msg.sender === 'VENDOR' ? 'You' : 'Patient'}
                          </Text>
                          <Text style={{ fontSize: 13, color: colors.text }}>{msg.text}</Text>
                          <Text style={{ fontSize: 9, color: colors.textLight, marginTop: 4, alignSelf: 'flex-end' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : (
                <>
                  {selectedOrder?.patientNotes && (
                    <View style={{ backgroundColor: colors.primary + '20', padding: 15, borderRadius: SIZES.radius, marginBottom: 15 }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.primary, marginBottom: 4 }}>Patient's Reply:</Text>
                      <Text style={{ fontSize: 13, color: colors.text }}>{selectedOrder.patientNotes}</Text>
                    </View>
                  )}
                </>
              )}

              {selectedOrder?.status !== 'COMPLETED' && selectedOrder?.status !== 'CANCELED' && selectedOrder?.status !== 'REJECTED' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 8, marginTop: 5 }}>Your Notes / Reply</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text, minHeight: 80, textAlignVertical: 'top' }}
                    placeholder="E.g., We have Paracetamol instead of Panadol, is that okay?"
                    placeholderTextColor={colors.textLight}
                    multiline
                    value={vendorNotes}
                    onChangeText={setVendorNotes}
                  />
                </>
              )}
            </ScrollView>

            {selectedOrder?.status !== 'COMPLETED' && selectedOrder?.status !== 'CANCELED' && selectedOrder?.status !== 'REJECTED' && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.primary, padding: 12, borderRadius: SIZES.radius, alignItems: 'center', marginRight: 10 }}
                  onPress={() => handleUpdateOrder('PENDING')}
                >
                  <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Send Notes Only</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={{ flex: 1, backgroundColor: colors.success, padding: 12, borderRadius: SIZES.radius, alignItems: 'center' }}
                  onPress={() => handleUpdateOrder('COMPLETED')}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Confirm Order</Text>
                </TouchableOpacity>
              </View>
            )}
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
});

export default VendorOrdersScreen;
