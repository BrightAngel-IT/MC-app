import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/authContext';
import { useTheme } from '../context/themeContext';
import { SIZES } from '../styles/theme';
import api from '../api/axios';
import { FontAwesome5 } from '@expo/vector-icons';

const ReportsScreen = () => {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState('ALL'); // 'ALL', '7D', '30D'

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (user?.role === 'PATIENT') endpoint = '/patient/report';
      else if (['DOCTOR', 'NURSE', 'PARAMEDIC'].includes(user?.role)) endpoint = '/professional/report';
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

  const renderPatientOrProfReport = () => {
    if (!reportData) return null;
    return (
      <View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Report Summary</Text>
          <View style={styles.summaryRow}>
             <Text style={styles.summaryLabel}>Total Appointments:</Text>
             <Text style={styles.summaryValue}>{reportData.appointments?.length || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
             <Text style={styles.summaryLabel}>Total Prescriptions:</Text>
             <Text style={styles.summaryValue}>{reportData.prescriptions?.length || 0}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Appointments History</Text>
        {reportData.appointments?.map((apt, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listTitle}>Date: {new Date(apt.scheduledDate).toLocaleDateString()}</Text>
            <Text style={styles.listSub}>Status: {apt.status}</Text>
            {apt.symptoms && <Text style={styles.listDesc}>Symptoms: {apt.symptoms}</Text>}
          </View>
        ))}
        {reportData.appointments?.length === 0 && <Text style={styles.emptyText}>No appointments found.</Text>}

        <Text style={styles.sectionTitle}>Prescriptions History</Text>
        {reportData.prescriptions?.map((presc, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listTitle}>Issued: {new Date(presc.issuedAt).toLocaleDateString()}</Text>
            {presc.notes && <Text style={styles.listSub}>Notes: {presc.notes}</Text>}
            <View style={{marginTop: 5}}>
              {presc.items?.map((item, idx) => (
                <Text key={idx} style={styles.listDesc}>• {item.medicineName} - {item.dosage}</Text>
              ))}
            </View>
          </View>
        ))}
        {reportData.prescriptions?.length === 0 && <Text style={styles.emptyText}>No prescriptions found.</Text>}
      </View>
    );
  };

  const renderPharmacistReport = () => {
    if (!reportData) return null;
    return (
      <View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Sales Summary</Text>
          <View style={styles.summaryRow}>
             <Text style={styles.summaryLabel}>Total Orders:</Text>
             <Text style={styles.summaryValue}>{reportData.orders?.length || 0}</Text>
          </View>
          <View style={styles.summaryRow}>
             <Text style={styles.summaryLabel}>Total Revenue:</Text>
             <Text style={styles.summaryValue}>Rs. {reportData.totalRevenue?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Orders</Text>
        {reportData.orders?.map((order, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.listTitle}>Date: {new Date(order.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.listSub}>Amount: Rs. {order.totalAmount}</Text>
            <Text style={styles.listSub}>Status: {order.status}</Text>
          </View>
        ))}
        {reportData.orders?.length === 0 && <Text style={styles.emptyText}>No orders found.</Text>}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Reports</Text>
        <Text style={styles.headerSub}>Filter and view your activity</Text>
      </View>

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
        <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 50}} />
      ) : (
        user?.role === 'VENDOR' || user?.role === 'PHARMACIST' ? renderPharmacistReport() : renderPatientOrProfReport()
      )}
      
      <View style={{height: 50}} />
    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: SIZES.padding, paddingTop: 60, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: colors.text },
  headerSub: { fontSize: 14, color: colors.textLight, marginTop: 4 },
  
  filterContainer: { flexDirection: 'row', padding: SIZES.padding, gap: 10, justifyContent: 'center' },
  filterBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
  filterBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterBtnText: { color: colors.textLight, fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },

  summaryCard: { margin: SIZES.padding, padding: 20, backgroundColor: colors.surface, borderRadius: SIZES.radius, elevation: 2, borderWidth: 1, borderColor: colors.border },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginBottom: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 16, color: colors.textLight },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginHorizontal: SIZES.padding, marginTop: 10, marginBottom: 10 },
  listItem: { marginHorizontal: SIZES.padding, marginBottom: 10, padding: 15, backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  listSub: { fontSize: 14, color: colors.primary, fontWeight: '500', marginBottom: 4 },
  listDesc: { fontSize: 14, color: colors.textLight },
  emptyText: { marginHorizontal: SIZES.padding, color: colors.textLight, fontStyle: 'italic', marginBottom: 20 },
});

export default ReportsScreen;
