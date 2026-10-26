import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';
import { FontAwesome5 } from '@expo/vector-icons';

const AdminReportsScreen = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [dateRange, setDateRange] = useState('ALL');

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      let queryParams = '';
      if (dateRange !== 'ALL') {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - (dateRange === '7D' ? 7 : 30));
        queryParams = `?startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      }

      const response = await api.get(`/admin/report${queryParams}`);
      setReportData(response.data);
    } catch (error) {
      console.log('Failed to fetch admin report', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>System Reports</Text>
        <Text style={styles.headerSub}>Overview of platform activity</Text>
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
      ) : reportData && reportData.systemStats ? (
        <View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>System Statistics</Text>
            
            <View style={styles.statBox}>
              <FontAwesome5 name="calendar-check" size={24} color={colors.primary} />
              <View style={{marginLeft: 15}}>
                <Text style={styles.statLabel}>Total Appointments</Text>
                <Text style={styles.statValue}>{reportData.systemStats.totalAppointments}</Text>
              </View>
            </View>

            <View style={styles.statBox}>
              <FontAwesome5 name="file-medical" size={24} color={colors.primary} />
              <View style={{marginLeft: 15}}>
                <Text style={styles.statLabel}>Total Prescriptions</Text>
                <Text style={styles.statValue}>{reportData.systemStats.totalPrescriptions}</Text>
              </View>
            </View>

            <View style={styles.statBox}>
              <FontAwesome5 name="shopping-bag" size={24} color={colors.primary} />
              <View style={{marginLeft: 15}}>
                <Text style={styles.statLabel}>Pharmacy Orders</Text>
                <Text style={styles.statValue}>{reportData.systemStats.totalOrders}</Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>User Registrations (In Period)</Text>
            <View style={styles.summaryRow}>
               <Text style={styles.summaryLabel}>New Patients:</Text>
               <Text style={styles.summaryValue}>{reportData.userStats.newPatients}</Text>
            </View>
             <View style={styles.summaryRow}>
               <Text style={styles.summaryLabel}>New Doctors:</Text>
               <Text style={styles.summaryValue}>{reportData.userStats.newDoctors}</Text>
            </View>
             <View style={styles.summaryRow}>
               <Text style={styles.summaryLabel}>New Nurses:</Text>
               <Text style={styles.summaryValue}>{reportData.userStats.newNurses}</Text>
            </View>
             <View style={styles.summaryRow}>
               <Text style={styles.summaryLabel}>New Lab Techs:</Text>
               <Text style={styles.summaryValue}>{reportData.userStats.newLabTechs}</Text>
            </View>
             <View style={styles.summaryRow}>
               <Text style={styles.summaryLabel}>New Caregivers:</Text>
               <Text style={styles.summaryValue}>{reportData.userStats.newCaregivers}</Text>
            </View>
             <View style={styles.summaryRow}>
               <Text style={styles.summaryLabel}>New Paramedics:</Text>
               <Text style={styles.summaryValue}>{reportData.userStats.newParamedics}</Text>
            </View>
             <View style={styles.summaryRow}>
               <Text style={styles.summaryLabel}>New Pharmacists:</Text>
               <Text style={styles.summaryValue}>{reportData.userStats.newPharmacists}</Text>
            </View>
          </View>
        </View>
      ) : (
        <Text style={styles.emptyText}>Failed to load system reports.</Text>
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
  
  statBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceLight, padding: 15, borderRadius: SIZES.radius, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  statLabel: { fontSize: 14, color: colors.textLight },
  statValue: { fontSize: 22, fontWeight: 'bold', color: colors.text },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 16, color: colors.textLight },
  summaryValue: { fontSize: 16, fontWeight: 'bold', color: colors.text },

  emptyText: { textAlign: 'center', marginTop: 20, color: colors.textLight, fontStyle: 'italic' }
});

export default AdminReportsScreen;
