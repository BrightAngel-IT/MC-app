import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { AuthContext } from '../context/authContext';
import { useTheme } from '../context/themeContext';
import { SIZES } from '../styles/theme';
import api from '../api/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const CalendarScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { colors } = useTheme();
  
  const [markedDates, setMarkedDates] = useState({});
  const [items, setItems] = useState([]); // full objects
  const [selectedDate, setSelectedDate] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const styles = getStyles(colors);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      let appointments = [];
      let orders = [];

      if (user?.role === 'PATIENT') {
        const res = await api.get('/patient/dashboard?filter=all');
        appointments = res.data.appointments || [];
      } else if (user?.role === 'VENDOR' || user?.role === 'PHARMACIST') {
        const res = await api.get('/vendor/dashboard?filter=all');
        orders = [...(res.data.prescriptionOrders || []), ...(res.data.regularOrders || [])];
      } else if (user?.role === 'ADMIN') {
        // Just return empty for admin for now
      } else {
        // Professionals
        const res = await api.get('/professional/dashboard?filter=all');
        appointments = res.data.appointments || [];
      }

      processCalendarData(appointments, orders);
    } catch (error) {
      console.log('Failed to fetch calendar data', error);
    } finally {
      setRefreshing(false);
    }
  };

  const processCalendarData = (appointments, orders) => {
    let marks = {};
    let allItems = [];

    appointments.forEach(apt => {
      if (!apt.scheduledDate) return;
      const dateStr = apt.scheduledDate.split('T')[0];
      marks[dateStr] = { 
        customStyles: {
          container: { backgroundColor: colors.primary, borderRadius: 8 },
          text: { color: 'white', fontWeight: 'bold' }
        }
      };
      allItems.push({ ...apt, type: 'APPOINTMENT', dateStr });
    });

    orders.forEach(order => {
      const dateStr = order.createdAt.split('T')[0];
      marks[dateStr] = { 
        customStyles: {
          container: { backgroundColor: colors.roles.VENDOR.primary, borderRadius: 8 },
          text: { color: 'white', fontWeight: 'bold' }
        }
      };
      allItems.push({ ...order, type: 'ORDER', dateStr });
    });

    setMarkedDates(marks);
    setItems(allItems);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const renderItem = (item) => {
    if (item.type === 'APPOINTMENT') {
      return (
        <TouchableOpacity 
          key={item.id} 
          style={styles.card}
          onPress={() => {
             // Route appropriately
             if (user.role === 'PATIENT') {
               navigation.navigate('AppointmentsTab', { appointmentId: item.id, action: 'view' });
             } else {
               navigation.navigate('AppointmentsTab', { appointmentId: item.id, action: 'view' });
             }
          }}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Appointment ({item.status})</Text>
            <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
          </View>
          <Text style={styles.cardText}>
            With: {user.role === 'PATIENT' ? item.professional?.user?.fullName : item.patient?.user?.fullName}
          </Text>
          <Text style={styles.cardTime}>
            {new Date(item.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
      );
    }

    if (item.type === 'ORDER') {
      return (
        <TouchableOpacity 
          key={item.id} 
          style={styles.card}
          onPress={() => {
             navigation.navigate('VendorOrders', { orderId: item.id });
          }}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Order ({item.status})</Text>
            <MaterialCommunityIcons name="pill" size={20} color={colors.roles.VENDOR.primary} />
          </View>
          <Text style={styles.cardText}>
            Patient: {item.patient?.user?.fullName}
          </Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const selectedItems = items.filter(item => item.dateStr === selectedDate);

  return (
    <View style={styles.container}>
      <Calendar
        markingType={'custom'}
        onDayPress={onDayPress}
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            ...markedDates[selectedDate],
            customStyles: {
              container: {
                backgroundColor: colors.primary,
                borderWidth: 2,
                borderColor: '#ffffff',
                borderRadius: 8,
              },
              text: {
                color: 'white',
                fontWeight: 'bold'
              }
            }
          }
        }}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.surface,
          textSectionTitleColor: colors.textLight,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#ffffff',
          todayTextColor: colors.primary,
          dayTextColor: colors.text,
          textDisabledColor: colors.border,
          dotColor: colors.primary,
          monthTextColor: colors.text,
          indicatorColor: colors.primary,
        }}
        style={styles.calendar}
      />
      
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          {selectedDate === new Date().toISOString().split('T')[0] ? "Today's Events" : `Events on ${selectedDate}`}
        </Text>
      </View>

      <ScrollView 
        style={styles.scroll} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {selectedItems.length > 0 ? (
          selectedItems.map(renderItem)
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events scheduled for this day.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  calendar: {
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  listHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.background,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: SIZES.radius,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  cardText: {
    fontSize: 14,
    color: colors.textLight,
    marginBottom: 4,
  },
  cardTime: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textLight,
    fontStyle: 'italic',
  }
});

export default CalendarScreen;
