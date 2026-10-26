import React, { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, TextInput, Linking } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';
import { Ionicons } from '@expo/vector-icons';

const AdminUsersScreen = ({ route, navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('APPROVED');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const { colors } = useTheme();
  const styles = getStyles(colors);

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

  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.verificationStatus === statusFilter;
    const matchesSearch = u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesStatus && matchesSearch;
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
        contentContainerStyle={{padding: SIZES.padding}}
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
                {u.professionalProfile.qualifications && (
                  <Text style={styles.detailText}>
                    <Text style={styles.detailLabel}>Qualifications: </Text>
                    {u.professionalProfile.qualifications}
                  </Text>
                )}

                
                {(u.professionalProfile.idFrontImage || u.professionalProfile.idBackImage) && (
                  <View style={{marginTop: 10}}>
                    <Text style={styles.detailLabel}>ID / Document Images:</Text>
                    <View style={styles.imageRow}>
                      {u.professionalProfile.idFrontImage && (
                         <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(u.professionalProfile.idFrontImage)}>
                           <Text style={styles.imageLabel}>Front Side</Text>
                           <Image source={{uri: u.professionalProfile.idFrontImage}} style={styles.licenseImg} />
                         </TouchableOpacity>
                      )}
                      {u.professionalProfile.idBackImage && (
                         <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(u.professionalProfile.idBackImage)}>
                           <Text style={styles.imageLabel}>Back Side</Text>
                           <Image source={{uri: u.professionalProfile.idBackImage}} style={styles.licenseImg} />
                         </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
{(u.professionalProfile.licenseFrontImage || u.professionalProfile.licenseBackImage) && (
                  <View style={{marginTop: 10}}>
                    <Text style={styles.detailLabel}>License / ID / Driving License Images:</Text>
                    <View style={styles.imageRow}>
                      {u.professionalProfile.licenseFrontImage && (
                         <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(u.professionalProfile.licenseFrontImage)}>
                           <Text style={styles.imageLabel}>Front Side</Text>
                           <Image source={{uri: u.professionalProfile.licenseFrontImage}} style={styles.licenseImg} />
                         </TouchableOpacity>
                      )}
                      {u.professionalProfile.licenseBackImage && (
                         <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(u.professionalProfile.licenseBackImage)}>
                           <Text style={styles.imageLabel}>Back Side</Text>
                           <Image source={{uri: u.professionalProfile.licenseBackImage}} style={styles.licenseImg} />
                         </TouchableOpacity>
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
                         <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(u.pharmacistProfile.idFrontImage)}>
                           <Text style={styles.imageLabel}>Front Side</Text>
                           <Image source={{uri: u.pharmacistProfile.idFrontImage}} style={styles.licenseImg} />
                         </TouchableOpacity>
                      )}
                      {u.pharmacistProfile.idBackImage && (
                         <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(u.pharmacistProfile.idBackImage)}>
                           <Text style={styles.imageLabel}>Back Side</Text>
                           <Image source={{uri: u.pharmacistProfile.idBackImage}} style={styles.licenseImg} />
                         </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
{(u.pharmacistProfile.licenseFrontImage || u.pharmacistProfile.licenseBackImage) && (
                  <View style={{marginTop: 10}}>
                    <Text style={styles.detailLabel}>License Images:</Text>
                    <View style={styles.imageRow}>
                      {u.pharmacistProfile.licenseFrontImage && (
                         <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(u.pharmacistProfile.licenseFrontImage)}>
                           <Text style={styles.imageLabel}>Front Side</Text>
                           <Image source={{uri: u.pharmacistProfile.licenseFrontImage}} style={styles.licenseImg} />
                         </TouchableOpacity>
                      )}
                      {u.pharmacistProfile.licenseBackImage && (
                         <TouchableOpacity style={{flex: 1}} onPress={() => setSelectedImage(u.pharmacistProfile.licenseBackImage)}>
                           <Text style={styles.imageLabel}>Back Side</Text>
                           <Image source={{uri: u.pharmacistProfile.licenseBackImage}} style={styles.licenseImg} />
                         </TouchableOpacity>
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
        <TouchableWithoutFeedback onPress={() => setSelectedImage(null)}>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <Image source={{uri: selectedImage}} style={styles.fullImage} resizeMode="contain" />
              <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedImage(null)}>
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: SIZES.padding },
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
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', height: '80%', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '100%' },
  closeBtn: { marginTop: 20, padding: 10, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 30 },
  closeBtnText: { color: colors.text, fontWeight: 'bold' }
});

export default AdminUsersScreen;
