import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, RefreshControl, ActivityIndicator, Image, Modal, TouchableWithoutFeedback, TextInput, Dimensions, Platform, Linking } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';
import { Ionicons } from '@expo/vector-icons';
import CustomAlertModal from '../../components/CustomAlertModal';

const AdminApprovalsScreen = ({ route }) => {
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [tab, setTab] = useState('PENDING'); // PENDING or REJECTED
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'success', title: '', message: '' });
  const { colors } = useTheme();
  const styles = getStyles(colors);

  useEffect(() => {
    if (route?.params?.roleFilter) {
      setRoleFilter(route.params.roleFilter);
    }
  }, [route?.params]);

  const fetchUsers = async () => {
    try {
      if (tab === 'PENDING') {
        const response = await api.get('/admin/pending');
        setUsersList(response.data.pendingUsers || []);
      } else {
        const response = await api.get('/admin/rejected');
        setUsersList(response.data.rejectedUsers || []);
      }
    } catch (error) {
      console.log('Failed to fetch users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchUsers();
    }, [tab])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [tab]);

  const filteredUsers = usersList.filter(u => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch = u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const roles = [
    { id: 'ALL', label: 'All Users' },
    { id: 'DOCTOR', label: 'Doctors' },
    { id: 'PARAMEDIC', label: 'Paramedics' },
    { id: 'NURSE', label: 'Nurses' },
    { id: 'LAB_TECH', label: 'Lab Techs' },
    { id: 'CAREGIVER', label: 'Caregivers' },
    { id: 'PHARMACIST', label: 'Pharmacies' },
    { id: 'ELDER_HOME', label: 'Elder Homes' },
  ];

  const handleApprove = async (id, userName) => {
    try {
      await api.put(`/admin/approve/${id}`);
      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Account Approved! 🎉',
        message: `${userName || 'User'} has been approved successfully. They can now log in and provide services.`
      });
      fetchUsers();
    } catch (error) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Approval Failed',
        message: 'Could not approve this user. Please try again.'
      });
    }
  };

  const handleReject = async (id, userName) => {
    try {
      await api.put(`/admin/reject/${id}`);
      setAlertConfig({
        visible: true,
        type: 'info',
        title: 'Application Rejected',
        message: `${userName || 'User'} registration has been marked as Rejected.`
      });
      fetchUsers();
    } catch (error) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Action Failed',
        message: 'Could not reject this user. Please try again.'
      });
    }
  };

  const handleUndoReject = async (id, userName) => {
    try {
      await api.put(`/admin/undo-reject/${id}`);
      setAlertConfig({
        visible: true,
        type: 'success',
        title: 'Moved to Pending',
        message: `${userName || 'User'} has been moved back to the Pending list for re-evaluation.`
      });
      fetchUsers();
    } catch (error) {
      setAlertConfig({
        visible: true,
        type: 'error',
        title: 'Action Failed',
        message: 'Could not undo rejection. Please try again.'
      });
    }
  };

  const handleDelete = async (id, userName) => {
    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Are you sure you want to completely delete ${userName || 'this user'}? This action cannot be undone.`);
      if (confirm) {
        try {
          await api.delete(`/admin/user/${id}`);
          setAlertConfig({
            visible: true,
            type: 'success',
            title: 'User Deleted',
            message: `${userName || 'User'} account has been permanently removed.`
          });
          fetchUsers();
        } catch (error) {
          setAlertConfig({
            visible: true,
            type: 'error',
            title: 'Deletion Failed',
            message: 'Failed to delete the user.'
          });
        }
      }
    } else {
      Alert.alert(
        "Confirm Deletion",
        `Are you sure you want to completely delete ${userName || 'this user'}? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive",
            onPress: async () => {
              try {
                await api.delete(`/admin/user/${id}`);
                setAlertConfig({
                  visible: true,
                  type: 'success',
                  title: 'User Deleted',
                  message: `${userName || 'User'} account has been permanently removed.`
                });
                fetchUsers();
              } catch (error) {
                setAlertConfig({
                  visible: true,
                  type: 'error',
                  title: 'Deletion Failed',
                  message: 'Failed to delete the user.'
                });
              }
            }
          }
        ]
      );
    }
  };

  const downloadImage = async () => {
    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = selectedImage;
        link.download = 'user_document.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fileUri = FileSystem.documentDirectory + `user_document_${Date.now()}.png`;
        
        if (selectedImage.startsWith('http')) {
          await FileSystem.downloadAsync(selectedImage, fileUri);
        } else {
          let base64Code = selectedImage.includes(',') ? selectedImage.split(',')[1] : selectedImage;
          // Strip everything that isn't a valid base64 character
          base64Code = base64Code.replace(/[^A-Za-z0-9+/=]/g, '');
          
          // Fix missing padding
          while (base64Code.length % 4 > 0) {
            base64Code += '=';
          }
          
          await FileSystem.writeAsStringAsync(fileUri, base64Code, { encoding: FileSystem.EncodingType.Base64 });
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Download Image' });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.log("Download error:", error);
      Alert.alert('Download Failed', error.message || String(error));
    }
  };

  const downloadUserPDF = async (pUser) => {
    try {
      const profile = pUser.professionalProfile || pUser.pharmacistProfile || {};
      
      const frontImgStr = profile.licenseFrontImage ? (profile.licenseFrontImage.startsWith('http') ? profile.licenseFrontImage : `data:image/png;base64,${profile.licenseFrontImage.includes(',') ? profile.licenseFrontImage.split(',')[1] : profile.licenseFrontImage}`) : '';
      const backImgStr = profile.licenseBackImage ? (profile.licenseBackImage.startsWith('http') ? 
profile.licenseBackImage : `data:image/png;base64,${profile.licenseBackImage.includes(',') ? 
profile.licenseBackImage.split(',')[1] : profile.licenseBackImage}`) : '';

        const idFrontImgStr = profile.idFrontImage ? (profile.idFrontImage.startsWith('http') ? 
profile.idFrontImage : `data:image/png;base64,${profile.idFrontImage.includes(',') ? 
profile.idFrontImage.split(',')[1] : profile.idFrontImage}`) : '';
        const idBackImgStr = profile.idBackImage ? (profile.idBackImage.startsWith('http') ? 
profile.idBackImage : `data:image/png;base64,${profile.idBackImage.includes(',') ? 
profile.idBackImage.split(',')[1] : profile.idBackImage}`) : '';

      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #333; }
              h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
              .detail-row { margin-bottom: 10px; font-size: 16px; }
              .label { font-weight: bold; color: #7f8c8d; width: 200px; display: inline-block; }
              .images-container { margin-top: 30px; }
              .img-box { margin-bottom: 20px; }
              .img-box h3 { color: #2c3e50; }
              img { max-width: 100%; max-height: 400px; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            </style>
          </head>
          <body>
            <h1>User Profile Details: ${pUser.fullName || pUser.email}</h1>
            <div class="detail-row"><span class="label">Role:</span> ${pUser.role}</div>
            <div class="detail-row"><span class="label">Email:</span> ${pUser.email}</div>
            ${pUser.phone ? `<div class="detail-row"><span class="label">Phone:</span> ${pUser.phone}</div>` : ''}
            ${profile.businessName ? `<div class="detail-row"><span class="label">Business Name:</span> ${profile.businessName}</div>` : ''}
            ${profile.address ? `<div class="detail-row"><span class="label">Address:</span> ${profile.address}</div>` : ''}
            ${profile.idCardNumber ? `<div class="detail-row"><span class="label">ID Card:</span> ${profile.idCardNumber}</div>` : ''}
            ${profile.licenseNumber ? `<div class="detail-row"><span class="label">License Number:</span> ${profile.licenseNumber}</div>` : ''}
            ${profile.licenseIssuedYear ? `<div class="detail-row"><span class="label">License Year:</span> ${profile.licenseIssuedYear}</div>` : ''}
            
            <div class="images-container">
              ${frontImgStr ? `
                <div class="img-box">
                  <h3>Front Image</h3>
                  <img src="${frontImgStr}" />
                </div>
              ` : ''}
              ${backImgStr ? `
                <div class="img-box">
                  <h3>Back Image</h3>
                  <img src="${backImgStr}" />
                </div>
              ` : ''}
              ${idFrontImgStr ? `
                <div class="img-box">
                  <h3>ID / Document Front</h3>
                  <img src="${idFrontImgStr}" />
                </div>
              ` : ''}
              ${idBackImgStr ? `
                <div class="img-box">
                  <h3>ID / Document Back</h3>
                  <img src="${idBackImgStr}" />
                </div>
              ` : ''}
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        // Give images a moment to load before triggering print
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 500);
      } else {
        // Bypass Android's broken cache file permissions by grabbing the raw base64 data directly from memory
        const { base64 } = await Print.printToFileAsync({ html, base64: true });
        const newUri = FileSystem.documentDirectory + `Profile_${pUser._id || Date.now()}.pdf`;
        
        // Write the raw data directly to the official Document Directory
        await FileSystem.writeAsStringAsync(newUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(newUri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Download Profile PDF' });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.log('PDF Error:', error);
      Alert.alert('Error Generating PDF', error.message || String(error));
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <View style={{padding: SIZES.padding, paddingBottom: 10}}>
        <Text style={styles.headerTitle}>Approvals & Rejections</Text>
        <Text style={styles.headerSub}>Verify or delete professionals and vendors</Text>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, tab === 'PENDING' && styles.tabBtnActive]} 
            onPress={() => setTab('PENDING')}
          >
            <Text style={[styles.tabText, tab === 'PENDING' && styles.tabTextActive]}>Pending</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, tab === 'REJECTED' && styles.tabBtnActive]} 
            onPress={() => setTab('REJECTED')}
          >
            <Text style={[styles.tabText, tab === 'REJECTED' && styles.tabTextActive]}>Rejected</Text>
          </TouchableOpacity>
        </View>

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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView 
          style={styles.container}
          contentContainerStyle={{paddingBottom: 20}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.noData}>
                {tab === 'PENDING' ? "No pending verifications found." : "No rejected users found."}
              </Text>
            </View>
          ) : (
            filteredUsers.map((pUser) => (
              <View key={pUser.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.name}>{pUser.fullName}</Text>
                  <View style={[styles.badge, { backgroundColor: colors.roles[pUser.role]?.primary + '20' || colors.surfaceLight }]}>
                    <Text style={[styles.badgeText, { color: colors.roles[pUser.role]?.primary || colors.text }]}>{pUser.role}</Text>
                  </View>
                </View>
                <Text style={styles.email}>{pUser.email}</Text>
                {pUser.phone && (
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 }}
                    onPress={() => Linking.openURL(`tel:${pUser.phone}`)}
                  >
                    <Ionicons name="call" size={14} color={colors.primary} />
                    <Text style={{ fontSize: 13, color: colors.primary, fontWeight: 'bold' }}>Call {pUser.phone}</Text>
                  </TouchableOpacity>
                )}
                
                {pUser.professionalProfile && (
                  <View style={styles.detailsBox}>
                    {pUser.professionalProfile.address && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Address: </Text>
                        {pUser.professionalProfile.address}
                      </Text>
                    )}
                    {pUser.professionalProfile.idCardNumber && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>ID Card Number: </Text>
                        {pUser.professionalProfile.idCardNumber}
                      </Text>
                    )}
                    {pUser.professionalProfile.workingHospital && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Working Hospital: </Text>
                        {pUser.professionalProfile.workingHospital}
                      </Text>
                    )}
                    {pUser.professionalProfile.attachedHospital && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Attached Hospital / Service: </Text>
                        {pUser.professionalProfile.attachedHospital}
                      </Text>
                    )}
                    {pUser.professionalProfile.ambulanceVehicleNumber && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Ambulance Vehicle Number: </Text>
                        {pUser.professionalProfile.ambulanceVehicleNumber}
                      </Text>
                    )}
                    {pUser.professionalProfile.isCurrentlyWorking === false && (
                      <Text style={[styles.detailText, {color: colors.warning}]}>
                        * Not currently working at a hospital/service
                      </Text>
                    )}
                    {pUser.professionalProfile.specialization && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Specializations: </Text>
                        {pUser.professionalProfile.specialization}
                      </Text>
                    )}
                    {pUser.professionalProfile.qualifications && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Qualifications: </Text>
                        {pUser.professionalProfile.qualifications}
                      </Text>
                    )}
                    {pUser.professionalProfile.licenseIssuedYear && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>License Issued Year: </Text>
                        {pUser.professionalProfile.licenseIssuedYear} 
                        <Text style={[styles.detailLabel, {color: colors.primary, marginLeft: 10}]}>  (Exp: {new Date().getFullYear() - pUser.professionalProfile.licenseIssuedYear} Years)</Text>
                      </Text>
                    )}
                    
                    {(pUser.professionalProfile.licenseFrontImage || pUser.professionalProfile.licenseBackImage) && (
                      <View style={{marginTop: 10}}>
                        <Text style={styles.detailLabel}>License / ID / Driving License Images:</Text>
                        <View style={styles.imageRow}>
                          {pUser.professionalProfile.licenseFrontImage && (
                             <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(pUser.professionalProfile.licenseFrontImage)}>
                               <Text style={styles.imageLabel}>Front Side</Text>
                               <Image source={{uri: pUser.professionalProfile.licenseFrontImage}} style={styles.licenseImg} />
                             </TouchableOpacity>
                          )}
                          {pUser.professionalProfile.licenseBackImage && (
                             <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(pUser.professionalProfile.licenseBackImage)}>
                               <Text style={styles.imageLabel}>Back Side</Text>
                               <Image source={{uri: pUser.professionalProfile.licenseBackImage}} style={styles.licenseImg} />
                             </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                    {(pUser.professionalProfile.idFrontImage || pUser.professionalProfile.idBackImage) && (
                      <View style={{marginTop: 10}}>
                        <Text style={styles.detailLabel}>ID / Document Images:</Text>
                        <View style={styles.imageRow}>
                          {pUser.professionalProfile.idFrontImage && (
                             <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(pUser.professionalProfile.idFrontImage)}>
                               <Text style={styles.imageLabel}>Front Side</Text>
                               <Image source={{uri: pUser.professionalProfile.idFrontImage}} style={styles.licenseImg} />
                             </TouchableOpacity>
                          )}
                          {pUser.professionalProfile.idBackImage && (
                             <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(pUser.professionalProfile.idBackImage)}>
                               <Text style={styles.imageLabel}>Back Side</Text>
                               <Image source={{uri: pUser.professionalProfile.idBackImage}} style={styles.licenseImg} />
                             </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {pUser.pharmacistProfile && (
                  <View style={styles.detailsBox}>
                    {pUser.pharmacistProfile.businessName && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Business Name: </Text>
                        {pUser.pharmacistProfile.businessName}
                      </Text>
                    )}
                    {pUser.pharmacistProfile.licenseNumber && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>License Number: </Text>
                        {pUser.pharmacistProfile.licenseNumber}
                      </Text>
                    )}
                    {pUser.pharmacistProfile.address && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>Address: </Text>
                        {pUser.pharmacistProfile.address}
                      </Text>
                    )}
                    {pUser.pharmacistProfile.licenseIssuedYear && (
                      <Text style={styles.detailText}>
                        <Text style={styles.detailLabel}>License Issued Year: </Text>
                        {pUser.pharmacistProfile.licenseIssuedYear} 
                        <Text style={[styles.detailLabel, {color: colors.primary, marginLeft: 10}]}>  (Exp: {new Date().getFullYear() - pUser.pharmacistProfile.licenseIssuedYear} Years)</Text>
                      </Text>
                    )}
                    {(pUser.pharmacistProfile.licenseFrontImage || pUser.pharmacistProfile.licenseBackImage) && (
                      <View style={{marginTop: 10}}>
                        <Text style={styles.detailLabel}>License Images:</Text>
                        <View style={styles.imageRow}>
                          {pUser.pharmacistProfile.licenseFrontImage && (
                             <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(pUser.pharmacistProfile.licenseFrontImage)}>
                               <Text style={styles.imageLabel}>Front Side</Text>
                               <Image source={{uri: pUser.pharmacistProfile.licenseFrontImage}} style={styles.licenseImg} />
                             </TouchableOpacity>
                          )}
                          {pUser.pharmacistProfile.licenseBackImage && (
                             <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(pUser.pharmacistProfile.licenseBackImage)}>
                               <Text style={styles.imageLabel}>Back Side</Text>
                               <Image source={{uri: pUser.pharmacistProfile.licenseBackImage}} style={styles.licenseImg} />
                             </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                    {(pUser.pharmacistProfile.idFrontImage || pUser.pharmacistProfile.idBackImage) && (
                      <View style={{marginTop: 10}}>
                        <Text style={styles.detailLabel}>ID / Document Images:</Text>
                        <View style={styles.imageRow}>
                          {pUser.pharmacistProfile.idFrontImage && (
                             <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(pUser.pharmacistProfile.idFrontImage)}>
                               <Text style={styles.imageLabel}>Front Side</Text>
                               <Image source={{uri: pUser.pharmacistProfile.idFrontImage}} style={styles.licenseImg} />
                             </TouchableOpacity>
                          )}
                          {pUser.pharmacistProfile.idBackImage && (
                             <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(pUser.pharmacistProfile.idBackImage)}>
                               <Text style={styles.imageLabel}>Back Side</Text>
                               <Image source={{uri: pUser.pharmacistProfile.idBackImage}} style={styles.licenseImg} />
                             </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                )}
                
                <TouchableOpacity style={styles.pdfBtn} onPress={() => downloadUserPDF(pUser)}>
                  <Ionicons name="document-text-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.pdfBtnText}>Download Full Profile as PDF</Text>
                </TouchableOpacity>
                
                <View style={styles.actionRow}>
                  {tab === 'PENDING' ? (
                    <>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(pUser.id, pUser.fullName)}>
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(pUser.id, pUser.fullName)}>
                        <Text style={styles.btnText}>Approve</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={[styles.rejectBtn, {borderColor: colors.primary}]} onPress={() => handleUndoReject(pUser.id, pUser.fullName)}>
                        <Text style={[styles.rejectBtnText, {color: colors.primary}]}>Undo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.approveBtn, {backgroundColor: colors.danger, flex: 2, marginLeft: 10}]} onPress={() => handleDelete(pUser.id, pUser.fullName)}>
                        <Text style={styles.btnText}>Delete User Permanently</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

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
              <Text style={[styles.closeBtnText, {color: '#fff'}]}>Download Image</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedImage(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modern Feedback Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: SIZES.padding },
  center: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginTop: 10 },
  headerSub: { fontSize: 14, color: colors.textLight, marginBottom: 15 },
  tabContainer: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 4, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: SIZES.radius - 4 },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  tabTextActive: { color: '#fff' },
  filterScroll: { flexGrow: 0, marginBottom: 15 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textLight, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: SIZES.radius, paddingHorizontal: 15, marginBottom: 5, height: 45, borderWidth: 1, borderColor: colors.border },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  emptyState: { padding: 40, alignItems: 'center', marginTop: 20 },
  noData: { color: colors.textLight, fontStyle: 'italic', textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 16, marginBottom: 16, elevation: 2, marginTop: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  email: { fontSize: 14, color: colors.textLight, marginTop: 4 },
  detailsBox: { marginTop: 10, padding: 10, backgroundColor: colors.surfaceLight, borderRadius: SIZES.radius },
  detailText: { fontSize: 13, color: colors.text, marginBottom: 4 },
  detailLabel: { fontWeight: 'bold', color: colors.textLight },
  actionRow: { flexDirection: 'row', marginTop: 16, justifyContent: 'flex-end', gap: 10 },
  approveBtn: { backgroundColor: colors.secondary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  rejectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  btnText: { color: '#ffffff', fontWeight: 'bold' },
  rejectBtnText: { color: colors.danger, fontWeight: 'bold' },
  imageRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  imageLabel: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  licenseImg: { width: '100%', height: 100, borderRadius: SIZES.radius, backgroundColor: colors.border },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.8 },
  modalActions: { flexDirection: 'row', position: 'absolute', bottom: 40, gap: 15 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 25 },
  closeBtn: { padding: 12, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 30 },
  closeBtnText: { color: colors.text, fontWeight: 'bold' },
  pdfBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, marginTop: 15 },
  pdfBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});

export default AdminApprovalsScreen;
