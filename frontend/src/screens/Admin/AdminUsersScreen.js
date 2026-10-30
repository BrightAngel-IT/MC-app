import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, TextInput, Linking, Dimensions, Platform } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const ImageWithFallback = ({ uri, style, onPress, colors }) => {
  const [loadError, setLoadError] = useState(false);

  if (loadError || !uri) {
    return (
      <View style={[style, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' }]}>
        <Ionicons name="document-text-outline" size={26} color={colors.textLight} />
        <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 4, fontWeight: '500' }}>Document File</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ width: '100%', height: '100%' }}>
      <Image 
        source={{ uri }} 
        style={style} 
        resizeMode="cover"
        onError={() => setLoadError(true)} 
      />
    </TouchableOpacity>
  );
};

const AdminUsersScreen = ({ route, navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('APPROVED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [selectedDoctorWallet, setSelectedDoctorWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const openDoctorWallet = async (professionalId, docName) => {
    try {
      setLoadingWallet(true);
      setWalletModalVisible(true);
      setSelectedDoctorWallet({ doctorName: docName, walletBalance: 0, transactions: [] });
      const res = await api.get(`/admin/wallet/${professionalId}`);
      if (res.data) {
        setSelectedDoctorWallet(res.data);
      }
    } catch (err) {
      console.log('Error fetching doctor wallet:', err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const downloadImage = async () => {
    if (!selectedImage) return;
    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = selectedImage;
        link.download = 'user_document.png';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fileUri = FileSystem.documentDirectory + `user_document_${Date.now()}.png`;
        if (selectedImage.startsWith('http')) {
          await FileSystem.downloadAsync(selectedImage, fileUri);
        }
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'image/png' });
        }
      }
    } catch (e) {
      console.log('Download error:', e);
    }
  };

  const resolveImage = (imgPath) => {
    if (!imgPath) return null;
    let url = imgPath;
    if (url.includes('localhost:5000')) {
      url = url.replace('http://localhost:5000', 'https://mcbackend.crescereluna.com');
    }
    // Convert any insecure http:// to https:// for production domain to avoid browser mixed content blocking
    if (url.startsWith('http://mcbackend.crescereluna.com')) {
      url = url.replace('http://', 'https://');
    }
    if (url.startsWith('http') || url.startsWith('data:image')) {
      return url;
    }
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'https://mcbackend.crescereluna.com';
    return `${baseUrl}${cleanPath}`;
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.log('Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const formatDateTime = (dateVal) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const filteredUsers = users
    .filter(u => {
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || u.verificationStatus === statusFilter;
      const matchesSearch = u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesRole && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      // Newly accepted/approved user first (descending by approval date or created date)
      const aApproval = a.approvedAt || (a.activityLogs && a.activityLogs[0]?.createdAt) || (a.verificationStatus === 'APPROVED' ? a.createdAt : null);
      const bApproval = b.approvedAt || (b.activityLogs && b.activityLogs[0]?.createdAt) || (b.verificationStatus === 'APPROVED' ? b.createdAt : null);
      
      const timeA = aApproval ? new Date(aApproval).getTime() : 0;
      const timeB = bApproval ? new Date(bApproval).getTime() : 0;

      if (timeA !== timeB) {
        return timeB - timeA; // Most recent approval first
      }
      // If neither has approval or dates are identical, fall back to newest registration first
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const roles = [
    { id: 'ALL', label: 'All Users' },
    { id: 'PATIENT', label: 'Patients' },
    { id: 'DOCTOR', label: 'Doctors' },
    { id: 'PARAMEDIC', label: 'Paramedics' },
    { id: 'NURSE', label: 'Nurses' },
    { id: 'LAB_TECH', label: 'Lab Techs' },
    { id: 'CAREGIVER', label: 'Caregivers' },
    { id: 'PHARMACIST', label: 'Pharmacies' },
    { id: 'ELDER_HOME', label: 'Elder Homes' },
  ];

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <View style={{padding: SIZES.padding, paddingBottom: 0}}>
        <Text style={styles.headerTitle}>All Approved Users</Text>
        <Text style={styles.headerSub}>Manage platform members</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{gap: 10, paddingRight: 20}}>
          {roles.map(role => (
            <TouchableOpacity 
              key={role.id} 
              style={[styles.filterBtn, roleFilter === role.id && styles.filterBtnActive]}
              onPress={() => setRoleFilter(role.id)}
            >
              <Text style={[styles.filterText, roleFilter === role.id && styles.filterTextActive]}>{role.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>


        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.noData}>No users found for this role.</Text>
          </View>
        ) : (
          filteredUsers.map((u) => (
          <View key={u.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.name}>{u.fullName}</Text>
              <View style={[styles.badge, { backgroundColor: colors.roles[u.role]?.primary + '20' || colors.surfaceLight }]}>
                <Text style={[styles.badgeText, { color: colors.roles[u.role]?.primary || colors.text }]}>{u.role}</Text>
              </View>
            </View>
            <Text style={styles.email}>{u.email}</Text>
            {u.phone && (
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 }}
                onPress={() => Linking.openURL(`tel:${u.phone}`)}
              >
                <Ionicons name="call" size={14} color={colors.primary} />
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: 'bold' }}>Call {u.phone}</Text>
              </TouchableOpacity>
            )}

            {/* Professional Wallet Badge & Statement Action */}
            {u.professionalProfile && (
              <View style={[styles.adminWalletRow, { backgroundColor: (u.professionalProfile.walletBalance || 0) >= 0 ? '#ecfdf5' : '#fef2f2', borderColor: (u.professionalProfile.walletBalance || 0) >= 0 ? '#10b981' : '#ef4444' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Ionicons 
                    name="wallet" 
                    size={18} 
                    color={(u.professionalProfile.walletBalance || 0) >= 0 ? '#059669' : '#dc2626'} 
                    style={{ marginRight: 8 }} 
                  />
                  <View>
                    <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '600' }}>WALLET BALANCE</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: (u.professionalProfile.walletBalance || 0) >= 0 ? '#059669' : '#dc2626' }}>
                      {(u.professionalProfile.walletBalance || 0) >= 0 
                        ? `+Rs. ${(u.professionalProfile.walletBalance || 0).toFixed(2)}` 
                        : `-Rs. ${Math.abs(u.professionalProfile.walletBalance || 0).toFixed(2)}`}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.viewWalletBtn, { backgroundColor: colors.primary }]}
                  onPress={() => openDoctorWallet(u.professionalProfile.id, u.fullName)}
                >
                  <Ionicons name="receipt-outline" size={13} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>View Statement</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {u.professionalProfile && (
              <View style={styles.detailsBox}>
                {u.professionalProfile.address && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Address: </Text>
                    {u.professionalProfile.address}
                  </Text>
                )}
                {u.professionalProfile.idCardNumber && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>ID Card Number: </Text>
                    {u.professionalProfile.idCardNumber}
                  </Text>
                )}
                {u.professionalProfile.workingHospital && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Working Hospital: </Text>
                    {u.professionalProfile.workingHospital}
                  </Text>
                )}
                {u.professionalProfile.attachedHospital && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Attached Hospital / Service: </Text>
                    {u.professionalProfile.attachedHospital}
                  </Text>
                )}
                {u.professionalProfile.ambulanceVehicleNumber && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Ambulance Vehicle Number: </Text>
                    {u.professionalProfile.ambulanceVehicleNumber}
                  </Text>
                )}
                {u.professionalProfile.isCurrentlyWorking === false && (
                  <Text style={[styles.detailText, {color: colors.warning}]}>
                    * Not currently working at a hospital/service
                  </Text>
                )}
                {u.professionalProfile.specialization && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Specializations: </Text>
                    {u.professionalProfile.specialization}
                  </Text>
                )}
                {u.professionalProfile.licenseNumber && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>License Number: </Text>
                    {u.professionalProfile.licenseNumber}
                  </Text>
                )}
                {u.professionalProfile.licenseIssuedYear && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>License Issued Year: </Text>
                    {u.professionalProfile.licenseIssuedYear}
                    <Text style={[styles.detailLabel, {color: colors.primary, marginLeft: 10}]}>  (Exp: {new Date().getFullYear() - u.professionalProfile.licenseIssuedYear} Years)</Text>
                  </Text>
                )}
                {u.professionalProfile.qualifications && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Qualifications: </Text>
                    {u.professionalProfile.qualifications}
                  </Text>
                )}

                
                {/* Elder Home Specific Information */}
                {u.role === 'ELDER_HOME' && (
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    {u.professionalProfile.facilities && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Facilities: </Text>
                        {u.professionalProfile.facilities}
                      </Text>
                    )}
                    {u.professionalProfile.policies && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Policies: </Text>
                        {u.professionalProfile.policies}
                      </Text>
                    )}
                    {u.professionalProfile.contactPhone && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Contact Phone: </Text>
                        {u.professionalProfile.contactPhone}
                      </Text>
                    )}
                    
                    {/* Social / Contact Links */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 8 }}>
                      {u.professionalProfile.socialWhatsapp && (
                        <TouchableOpacity 
                          style={[styles.smallActionBadge, { backgroundColor: '#25D36620' }]}
                          onPress={() => Linking.openURL(`https://wa.me/${u.professionalProfile.socialWhatsapp.replace(/[^0-9]/g, '')}`)}
                        >
                          <Ionicons name="logo-whatsapp" size={13} color="#25D366" />
                          <Text style={{ fontSize: 11, color: '#25D366', fontWeight: 'bold' }}>WhatsApp</Text>
                        </TouchableOpacity>
                      )}
                      {u.professionalProfile.socialFacebook && (
                        <TouchableOpacity 
                          style={[styles.smallActionBadge, { backgroundColor: '#1877F220' }]}
                          onPress={() => Linking.openURL(u.professionalProfile.socialFacebook.startsWith('http') ? u.professionalProfile.socialFacebook : `https://${u.professionalProfile.socialFacebook}`)}
                        >
                          <Ionicons name="logo-facebook" size={13} color="#1877F2" />
                          <Text style={{ fontSize: 11, color: '#1877F2', fontWeight: 'bold' }}>Facebook</Text>
                        </TouchableOpacity>
                      )}
                      {u.professionalProfile.socialInstagram && (
                        <TouchableOpacity 
                          style={[styles.smallActionBadge, { backgroundColor: '#E1306C20' }]}
                          onPress={() => Linking.openURL(u.professionalProfile.socialInstagram.startsWith('http') ? u.professionalProfile.socialInstagram : `https://${u.professionalProfile.socialInstagram}`)}
                        >
                          <Ionicons name="logo-instagram" size={13} color="#E1306C" />
                          <Text style={{ fontSize: 11, color: '#E1306C', fontWeight: 'bold' }}>Instagram</Text>
                        </TouchableOpacity>
                      )}
                      {u.professionalProfile.socialWebsite && (
                        <TouchableOpacity 
                          style={[styles.smallActionBadge, { backgroundColor: colors.primary + '20' }]}
                          onPress={() => Linking.openURL(u.professionalProfile.socialWebsite.startsWith('http') ? u.professionalProfile.socialWebsite : `https://${u.professionalProfile.socialWebsite}`)}
                        >
                          <Ionicons name="globe-outline" size={13} color={colors.primary} />
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>Website</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Services Count / Pricing Preview */}
                    {u.professionalProfile.elderHomeServices && u.professionalProfile.elderHomeServices.length > 0 && (
                      <View style={{ marginTop: 4, marginBottom: 8 }}>
                        <Text style={styles.detailLabel}>Services Offered ({u.professionalProfile.elderHomeServices.length}):</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {u.professionalProfile.elderHomeServices.map((srv, idx) => (
                            <View key={srv.id || idx} style={styles.serviceChip}>
                              <Text style={styles.serviceChipText}>{srv.name} (Rs. {srv.price})</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}



                    {/* Button to View Full Elder Home Profile */}
                    <TouchableOpacity
                      style={styles.viewProfileBtn}
                      onPress={() => navigation.navigate('ElderHomeDetail', {
                        id: u.professionalProfile?.id || u.id,
                        elderHomeId: u.professionalProfile?.id || u.id,
                        elderHome: {
                          ...u.professionalProfile,
                          userId: u.id,
                          user: u,
                          fullName: u.fullName
                        }
                      })}
                    >
                      <MaterialCommunityIcons name="home-heart" size={18} color="#fff" />
                      <Text style={styles.viewProfileBtnText}>View Profile</Text>
                      <Ionicons name="chevron-forward" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}

                {(u.professionalProfile.idFrontImage || u.professionalProfile.idBackImage) && (
                  <View style={{marginTop: 10}}>
                    <Text style={styles.detailLabel}>ID / Document Images:</Text>
                    <View style={styles.imageRow}>
                      {u.professionalProfile.idFrontImage && (
                         <View style={{flex: 1}}>
                           <Text style={styles.imageLabel}>Front Side</Text>
                           <ImageWithFallback 
                             uri={resolveImage(u.professionalProfile.idFrontImage)} 
                             style={styles.licenseImg} 
                             onPress={() => setSelectedImage(resolveImage(u.professionalProfile.idFrontImage))}
                             colors={colors}
                           />
                         </View>
                      )}
                      {u.professionalProfile.idBackImage && (
                         <View style={{flex: 1}}>
                           <Text style={styles.imageLabel}>Back Side</Text>
                           <ImageWithFallback 
                             uri={resolveImage(u.professionalProfile.idBackImage)} 
                             style={styles.licenseImg} 
                             onPress={() => setSelectedImage(resolveImage(u.professionalProfile.idBackImage))}
                             colors={colors}
                           />
                         </View>
                      )}
                    </View>
                  </View>
                )}
                {(u.professionalProfile.licenseFrontImage || u.professionalProfile.licenseBackImage) && (
                  <View style={{marginTop: 10}}>
                    <Text style={styles.detailLabel}>License / ID / Driving License Images:</Text>
                    <View style={styles.imageRow}>
                      {u.professionalProfile.licenseFrontImage && (
                         <View style={{flex: 1}}>
                           <Text style={styles.imageLabel}>Front Side</Text>
                           <ImageWithFallback 
                             uri={resolveImage(u.professionalProfile.licenseFrontImage)} 
                             style={styles.licenseImg} 
                             onPress={() => setSelectedImage(resolveImage(u.professionalProfile.licenseFrontImage))}
                             colors={colors}
                           />
                         </View>
                      )}
                      {u.professionalProfile.licenseBackImage && (
                         <View style={{flex: 1}}>
                           <Text style={styles.imageLabel}>Back Side</Text>
                           <ImageWithFallback 
                             uri={resolveImage(u.professionalProfile.licenseBackImage)} 
                             style={styles.licenseImg} 
                             onPress={() => setSelectedImage(resolveImage(u.professionalProfile.licenseBackImage))}
                             colors={colors}
                           />
                         </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {u.pharmacistProfile && (
              <View style={styles.detailsBox}>
                {u.pharmacistProfile.businessName && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Business Name: </Text>
                    {u.pharmacistProfile.businessName}
                  </Text>
                )}
                {u.pharmacistProfile.licenseNumber && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>License Number: </Text>
                    {u.pharmacistProfile.licenseNumber}
                  </Text>
                )}
                {u.pharmacistProfile.licenseIssuedYear && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>License Issued Year: </Text>
                    {u.pharmacistProfile.licenseIssuedYear}
                    <Text style={[styles.detailLabel, {color: colors.primary, marginLeft: 10}]}>  (Exp: {new Date().getFullYear() - u.pharmacistProfile.licenseIssuedYear} Years)</Text>
                  </Text>
                )}
                {u.pharmacistProfile.address && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Address: </Text>
                    {u.pharmacistProfile.address}
                  </Text>
                )}
                
                {(u.pharmacistProfile.idFrontImage || u.pharmacistProfile.idBackImage) && (
                  <View style={{marginTop: 10}}>
                    <Text style={styles.detailLabel}>ID / Document Images:</Text>
                    <View style={styles.imageRow}>
                      {u.pharmacistProfile.idFrontImage && (
                         <View style={{flex: 1}}>
                           <Text style={styles.imageLabel}>Front Side</Text>
                           <ImageWithFallback 
                             uri={resolveImage(u.pharmacistProfile.idFrontImage)} 
                             style={styles.licenseImg} 
                             onPress={() => setSelectedImage(resolveImage(u.pharmacistProfile.idFrontImage))}
                             colors={colors}
                           />
                         </View>
                      )}
                      {u.pharmacistProfile.idBackImage && (
                         <View style={{flex: 1}}>
                           <Text style={styles.imageLabel}>Back Side</Text>
                           <ImageWithFallback 
                             uri={resolveImage(u.pharmacistProfile.idBackImage)} 
                             style={styles.licenseImg} 
                             onPress={() => setSelectedImage(resolveImage(u.pharmacistProfile.idBackImage))}
                             colors={colors}
                           />
                         </View>
                      )}
                    </View>
                  </View>
                )}
                {(u.pharmacistProfile.licenseFrontImage || u.pharmacistProfile.licenseBackImage) && (
                  <View style={{marginTop: 10}}>
                    <Text style={styles.detailLabel}>License Images:</Text>
                    <View style={styles.imageRow}>
                      {u.pharmacistProfile.licenseFrontImage && (
                         <View style={{flex: 1}}>
                           <Text style={styles.imageLabel}>Front Side</Text>
                           <ImageWithFallback 
                             uri={resolveImage(u.pharmacistProfile.licenseFrontImage)} 
                             style={styles.licenseImg} 
                             onPress={() => setSelectedImage(resolveImage(u.pharmacistProfile.licenseFrontImage))}
                             colors={colors}
                           />
                         </View>
                      )}
                      {u.pharmacistProfile.licenseBackImage && (
                         <View style={{flex: 1}}>
                           <Text style={styles.imageLabel}>Back Side</Text>
                           <ImageWithFallback 
                             uri={resolveImage(u.pharmacistProfile.licenseBackImage)} 
                             style={styles.licenseImg} 
                             onPress={() => setSelectedImage(resolveImage(u.pharmacistProfile.licenseBackImage))}
                             colors={colors}
                           />
                         </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {u.patientProfile && (
              <View style={styles.detailsBox}>
                {u.patientProfile.nicNumber && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>NIC Number: </Text>
                    {u.patientProfile.nicNumber}
                  </Text>
                )}
                {u.patientProfile.address && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Address: </Text>
                    {u.patientProfile.address}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.timestampContainer}>
              <View style={styles.timestampItem}>
                <Ionicons name="calendar-outline" size={14} color={colors.textLight} style={{ marginRight: 5 }} />
                <Text style={styles.timestampLabel}>Applied / Registered:</Text>
                <Text style={styles.timestampValue}>{formatDateTime(u.createdAt) || 'N/A'}</Text>
              </View>

              {u.verificationStatus === 'APPROVED' && (
                <View style={[styles.timestampItem, { marginTop: 4 }]}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} style={{ marginRight: 5 }} />
                  <Text style={[styles.timestampLabel, { color: colors.success }]}>Accepted / Approved:</Text>
                  <Text style={[styles.timestampValue, { color: colors.success, fontWeight: 'bold' }]}>
                    {formatDateTime(u.approvedAt || (u.activityLogs && u.activityLogs[0]?.createdAt) || u.createdAt) || 'Approved'}
                  </Text>
                </View>
              )}
            </View>

            <Text style={[
              styles.status, 
              { color: u.verificationStatus === 'APPROVED' ? colors.success : (u.verificationStatus === 'PENDING' ? colors.warning : colors.danger) }
            ]}>
              Status: {u.verificationStatus}
            </Text>
          </View>
          ))
        )}
      </ScrollView>

      <Modal visible={!!selectedImage} transparent={true} animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <View style={styles.modalBg}>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            maximumZoomScale={5}
            minimumZoomScale={1}
            centerContent={true}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <TouchableWithoutFeedback>
              <Image source={{uri: selectedImage}} style={styles.fullImage} resizeMode="contain" />
            </TouchableWithoutFeedback>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.downloadBtn} onPress={downloadImage}>
              <Ionicons name="download-outline" size={20} color="#fff" style={{marginRight: 8}} />
              <Text style={[styles.closeBtnText, {color: '#fff'}]}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedImage(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Admin Doctor Wallet Statement Modal */}
      <Modal visible={walletModalVisible} transparent={true} animationType="slide" onRequestClose={() => setWalletModalVisible(false)}>
        <View style={styles.walletModalBg}>
          <View style={[styles.walletModalContent, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={[styles.walletModalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.walletModalTitle, { color: colors.text }]}>Doctor Wallet Statement</Text>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: 'bold' }}>
                  {selectedDoctorWallet?.doctorName || 'Doctor'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setWalletModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={26} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {loadingWallet ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textLight, marginTop: 10 }}>Fetching wallet statement...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Balance Summary Header */}
                <View style={[
                  styles.adminWalletBalanceCard,
                  { backgroundColor: (selectedDoctorWallet?.walletBalance || 0) >= 0 ? '#065f46' : '#991b1b' }
                ]}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold' }}>CURRENT DOCTOR BALANCE</Text>
                  <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold', marginTop: 4 }}>
                    {(selectedDoctorWallet?.walletBalance || 0) >= 0 
                      ? `+Rs. ${(selectedDoctorWallet?.walletBalance || 0).toFixed(2)}` 
                      : `-Rs. ${Math.abs(selectedDoctorWallet?.walletBalance || 0).toFixed(2)}`}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 }}>
                    {(selectedDoctorWallet?.walletBalance || 0) >= 0
                      ? 'Doctor has net earnings to receive from Company.'
                      : 'Doctor owes commission to Company from cash appointments.'}
                  </Text>
                </View>

                {/* Line by Line Transactions */}
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text, marginBottom: 10, marginTop: 14 }}>
                  Ledger History ({selectedDoctorWallet?.transactions?.length || 0} entries)
                </Text>

                {(!selectedDoctorWallet?.transactions || selectedDoctorWallet.transactions.length === 0) ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ color: colors.textLight, fontStyle: 'italic' }}>No transactions recorded yet.</Text>
                  </View>
                ) : (
                  selectedDoctorWallet.transactions.map((tx) => {
                    const isCredit = tx.type === 'CREDIT';
                    return (
                      <View key={tx.id} style={[styles.adminTxCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              backgroundColor: tx.paymentMethod === 'CARD' ? '#dbeafe' : '#fef3c7'
                            }}>
                              <Text style={{ fontSize: 10, fontWeight: 'bold', color: tx.paymentMethod === 'CARD' ? '#1e40af' : '#92400e' }}>
                                {tx.paymentMethod}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: colors.textLight }}>{formatDateTime(tx.createdAt)}</Text>
                          </View>

                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: isCredit ? '#10b981' : '#ef4444' }}>
                            {isCredit ? `+Rs. ${Math.abs(tx.amount).toFixed(2)}` : `-Rs. ${Math.abs(tx.amount).toFixed(2)}`}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 12, color: colors.text, marginTop: 6 }}>{tx.description}</Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                          <Text style={{ fontSize: 11, color: colors.textLight }}>Total Fee: Rs. {tx.totalFee?.toFixed(2)}</Text>
                          <Text style={{ fontSize: 11, color: '#ef4444' }}>Company Comm: Rs. {tx.commissionAmount?.toFixed(2)}</Text>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.text }}>Balance: Rs. {tx.balanceAfter?.toFixed(2)}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: 10 },
  headerSub: { fontSize: 14, color: colors.textLight, marginBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: SIZES.radius, paddingHorizontal: 15, marginBottom: 15, height: 45, borderWidth: 1, borderColor: colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  emptyState: { padding: 40, alignItems: 'center' },
  noData: { color: colors.textLight, fontStyle: 'italic', textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 16, marginBottom: 12, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  email: { fontSize: 13, color: colors.textLight, marginTop: 4 },
  detailsBox: { marginTop: 10, padding: 10, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius },
  detailText: { fontSize: 13, color: colors.text, marginBottom: 4 },
  detailLabel: { fontWeight: 'bold', color: colors.textLight },
  status: { fontSize: 12, fontWeight: 'bold', marginTop: 8 },
  timestampContainer: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
  timestampItem: { flexDirection: 'row', alignItems: 'center' },
  timestampLabel: { fontSize: 12, color: colors.textLight, fontWeight: '600', marginRight: 6 },
  timestampValue: { fontSize: 12, color: colors.text },
  filterScroll: { flexGrow: 0, marginBottom: 10, marginTop: 15 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textLight, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  statusFilterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  statusFilterBtnActive: { borderColor: colors.text, backgroundColor: colors.text },
  statusFilterText: { fontSize: 12, color: colors.textLight, fontWeight: '600' },
  imageRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  imageLabel: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  licenseImg: { width: '100%', height: 100, borderRadius: SIZES.radius, backgroundColor: colors.border },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: Dimensions.get('window').width * 0.9, height: Dimensions.get('window').height * 0.75 },
  modalActions: { flexDirection: 'row', position: 'absolute', bottom: 30, gap: 15, zIndex: 10 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 25, cursor: Platform.OS === 'web' ? 'pointer' : 'auto' },
  closeBtn: { padding: 12, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 30, cursor: Platform.OS === 'web' ? 'pointer' : 'auto' },
  closeBtnText: { color: colors.text, fontWeight: 'bold' },
  smallActionBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  serviceChip: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  viewProfileBtn: { 
    marginTop: 12, 
    backgroundColor: colors.primary, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: SIZES.radius,
    alignSelf: Platform.OS === 'web' ? 'flex-start' : 'stretch',
    maxWidth: Platform.OS === 'web' ? 240 : undefined,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  viewProfileBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  adminWalletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginTop: 8,
  },
  viewWalletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  walletModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  walletModalContent: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
  },
  walletModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  walletModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  adminWalletBalanceCard: {
    borderRadius: 12,
    padding: 16,
  },
  adminTxCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
});

export default AdminUsersScreen;
