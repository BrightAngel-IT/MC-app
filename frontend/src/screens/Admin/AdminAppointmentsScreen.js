import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  TextInput, 
  Modal, 
  Linking, 
  ScrollView 
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';

const AdminAppointmentsScreen = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApt, setSelectedApt] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/appointments?status=${filterStatus}&search=${searchQuery.trim()}`);
      if (res.data?.appointments) {
        setAppointments(res.data.appointments);
      }
    } catch (err) {
      console.log('Error fetching appointments for admin:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [filterStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAppointments();
  }, [filterStatus, searchQuery]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return { bg: colors.success + '20', text: colors.success, label: 'COMPLETED' };
      case 'CONFIRMED':
      case 'IN_PROGRESS':
        return { bg: colors.primary + '20', text: colors.primary, label: status === 'CONFIRMED' ? 'CONFIRMED (ON THE WAY)' : 'IN PROGRESS' };
      case 'CANCELLED':
        return { bg: colors.danger + '20', text: colors.danger, label: 'CANCELLED' };
      default:
        return { bg: colors.warning + '20', text: colors.warning, label: 'PENDING' };
    }
  };

  const getRoleInfo = (prof) => {
    const role = prof?.user?.role || 'DOCTOR';
    switch (role) {
      case 'NURSE':
        return { icon: 'needle', color: '#06b6d4', label: 'Nurse', prefix: 'Nurse ' };
      case 'CAREGIVER':
        return { icon: 'hand-heart', color: '#10b981', label: 'Caregiver', prefix: '' };
      case 'LAB_TECHNICIAN':
        return { icon: 'flask', color: '#8b5cf6', label: 'Lab Tech', prefix: '' };
      case 'PARAMEDIC':
        return { icon: 'ambulance', color: '#f59e0b', label: 'Paramedic', prefix: '' };
      case 'ELDER_HOME':
        return { icon: 'home-heart', color: '#ec4899', label: 'Elder Home', prefix: '' };
      default:
        return { icon: 'doctor', color: '#2563eb', label: 'Doctor', prefix: 'Dr. ' };
    }
  };

  const renderItem = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const dateObj = new Date(item.scheduledDate);
    const roleInfo = getRoleInfo(item.professional);
    const profName = item.professional?.fullName || item.professional?.user?.fullName || 'Professional';
    const displayName = `${roleInfo.prefix}${profName}`;

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          setSelectedApt(item);
          setDetailModalVisible(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
            <View style={[styles.roleIcon, { backgroundColor: roleInfo.color + '18' }]}>
              <MaterialCommunityIcons name={roleInfo.icon} size={20} color={roleInfo.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.profName} numberOfLines={1}>{displayName}</Text>
                <View style={{ backgroundColor: roleInfo.color + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: roleInfo.color }}>{roleInfo.label}</Text>
                </View>
              </View>
              <Text style={styles.serviceType}>{item.serviceType || `${roleInfo.label} Visit`}</Text>
            </View>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={15} color={colors.textLight} />
            <Text style={styles.infoLabel}>Patient:</Text>
            <Text style={styles.infoValue}>{item.patient?.fullName || item.patient?.user?.fullName || 'Patient'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={15} color={colors.textLight} />
            <Text style={styles.infoLabel}>Scheduled:</Text>
            <Text style={styles.infoValue}>
              {dateObj.toLocaleDateString()} at {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={15} color={colors.textLight} />
            <Text style={styles.infoLabel}>Fee & Method:</Text>
            <Text style={[styles.infoValue, { fontWeight: 'bold', color: colors.primary }]}>
              Rs. {item.totalAmount || 0} ({item.paymentMethod || 'CASH'})
            </Text>
          </View>

          {item.prescriptions && item.prescriptions.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
              <MaterialCommunityIcons name="pill" size={14} color="#059669" />
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#059669', marginLeft: 4 }}>
                Prescription Issued ({item.prescriptions.length}) 💊
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={{ fontSize: 12, color: colors.primary, fontWeight: 'bold' }}>View Full Audit Details 🔍</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointments & Visits Audit</Text>
        <Text style={styles.headerSub}>Real-time monitoring, prescriptions & dispute resolution</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by Patient, Doctor or Service..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={fetchAppointments}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => { setSearchQuery(''); fetchAppointments(); }}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
        {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((st) => (
          <TouchableOpacity
            key={st}
            style={[styles.filterChip, filterStatus === st && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setFilterStatus(st)}
          >
            <Text style={[styles.filterChipText, filterStatus === st && { color: '#ffffff', fontWeight: 'bold' }]}>
              {st}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Appointments List */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textLight, marginTop: 10 }}>Loading appointments...</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={60} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No Appointments Found</Text>
              <Text style={{ color: colors.textLight, fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                No appointment matches the selected filter status.
              </Text>
            </View>
          }
        />
      )}

      {/* Detail & Audit Modal */}
      <Modal visible={detailModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Appointment Overview</Text>
                <Text style={{ fontSize: 12, color: colors.textLight }}>ID: {selectedApt?.id?.substring(0, 13)}...</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} contentContainerStyle={{ paddingVertical: 10 }}>
              {selectedApt && (
                <>
                  {/* Status Banner */}
                  <View style={[styles.detailStatusBanner, { backgroundColor: getStatusBadge(selectedApt.status).bg }]}>
                    <Text style={{ fontWeight: 'bold', color: getStatusBadge(selectedApt.status).text, fontSize: 14 }}>
                      Current Status: {getStatusBadge(selectedApt.status).label}
                    </Text>
                  </View>

                  {/* Patient Details */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Patient Information 👤</Text>
                    <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Name: </Text>{selectedApt.patient?.fullName || selectedApt.patient?.user?.fullName}</Text>
                    <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Email: </Text>{selectedApt.patient?.user?.email || 'N/A'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                      <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Phone: </Text>{selectedApt.patient?.user?.phone || 'Not provided'}</Text>
                      {selectedApt.patient?.user?.phone && (
                        <TouchableOpacity 
                          onPress={() => Linking.openURL(`tel:${selectedApt.patient.user.phone}`)}
                          style={{ marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.primary + '18', borderRadius: 4 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary }}>Call Patient 📞</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Professional Details */}
                  {(() => {
                    const profRole = getRoleInfo(selectedApt.professional);
                    const profName = selectedApt.professional?.fullName || selectedApt.professional?.user?.fullName || 'Professional';
                    return (
                      <View style={styles.detailSection}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={styles.detailSectionTitle}>Assigned Professional</Text>
                          <View style={{ backgroundColor: profRole.color + '18', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: profRole.color }}>{profRole.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Name: </Text>{profRole.prefix}{profName}</Text>
                        <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Category / Role: </Text>{profRole.label}</Text>
                        {selectedApt.professional?.specialization && (
                          <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Specialization: </Text>{selectedApt.professional.specialization}</Text>
                        )}
                        {selectedApt.professional?.workingHospital && (
                          <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Hospital / Workplace: </Text>{selectedApt.professional.workingHospital}</Text>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Phone: </Text>{selectedApt.professional?.user?.phone || 'Not provided'}</Text>
                          {selectedApt.professional?.user?.phone && (
                            <TouchableOpacity 
                              onPress={() => Linking.openURL(`tel:${selectedApt.professional.user.phone}`)}
                              style={{ marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: profRole.color + '18', borderRadius: 4 }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: 'bold', color: profRole.color }}>Call {profRole.label} 📞</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })()}

                  {/* Appointment Logistics */}
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Service & Visit Logistics 📍</Text>
                    <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Scheduled Time: </Text>{new Date(selectedApt.scheduledDate).toLocaleString()}</Text>
                    <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Service Type: </Text>{selectedApt.serviceType}</Text>
                    <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Total Fee: </Text>Rs. {selectedApt.totalAmount} ({selectedApt.paymentMethod || 'CASH'})</Text>
                    <Text style={styles.detailText}><Text style={{ fontWeight: 'bold' }}>Payment Status: </Text>{selectedApt.paymentStatus}</Text>
                    
                    {selectedApt.symptoms && (
                      <View style={{ marginTop: 6, padding: 8, backgroundColor: colors.background, borderRadius: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text }}>Reported Symptoms / Reason:</Text>
                        <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>{selectedApt.symptoms}</Text>
                      </View>
                    )}

                    {selectedApt.locationLat && selectedApt.locationLng && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${selectedApt.locationLat},${selectedApt.locationLng}`)}
                        style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '18', padding: 8, borderRadius: 6, alignSelf: 'flex-start' }}
                      >
                        <Ionicons name="map" size={15} color={colors.primary} />
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>View Patient Location on Map</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Issued Prescriptions & Medicine Orders */}
                  <View style={styles.detailSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={styles.detailSectionTitle}>Issued Prescriptions & Medicines 💊</Text>
                      <View style={{ backgroundColor: selectedApt.prescriptions?.length > 0 ? '#10b98120' : '#64748b20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: selectedApt.prescriptions?.length > 0 ? '#059669' : '#64748b' }}>
                          {selectedApt.prescriptions?.length || 0} Issued
                        </Text>
                      </View>
                    </View>

                    {selectedApt.prescriptions && selectedApt.prescriptions.length > 0 ? (
                      selectedApt.prescriptions.map((p, idx) => (
                        <View key={p.id || idx} style={{ marginTop: 6, padding: 10, backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text }}>
                            Prescription #{idx + 1} • {new Date(p.issuedAt).toLocaleDateString()}
                          </Text>
                          {p.notes && (
                            <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2, fontStyle: 'italic' }}>
                              Notes: "{p.notes}"
                            </Text>
                          )}

                          {p.items && p.items.length > 0 && (
                            <View style={{ marginTop: 6, paddingLeft: 4 }}>
                              <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.textMuted }}>Prescribed Medicines:</Text>
                              {p.items.map((m, mIdx) => (
                                <Text key={m.id || mIdx} style={{ fontSize: 12, color: colors.text, marginTop: 2 }}>
                                  • <Text style={{ fontWeight: 'bold' }}>{m.medicineName}</Text> ({m.dosage} - {m.duration})
                                </Text>
                              ))}
                            </View>
                          )}

                          {p.orders && p.orders.length > 0 && (
                            <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                              <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary }}>
                                Sent to Pharmacy: {p.orders[0]?.pharmacist?.businessName || 'Partner Pharmacy'} ({p.orders[0]?.status})
                              </Text>
                            </View>
                          )}
                        </View>
                      ))
                    ) : (
                      <Text style={{ fontSize: 12, color: colors.textLight, fontStyle: 'italic' }}>
                        No prescription has been issued yet for this appointment.
                      </Text>
                    )}
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalOkBtn, { backgroundColor: colors.primary }]}
              onPress={() => setDetailModalVisible(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Close Overview</Text>
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
    padding: SIZES.padding,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: 40,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerSub: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterScroll: {
    maxHeight: 40,
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  serviceType: {
    fontSize: 12,
    color: colors.textLight,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  cardBody: {
    gap: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textLight,
    width: 85,
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 16,
    padding: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  detailStatusBanner: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
  },
  detailSection: {
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailText: {
    fontSize: 13,
    color: '#334155',
    marginBottom: 3,
  },
  modalOkBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});

export default AdminAppointmentsScreen;
