import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePushNotifications } from '../hooks/usePushNotifications';
import api from '../api/axios';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const { expoPushToken, notification: pushNotification } = usePushNotifications();

  const prevNotificationsRef = useRef([]);
  const initialFetchDone = useRef(false);

  const [toast, setToast] = useState({ visible: false, title: '', message: '' });
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = (title, message) => {
    setToast({ visible: true, title, message });
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToast({ visible: false, title: '', message: '' }));
      }, 4000);
    });
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await api.get('/notifications');
      const data = response.data;
      
      // Check for genuinely new notifications arriving in real-time
      if (initialFetchDone.current && prevNotificationsRef.current.length > 0 && data.notifications.length > 0) {
        const prevLatest = prevNotificationsRef.current[0];
        const newLatest = data.notifications[0];
        const isRecent = newLatest.createdAt && (Date.now() - new Date(newLatest.createdAt).getTime() < 120000);
        if (prevLatest.id !== newLatest.id && !newLatest.isRead && isRecent) {
          showToast(newLatest.title, newLatest.message);
        }
      }
      initialFetchDone.current = true;
      prevNotificationsRef.current = data.notifications;
      
      setNotifications(data.notifications);
      const unread = data.notifications.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  }, []);

  const sendPushTokenToServer = useCallback(async () => {
    if (!expoPushToken) return;
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      await api.put('/auth/push-token', { expoPushToken });
    } catch (error) {
      console.error('Failed to update push token', error);
    }
  }, [expoPushToken]);

  useEffect(() => {
    fetchNotifications();
    sendPushTokenToServer();
    
    // Set up polling every 5 seconds for unread count
    const interval = setInterval(() => {
      fetchNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchNotifications, sendPushTokenToServer]);

  // If a push notification arrives while app is open, refresh
  useEffect(() => {
    if (pushNotification) {
      fetchNotifications();
    }
  }, [pushNotification, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/read/${id}`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark read', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put(`/notifications/read-all`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all read', error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      unreadCount,
      notifications,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      expoPushToken
    }}>
      {children}
      {toast.visible && (
        <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
          <Text style={styles.toastTitle}>{toast.title}</Text>
          <Text style={styles.toastMessage}>{toast.message}</Text>
        </Animated.View>
      )}
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 40 : 60,
    left: 20,
    right: 20,
    backgroundColor: '#0f172a', // dark blue/gray
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4', // cyan
    zIndex: 9999,
  },
  toastTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  toastMessage: {
    color: '#cbd5e1',
    fontSize: 14,
  }
});
