import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Linking, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/themeContext';
import api from '../../api/axios';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { SIZES } from '../../styles/theme';

const ParamedicSOS = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const [sosRequests, setSosRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSOS = async () => {
    try {
      const res = await api.get('/professional/sos');
      setSosRequests(res.data.activeSOS || []);
    } catch (error) {
      console.log('Error fetching SOS', error);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSOS();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSOS();
  };

  const handleNavigate = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open maps.');
    });
  };

  const handleAccept = async (id) => {
    Alert.alert('Accept SOS', 'Are you sure you want to accept this request and navigate to the patient?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Accept', 
        style: 'default',
        onPress: async () => {
          try {
            await api.post(`/professional/sos/${id}/accept`);
            Alert.alert('Success', 'SOS request accepted!');
            fetchSOS();
          } catch (error) {
            Alert.alert('Error', 'Failed to accept SOS.');
          }
        }
      }
    ]);
  };

  const renderSOS = ({ item }) => {
    const isEmergency = item.status === 'TRIGGERED_EMERGENCY';
    const bgColor = isEmergency ? colors.error + '20' : colors.primary + '20';
    const iconColor = isEmergency ? colors.error : colors.primary;
    
    return (
      <View style={[styles.card, { borderLeftColor: iconColor }]}>
        <View style={styles.cardHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
              <FontAwesome5 name={isEmergency ? "ambulance" : "car"} size={20} color={iconColor} />
            </View>
            <View style={{marginLeft: 10}}>
              <Text style={styles.patientName}>{item.patient?.user?.fullName || 'Unknown Patient'}</Text>
              <Text style={[styles.typeText, { color: iconColor }]}>
                {isEmergency ? 'CRITICAL EMERGENCY' : 'TRANSPORT REQUEST'}
              </Text>
            </View>
          </View>
          <Text style={styles.timeText}>
            {new Date(item.triggeredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} 
            onPress={() => handleNavigate(item.locationLat, item.locationLng)}
          >
            <Ionicons name="map" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>View Map</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: colors.success || '#059669' }]} 
            onPress={() => handleAccept(item.id)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#fff" />
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Accept Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Active SOS Alerts</Text>
      
      <FlatList
        data={sosRequests}
        keyExtractor={item => item.id}
        renderItem={renderSOS}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="check-circle" size={50} color={colors.success || '#059669'} />
            <Text style={styles.emptyText}>No active SOS requests right now.</Text>
            <Text style={styles.emptySubtext}>You're all caught up!</Text>
          </View>
        }
      />
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: SIZES.padding,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  iconBox: {
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
    color: colors.textLight,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    gap: 8,
  },
  actionBtnText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textLight,
    marginTop: 5,
  }
});

export default ParamedicSOS;
