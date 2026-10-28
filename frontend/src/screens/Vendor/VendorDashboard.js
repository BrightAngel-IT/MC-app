import React, { useContext, useState, useEffect , useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Switch } from 'react-native';
import { AuthContext } from '../../context/authContext';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';
import TimeFilter from '../../components/TimeFilter';
import RecentsList from '../../components/RecentsList';
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';
import NotificationBell from '../../components/NotificationBell';
import { searchLocationByName } from '../../utils/geocode';
import MapComponent from '../../components/MapComponent';
import * as Location from 'expo-location';

const VendorDashboard = ({ navigation }) => {
  const { user, logout } = useContext(AuthContext);
  const { colors } = useTheme();
  
  const [stats, setStats] = useState({ prescriptions: {}, orders: {}, total: 0 });
  const [prescriptionOrders, setPrescriptionOrders] = useState([]);
  const [regularOrders, setRegularOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('PRESCRIPTIONS'); // 'PRESCRIPTIONS' or 'ORDERS'
  const [activeStatus, setActiveStatus] = useState('TOTAL'); // 'TOTAL', 'PENDING', 'COMPLETED', 'REJECTED'

  const [timeFilter, setTimeFilter] = useState('all');
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const [serviceRadius, setServiceRadius] = useState('10');
  const [isAvailable, setIsAvailable] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingLocation(true);
    try {
      const result = await searchLocationByName(searchQuery.trim());
      if (result) {
        setSelectedRegion({
          latitude: result.latitude,
          longitude: result.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1
        });
      } else {
        Alert.alert('Location Not Found', 'Could not find the location you searched for.');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Failed to search location.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const requestLocation = async () => {
    setIsGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to set your working area.');
        setIsGettingLocation(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setSelectedRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    } catch (e) {
      console.log('Location error', e);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const updateWorkingArea = async (lat, lng) => {
    try {
      setIsUpdatingLocation(true);
      await api.put('/vendor/profile', { locationLat: lat, locationLng: lng, serviceRadius: parseInt(serviceRadius) || 10, availabilityStatus: isAvailable ? 'AVAILABLE' : 'UNAVAILABLE' });
      setLocationLat(lat);
      setLocationLng(lng);
      setMapModalVisible(false);
      Alert.alert('Success', 'Location updated successfully!');
    } catch (err) {
      console.log('Update error', err);
      Alert.alert('Error', 'Failed to update location');
    } finally {
      setIsUpdatingLocation(false);
    }
  };
  const [showApprovedBanner, setShowApprovedBanner] = useState(true);
  
  const styles = getStyles(colors);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [vendorNotes, setVendorNotes] = useState('');
  const [chatExpanded, setChatExpanded] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [timeFilter])
  );

  const fetchDashboard = async () => {
    try {
      const response = await api.get(`/vendor/dashboard?filter=${timeFilter}`);
      setStats(response.data.stats || { prescriptions: {}, orders: {}, total: 0 });
      setPrescriptionOrders(response.data.prescriptionOrders || []);
      setRegularOrders(response.data.regularOrders || []);
      if (response.data.profile) {
        if (response.data.profile.locationLat) setLocationLat(response.data.profile.locationLat);
        if (response.data.profile.locationLng) setLocationLng(response.data.profile.locationLng);
        if (response.data.profile.serviceRadius) setServiceRadius(response.data.profile.serviceRadius.toString());
        if (response.data.profile.availabilityStatus) setIsAvailable(response.data.profile.availabilityStatus === 'AVAILABLE');
      }
    } catch (error) {
      console.log('Failed to fetch vendor dashboard');
    }
  };

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
      fetchDashboard();
    } catch (error) {
      Alert.alert('Error', 'Failed to update order');
    }
  };

  const StatCard = ({ title, value, icon, color, statusTarget }) => (
    <TouchableOpacity 
      style={[styles.card, activeStatus === statusTarget && { borderColor: color, borderWidth: 2 }]} 
      activeOpacity={0.7}
      onPress={() => navigation.navigate('VendorOrders', { initialTab: activeTab, initialStatus: statusTarget })}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={32} color={color} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setVendorNotes('');
    setOrderModalVisible(true);
  };

  const renderRecentOrder = (order) => {
    let activityText = 'Order Received';
    if(order.status === 'ACCEPTED') activityText = 'Order Accepted';
    if(order.status === 'COMPLETED') activityText = 'Order Completed';
    if(order.status === 'CANCELED') activityText = 'Order Canceled';
    if(order.status === 'REJECTED') activityText = 'Order Rejected';

    const isAcceptedOrCompleted = order.status === 'ACCEPTED' || order.status === 'COMPLETED';
    const isPendingOrProcessing = order.status === 'PENDING' || order.status === 'PROCESSING';
    
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
            <Text style={styles.recentSub}>Order #{order.id.slice(0,6)} • {new Date(order.updatedAt || order.createdAt).toLocaleString()}</Text>
          </View>
        </View>
        <View style={[
          styles.statusBadge, 
          isAcceptedOrCompleted ? styles.bgSuccess : (isPendingOrProcessing ? styles.bgWarning : styles.bgDanger)
        ]}>
          <Text style={[
            styles.statusText,
            isAcceptedOrCompleted ? { color: colors.success } : (isPendingOrProcessing ? { color: colors.warning } : { color: colors.danger })
          ]}>
            {order.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Pharmacy Dashboard </Text>
          <Text style={styles.userName}>{user?.fullName}</Text>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}
            onPress={() => {
              if (locationLat && locationLng) {
                setSelectedRegion({ latitude: locationLat, longitude: locationLng, latitudeDelta: 0.05, longitudeDelta: 0.05 });
              } else {
                requestLocation();
              }
              setMapModalVisible(true);
            }}
          >
            <Ionicons name="location" size={12} color={colors.primary} />
            <Text style={{ fontSize: 12, color: colors.primary, marginLeft: 4, fontWeight: 'bold' }}>
              {!locationLat ? 'Service area not set' : (!isAvailable ? 'Currently Unavailable' : `Serving: ${serviceRadius || 10}km Radius`)}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <TouchableOpacity onPress={() => {
            if (locationLat && locationLng) {
              setSelectedRegion({ latitude: locationLat, longitude: locationLng, latitudeDelta: 0.05, longitudeDelta: 0.05 });
            } else {
              requestLocation();
            }
            setMapModalVisible(true);
          }} style={{ marginRight: 15, padding: 4, borderRadius: 20, backgroundColor: locationLat ? colors.primary + '20' : '#fee2e2' }}>
            <Ionicons name="location" size={24} color={locationLat ? colors.primary : '#ef4444'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Calendar')} style={{marginRight: 15}}>
            <MaterialCommunityIcons name="calendar-month" size={24} color={colors.primary} />
          </TouchableOpacity>
          <NotificationBell />
        </View>
      </View>

      {user?.verificationStatus === 'PENDING' && (
        <View style={{ backgroundColor: colors.warning + '20', padding: 15, marginHorizontal: SIZES.padding, marginBottom: 15, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.warning }}>
          <Text style={{ color: colors.warning, fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Account Pending Approval</Text>
          <Text style={{ color: colors.text }}>Your account is currently under review by the administrator. Some features may be restricted until approved.</Text>
        </View>
      )}
      {user?.verificationStatus === 'REJECTED' && (
        <View style={{ backgroundColor: colors.danger + '20', padding: 15, marginHorizontal: SIZES.padding, marginBottom: 15, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.danger }}>
          <Text style={{ color: colors.danger, fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Account Rejected</Text>
          <Text style={{ color: colors.text }}>Your account application has been rejected by the administrator. Please contact support for more details.</Text>
        </View>
      )}
      {user?.verificationStatus === 'APPROVED' && showApprovedBanner && (
        <View style={{ backgroundColor: colors.success + '20', padding: 15, marginHorizontal: SIZES.padding, marginBottom: 15, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.success, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.success, fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Account Approved!</Text>
            <Text style={{ color: colors.text }}>Your account has been fully approved by the administrator.</Text>
          </View>
          <TouchableOpacity onPress={() => setShowApprovedBanner(false)} style={{ padding: 5 }}>
            <MaterialCommunityIcons name="close" size={16} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      )}

      {user?.verificationStatus === 'APPROVED' && (
        <>
          <TimeFilter selectedFilter={timeFilter} onSelectFilter={setTimeFilter} />

          {/* Sub-Tabs */}
          <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius, padding: 4, marginBottom: 15, marginHorizontal: 2 }}>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: SIZES.radius, backgroundColor: activeTab === 'PRESCRIPTIONS' ? colors.primary : 'transparent' }}
              onPress={() => { setActiveTab('PRESCRIPTIONS'); setActiveStatus('TOTAL'); }}
            >
              <Text style={{ fontWeight: 'bold', color: activeTab === 'PRESCRIPTIONS' ? '#fff' : colors.textLight }}>Prescriptions</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: SIZES.radius, backgroundColor: activeTab === 'ORDERS' ? colors.primary : 'transparent' }}
              onPress={() => { setActiveTab('ORDERS'); setActiveStatus('TOTAL'); }}
            >
              <Text style={{ fontWeight: 'bold', color: activeTab === 'ORDERS' ? '#fff' : colors.textLight }}>Normal Orders</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>
            {activeTab === 'PRESCRIPTIONS' ? 'Prescription Stats' : 'Order Stats'}
          </Text>
          <View style={styles.grid}>
            <StatCard 
              title={activeTab === 'PRESCRIPTIONS' ? 'Total Prescriptions' : 'Total Orders'} 
              value={activeTab === 'PRESCRIPTIONS' ? (stats.prescriptions?.total || 0) : (stats.orders?.total || 0)} 
              icon="clipboard-list-outline" 
              color={colors.primary} 
              statusTarget="TOTAL"
            />
            <StatCard 
              title="Pending" 
              value={activeTab === 'PRESCRIPTIONS' ? (stats.prescriptions?.pending || 0) : (stats.orders?.pending || 0)} 
              icon="clock-outline" 
              color={colors.warning} 
              statusTarget="PENDING"
            />
            <StatCard 
              title="Completed" 
              value={activeTab === 'PRESCRIPTIONS' ? (stats.prescriptions?.completed || 0) : (stats.orders?.completed || 0)} 
              icon="check-circle-outline" 
              color={colors.success} 
              statusTarget="COMPLETED"
            />
            <StatCard 
              title="Rejected/Canceled" 
              value={activeTab === 'PRESCRIPTIONS' ? (stats.prescriptions?.rejected || 0) : (stats.orders?.rejected || 0)} 
              icon="close-circle-outline" 
              color={colors.danger} 
              statusTarget="REJECTED"
            />
          </View>

          {(() => {
            const listSource = activeTab === 'PRESCRIPTIONS' ? prescriptionOrders : regularOrders;
            const filteredList = listSource.filter(o => {
              if (activeStatus === 'TOTAL') return true;
              if (activeStatus === 'REJECTED') return o.status === 'REJECTED' || o.status === 'CANCELED';
              if (activeStatus === 'PENDING') return o.status === 'PENDING' || o.status === 'PROCESSING';
              return o.status === activeStatus;
            });
            return (
              <RecentsList 
                title={`${activeStatus === 'TOTAL' ? 'All' : activeStatus.charAt(0) + activeStatus.slice(1).toLowerCase()} ${activeTab === 'PRESCRIPTIONS' ? 'Prescriptions' : 'Orders'}`} 
                items={filteredList} 
                renderItem={renderRecentOrder} 
                onSeeAll={() => navigation.navigate('VendorOrders', { initialTab: activeTab, initialStatus: activeStatus })} 
              />
            );
          })()}
        </>
      )}

      {/* Order Details Modal */}
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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, color: colors.textLight, marginRight: 6 }}>Status: </Text>
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

    <Modal visible={mapModalVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: 'white', elevation: 2 }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Set Pharmacy Location</Text>
              <Text style={{ color: '#64748b' }}>Drag the map to pinpoint your location</Text>
            </View>
            <TouchableOpacity onPress={() => setMapModalVisible(false)} style={{ padding: 8, backgroundColor: '#f1f5f9', borderRadius: 20 }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 8, elevation: 4, padding: 5, margin: 20, marginBottom: 0 }}>
              <TextInput 
                style={{ flex: 1, padding: 10, marginRight: 10 }}
                placeholder="Search area (e.g. Colombo)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchLocation}
              />
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center', minWidth: 40, marginRight: 10 }}
                onPress={searchLocation}
                disabled={isSearchingLocation}
              >
                {isSearchingLocation ? <ActivityIndicator size="small" color="white" /> : <Ionicons name="search" size={20} color="white" />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={{ backgroundColor: '#28a745', padding: 10, borderRadius: 5, justifyContent: 'center', alignItems: 'center', minWidth: 40 }}
                onPress={requestLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? <ActivityIndicator size="small" color="white" /> : <MaterialIcons name="my-location" size={20} color="white" />}
              </TouchableOpacity>
            </View>
            {mapModalVisible && (
              <MapComponent selectedRegion={selectedRegion} setSelectedRegion={setSelectedRegion} isAvailable={isAvailable} serviceRadius={serviceRadius} />
            )}
            
            <View style={{ position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: 'rgba(255,255,255,0.9)', padding: 15, borderRadius: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#ddd' }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Delivery/Service Available</Text>
                <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: colors.primary }} />
              </View>
              {isAvailable && (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={{ flex: 1, fontWeight: 'bold' }}>Delivery Radius (km):</Text>
                    <TextInput 
                      style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 8, width: 60, textAlign: 'center' }}
                      keyboardType="numeric"
                      value={String(serviceRadius)}
                      onChangeText={setServiceRadius}
                    />
                  </View>
                </View>
              )}
              <TouchableOpacity 
                style={{ backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center' }}
                onPress={() => updateWorkingArea(selectedRegion.latitude, selectedRegion.longitude)}
                disabled={isUpdatingLocation}
              >
                {isUpdatingLocation ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Confirm Location</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: SIZES.padding },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  greeting: { fontSize: 16, color: colors.textLight },
  userName: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15, marginTop: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 15, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: colors.border },
  iconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardText: {},
  cardValue: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  cardTitle: { fontSize: 14, color: colors.textLight, marginTop: 4 },

  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border },
  iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  recentTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  recentSub: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  bgWarning: { backgroundColor: colors.warning + '20' },
  bgSuccess: { backgroundColor: colors.success + '20' },
  bgDanger: { backgroundColor: colors.danger + '20' },
  statusText: { fontSize: 12, fontWeight: 'bold', color: colors.text },
});

export default VendorDashboard;
