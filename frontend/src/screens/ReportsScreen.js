import React, { useContext, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Platform,
  Alert
} from 'react-native';
import { AuthContext } from '../context/authContext';
import { useTheme } from '../context/themeContext';
import { SIZES } from '../styles/theme';
import api from '../api/axios';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const ReportsScreen = () => {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState('ALL'); // 'ALL', '7D', '30D'
  const [reportTab, setReportTab] = useState('ALL'); // 'ALL', 'APPOINTMENTS', 'PRESCRIPTIONS'

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (user?.role === 'PATIENT') endpoint = '/patient/report';
      else if (['DOCTOR', 'NURSE', 'PARAMEDIC', 'CAREGIVER', 'LAB_TECH'].includes(user?.role)) endpoint = '/professional/report';
      else if (user?.role === 'VENDOR' || user?.role === 'PHARMACIST') endpoint = '/vendor/report';
      else return;

      let queryParams = '';
      if (dateRange !== 'ALL') {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (dateRange === '7D' ? 7 : 30));
        queryParams = `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      }

      const response = await api.get(`${endpoint}${queryParams}`);
      setReportData(response.data);
    } catch (error) {
      console.log('Failed to fetch report', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintOrDownload = () => {
    if (Platform.OS === 'web') {
      window.print();
    } else {
      Alert.alert(
        "Medical Summary", 
        "Report summary generated. You can share or save it via your device's print / share dialog.",
        [{ text: "OK" }]
      );
    }
  };

  const renderPatientReport = () => {
    if (!reportData) return null;
    const stats = reportData.stats || {
      totalAppointments: reportData.appointments?.length || 0,
      completedAppointments: reportData.appointments?.filter(a => a.status === 'COMPLETED').length || 0,
      totalPrescriptions: reportData.prescriptions?.length || 0,
      totalSpend: 0
    };

    const appointments = reportData.appointments || [];
    const prescriptions = reportData.prescriptions || [];

    return (
      <View style={{ paddingHorizontal: 16 }}>
        {/* KPI / Metric Widgets */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Consultations */}
          <View style={[styles.metricCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#dbeafe' }]}>
              <FontAwesome5 name="user-md" size={16} color="#1d4ed8" />
            </View>
            <Text style={styles.metricVal}>{stats.completedAppointments}</Text>
            <Text style={styles.metricLabel}>Visits Completed</Text>
            <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              Total Booked: {stats.totalAppointments}
            </Text>
          </View>

          {/* Card 2: Prescriptions */}
          <View style={[styles.metricCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#dcfce7' }]}>
              <MaterialCommunityIcons name="pill" size={18} color="#15803d" />
            </View>
            <Text style={styles.metricVal}>{stats.totalPrescriptions}</Text>
            <Text style={styles.metricLabel}>Prescriptions</Text>
            <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              Active medical scripts
            </Text>
          </View>

          {/* Card 3: Healthcare Spend */}
          <View style={[styles.metricCard, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#fef08a' }]}>
              <FontAwesome5 name="receipt" size={14} color="#b45309" />
            </View>
            <Text style={[styles.metricVal, { fontSize: 18, color: '#92400e' }]}>
              Rs. {Number(stats.totalSpend || 0).toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>Total Medical Spend</Text>
            <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
              Doctor & visit costs
            </Text>
          </View>
        </View>

        {/* Section Tabs: All, Appointments, Prescriptions */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.sectionTab, reportTab === 'ALL' && styles.sectionTabActive]}
            onPress={() => setReportTab('ALL')}
          >
            <Text style={[styles.sectionTabText, reportTab === 'ALL' && styles.sectionTabTextActive]}>
              All Activities ({appointments.length + prescriptions.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sectionTab, reportTab === 'APPOINTMENTS' && styles.sectionTabActive]}
            onPress={() => setReportTab('APPOINTMENTS')}
          >
            <Text style={[styles.sectionTabText, reportTab === 'APPOINTMENTS' && styles.sectionTabTextActive]}>
              Visits ({appointments.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sectionTab, reportTab === 'PRESCRIPTIONS' && styles.sectionTabActive]}
            onPress={() => setReportTab('PRESCRIPTIONS')}
          >
            <Text style={[styles.sectionTabText, reportTab === 'PRESCRIPTIONS' && styles.sectionTabTextActive]}>
              Prescriptions ({prescriptions.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 1. Appointments Activity Section */}
        {(reportTab === 'ALL' || reportTab === 'APPOINTMENTS') && (
          <View style={{ marginBottom: 20 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <FontAwesome5 name="stethoscope" size={15} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Medical Consultations & Visits</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textLight }}>{appointments.length} records</Text>
            </View>

            {appointments.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={32} color={colors.textLight} />
                <Text style={{ color: colors.textLight, marginTop: 6, fontSize: 13 }}>No consultations found for selected timeframe.</Text>
              </View>
            ) : (
              appointments.map((apt, index) => {
                const isCompleted = apt.status === 'COMPLETED';
                const isPaid = apt.paymentStatus === 'PAID';
                const profName = apt.professional?.user?.fullName || 'Healthcare Provider';
                const profRole = apt.professional?.user?.role || 'DOCTOR';

                return (
                  <View 
                    key={apt.id || index} 
                    style={[styles.reportItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    {/* Header Row */}
                    <View style={styles.itemHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                        <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '18' }]}>
                          <FontAwesome5 name="user-md" size={14} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.providerName, { color: colors.text }]} numberOfLines={1}>
                            {profRole === 'DOCTOR' ? `Dr. ${profName}` : profName}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.textLight }}>
                            {apt.serviceType || 'Home Care Consultation'} • {new Date(apt.scheduledDate).toLocaleDateString()} at {new Date(apt.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badges */}
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[
                          styles.badge, 
                          isCompleted ? styles.badgeSuccess : (apt.status === 'CONFIRMED' ? styles.badgePrimary : styles.badgeWarning)
                        ]}>
                          <Text style={[
                            styles.badgeText, 
                            isCompleted ? styles.textSuccess : (apt.status === 'CONFIRMED' ? styles.textPrimary : styles.textWarning)
                          ]}>
                            {apt.status}
                          </Text>
                        </View>

                        {apt.totalAmount > 0 && (
                          <View style={[styles.badge, isPaid ? styles.badgeSuccess : styles.badgeLight]}>
                            <Text style={[styles.badgeText, isPaid ? styles.textSuccess : styles.textLight]}>
                              {isPaid ? `PAID Rs. ${apt.totalAmount}` : `DUE Rs. ${apt.totalAmount}`}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Symptoms & Clinical Notes */}
                    {apt.symptoms ? (
                      <View style={[styles.noteRow, { backgroundColor: colors.surfaceLight || '#f8fafc' }]}>
                        <Text style={[styles.noteLabel, { color: colors.textLight }]}>Reason / Symptoms:</Text>
                        <Text style={[styles.noteValue, { color: colors.text }]}>{apt.symptoms}</Text>
                      </View>
                    ) : null}

                    {/* Vitals Summary if available */}
                    {apt.vitalsSummary ? (
                      <View style={[styles.vitalsRow, { backgroundColor: '#f0fdfa', borderColor: '#ccfbf1' }]}>
                        <Ionicons name="pulse" size={14} color="#0d9488" style={{ marginRight: 6 }} />
                        <Text style={{ fontSize: 12, color: '#0f766e', fontWeight: '500' }}>
                          Vitals: {apt.vitalsSummary}
                        </Text>
                      </View>
                    ) : null}

                    {/* Prescriptions issued in this appointment */}
                    {apt.prescriptions && apt.prescriptions.length > 0 && (
                      <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary, marginBottom: 4 }}>
                          💊 Prescriptions Issued ({apt.prescriptions.length})
                        </Text>
                        {apt.prescriptions.map((p, pIdx) => (
                          <View key={p.id || pIdx} style={{ marginLeft: 8 }}>
                            {p.items?.map((it, itIdx) => (
                              <Text key={it.id || itIdx} style={{ fontSize: 12, color: colors.text }}>
                                • <Text style={{ fontWeight: '600' }}>{it.medicineName}</Text> ({it.dosage}) - {it.duration}
                              </Text>
                            ))}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* 2. Prescriptions History Section */}
        {(reportTab === 'ALL' || reportTab === 'PRESCRIPTIONS') && (
          <View style={{ marginBottom: 30 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialCommunityIcons name="file-document-outline" size={16} color="#059669" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Prescription History</Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.textLight }}>{prescriptions.length} entries</Text>
            </View>

            {prescriptions.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="pill-off" size={32} color={colors.textLight} />
                <Text style={{ color: colors.textLight, marginTop: 6, fontSize: 13 }}>No prescriptions recorded in this period.</Text>
              </View>
            ) : (
              prescriptions.map((presc, index) => {
                const doctorName = presc.professional?.user?.fullName || 'Doctor';
                return (
                  <View 
                    key={presc.id || index} 
                    style={[styles.reportItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  >
                    <View style={styles.itemHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <View style={[styles.avatarCircle, { backgroundColor: '#ecfdf5' }]}>
                          <MaterialCommunityIcons name="pill" size={16} color="#059669" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.providerName, { color: colors.text }]}>Prescribed by Dr. {doctorName}</Text>
                          <Text style={{ fontSize: 11, color: colors.textLight }}>
                            Issued on: {new Date(presc.issuedAt).toLocaleDateString()} at {new Date(presc.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.badge, styles.badgeSuccess]}>
                        <Text style={[styles.badgeText, styles.textSuccess]}>{presc.status || 'ACTIVE'}</Text>
                      </View>
                    </View>

                    {presc.notes ? (
                      <View style={[styles.noteRow, { backgroundColor: colors.surfaceLight || '#f8fafc' }]}>
                        <Text style={[styles.noteLabel, { color: colors.textLight }]}>Doctor's Advice:</Text>
                        <Text style={[styles.noteValue, { color: colors.text }]}>{presc.notes}</Text>
                      </View>
                    ) : null}

                    {/* Medicines List */}
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text, marginBottom: 4 }}>
                        Medications:
                      </Text>
                      <View style={{ gap: 4 }}>
                        {presc.items && presc.items.length > 0 ? (
                          presc.items.map((item, idx) => (
                            <View 
                              key={item.id || idx} 
                              style={{ 
                                flexDirection: 'row', 
                                justifyContent: 'space-between',
                                backgroundColor: colors.surfaceLight || '#f8fafc',
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 6
                              }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '600', color: colors.text }}>
                                💊 {item.medicineName}
                              </Text>
                              <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '500' }}>
                                {item.dosage} • {item.duration}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={{ fontSize: 12, color: colors.textLight, fontStyle: 'italic' }}>
                            General prescription guidelines provided by doctor.
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Linked Pharmacy Orders if any */}
                    {presc.orders && presc.orders.length > 0 && (
                      <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <Text style={{ fontSize: 11, color: '#059669', fontWeight: 'bold' }}>
                          ✓ Fulfilled by Pharmacy ({presc.orders.length} order dispatch)
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  const renderPharmacistReport = () => {
    if (!reportData) return null;
    return (
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#dbeafe' }]}>
              <FontAwesome5 name="shopping-bag" size={16} color="#1d4ed8" />
            </View>
            <Text style={styles.metricVal}>{reportData.orders?.length || 0}</Text>
            <Text style={styles.metricLabel}>Total Orders</Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#dcfce7' }]}>
              <FontAwesome5 name="money-bill-wave" size={16} color="#15803d" />
            </View>
            <Text style={[styles.metricVal, { color: '#15803d' }]}>
              Rs. {Number(reportData.totalRevenue || 0).toLocaleString()}
            </Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 10, marginBottom: 10 }]}>Recent Orders</Text>
        {reportData.orders?.map((order, index) => (
          <View key={index} style={[styles.reportItemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.listTitle, { color: colors.text }]}>Order #{order.id?.slice(0, 8)} • {new Date(order.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.listSub}>Amount: Rs. {order.totalAmount}</Text>
            <Text style={styles.listDesc}>Status: {order.status}</Text>
          </View>
        ))}
        {reportData.orders?.length === 0 && <Text style={styles.emptyText}>No orders found.</Text>}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Modern Header with Print/Share Button */}
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.headerTitle}>My Health Reports</Text>
          <Text style={styles.headerSub}>Comprehensive medical summary & consultation history</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.printBtn} 
          onPress={handlePrintOrDownload}
          activeOpacity={0.8}
        >
          <Ionicons name="print-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.printBtnText}>Print / PDF</Text>
        </TouchableOpacity>
      </View>

      {/* Timeframe Filter Chips */}
      <View style={styles.filterContainer}>
        {['ALL', '7D', '30D'].map(range => (
          <TouchableOpacity 
            key={range} 
            style={[styles.filterBtn, dateRange === range && styles.filterBtnActive]}
            onPress={() => setDateRange(range)}
          >
            <Text style={[styles.filterBtnText, dateRange === range && styles.filterBtnTextActive]}>
              {range === 'ALL' ? 'All Time' : range === '7D' ? 'Last 7 Days' : 'Last 30 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        user?.role === 'VENDOR' || user?.role === 'PHARMACIST' ? renderPharmacistReport() : renderPatientReport()
      )}
      
      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.padding, 
    paddingTop: Platform.OS === 'ios' ? 60 : 30, 
    backgroundColor: colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border 
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  headerSub: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  
  printBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  printBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },

  filterContainer: { 
    flexDirection: 'row', 
    padding: SIZES.padding, 
    gap: 10, 
    justifyContent: 'center',
    paddingBottom: 12
  },
  filterBtn: { 
    paddingVertical: 7, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    backgroundColor: colors.surfaceLight || '#f1f5f9', 
    borderWidth: 1, 
    borderColor: colors.border 
  },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { color: colors.textLight, fontWeight: '600', fontSize: 13 },
  filterBtnTextActive: { color: '#fff' },

  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap'
  },
  metricCard: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  metricVal: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  metricLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', marginTop: 2 },

  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8
  },
  sectionTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight || '#f1f5f9',
  },
  sectionTabActive: {
    backgroundColor: colors.primary,
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight,
  },
  sectionTabTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold' },

  reportItemCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  providerName: { fontSize: 14, fontWeight: 'bold' },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgePrimary: { backgroundColor: '#dbeafe' },
  badgeWarning: { backgroundColor: '#fef3c7' },
  badgeLight: { backgroundColor: '#f1f5f9' },

  badgeText: { fontSize: 10, fontWeight: 'bold' },
  textSuccess: { color: '#15803d' },
  textPrimary: { color: '#1d4ed8' },
  textWarning: { color: '#b45309' },
  textLight: { color: '#64748b' },

  noteRow: {
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  noteLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  noteValue: { fontSize: 12, lineHeight: 16 },

  vitalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 4,
  },

  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  listSub: { fontSize: 13, color: colors.primary, fontWeight: '500', marginBottom: 4 },
  listDesc: { fontSize: 12, color: colors.textLight },
  emptyText: { color: colors.textLight, fontStyle: 'italic', marginBottom: 20 },
});

export default ReportsScreen;
