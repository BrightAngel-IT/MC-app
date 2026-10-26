import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TimeFilter from '../../components/TimeFilter';
import RecentsList from '../../components/RecentsList';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import NotificationBell from '../../components/NotificationBell';

const AdminOverviewScreen = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation();
  
  const [stats, setStats] = useState({
    patients: 0,
    doctors: 0,
    vendors: 0,
    pending: 0,
    total: 0
  });
  const [recents, setRecents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState('all');
  const [distanceCharge, setDistanceCharge] = useState('50');
  const [updatingSettings, setUpdatingSettings] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/settings');
      if (res.data.DISTANCE_CHARGE_PER_KM) setDistanceCharge(res.data.DISTANCE_CHARGE_PER_KM);
    } catch(err) { console.log("Settings error", err); }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get(`/admin/stats?filter=${timeFilter}`);
      setStats(response.data.stats);
      setRecents(response.data.recents || []);
    } catch (error) {
      console.log('Failed to fetch stats', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchSettings();
    }, [timeFilter])
  );

  
  const handleUpdateSettings = async () => {
    try {
      setUpdatingSettings(true);
      await api.put('/admin/settings', { key: 'DISTANCE_CHARGE_PER_KM', value: distanceCharge });
      Alert.alert('Success', 'Settings updated successfully');
    } catch(err) {
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setUpdatingSettings(false);
    }
  };
  
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStats();
  }, [timeFilter]);

  const StatCard = ({ title, value, icon, color, onPress }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <MaterialCommunityIcons name={icon} size={32} color={color} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardValue}>{value}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderRecentItem = (user) => (
    <TouchableOpacity style={styles.recentItem} activeOpacity={0.7} onPress={() => navigation.navigate('Users')}>
      <View>
        <Text style={styles.recentName}>{user.fullName}</Text>
        <Text style={styles.recentSub}>{user.role} • {new Date(user.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={[styles.statusBadge, user.verificationStatus === 'APPROVED' ? styles.bgSuccess : (user.verificationStatus === 'PENDING' ? styles.bgWarning : styles.bgDanger)]}>
        <Text style={styles.statusText}>{user.verificationStatus}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View>
          <Text style={styles.headerTitle}>Overview Dashboard</Text>
          <Text style={styles.headerSub}>System statistics and summary</Text>
        </View>
        <NotificationBell />
      </View>

      <TimeFilter selectedFilter={timeFilter} onSelectFilter={setTimeFilter} />

      <Text style={styles.sectionTitle}>User Statistics</Text>
      <View style={styles.grid}>
        <StatCard title="Total Users" value={stats.total} icon="account-group" color={colors.primary} onPress={() => navigation.navigate('Users')} />
        <StatCard title="Patients" value={stats.patients} icon="account-injury" color={colors.roles?.PATIENT?.primary || '#0891b2'} onPress={() => navigation.navigate('Users')} />
        <StatCard title="Professionals" value={stats.doctors} icon="doctor" color={colors.roles?.DOCTOR?.primary || '#2563eb'} onPress={() => navigation.navigate('Users')} />
        <StatCard title="Pharmacies" value={stats.vendors} icon="store" color={colors.roles?.PHARMACIST?.primary || '#0d9488'} onPress={() => navigation.navigate('Users')} />
      </View>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Verification Status</Text>
      <View style={styles.grid}>
        <StatCard title="Pending" value={stats.pending} icon="clock-outline" color={colors.warning} onPress={() => navigation.navigate('Approvals', { filter: 'PENDING' })} />
        <StatCard title="Approved" value={stats.approved} icon="check-circle-outline" color={colors.success} onPress={() => navigation.navigate('Users', { filter: 'APPROVED' })} />
        <StatCard title="Rejected" value={stats.rejected} icon="close-circle-outline" color={colors.error} onPress={() => navigation.navigate('Approvals', { filter: 'REJECTED' })} />
        <StatCard title="Visits Audit" value="Inspect" icon="clipboard-check" color="#8b5cf6" onPress={() => navigation.navigate('Appointments')} />
      </View>

      <RecentsList 
        title="Recent Users" 
        items={recents} 
        renderItem={renderRecentItem} 
        onSeeAll={() => navigation.navigate('Users')} 
      />

    </ScrollView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: SIZES.padding },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  header: { marginTop: 40, marginBottom: 20 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: colors.primary },
  headerSub: { fontSize: 14, color: colors.textLight, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: colors.surface, borderRadius: SIZES.radius, padding: 15, marginBottom: 15, elevation: 2, borderWidth: 1, borderColor: colors.border },
  iconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardText: {},
  cardValue: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  cardTitle: { fontSize: 14, color: colors.textLight, marginTop: 4 },
  
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.surface, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border },
  recentName: { fontSize: 14, fontWeight: 'bold', color: colors.text },
  recentSub: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  bgWarning: { backgroundColor: colors.warning + '20' },
  bgSuccess: { backgroundColor: colors.success + '20' },
  bgDanger: { backgroundColor: colors.danger + '20' },
  statusText: { fontSize: 10, fontWeight: 'bold', color: colors.text },
});

export default AdminOverviewScreen;
