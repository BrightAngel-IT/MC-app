import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // 100% Web Safe: If running on Web Browser, gracefully skip native push listeners
    if (Platform.OS === 'web') {
      return;
    }

    let isMounted = true;

    // Dynamically require native expo modules only on mobile (prevents any web bundling issues)
    const Notifications = require('expo-notifications');
    const Device = require('expo-device');
    const Constants = require('expo-constants').default;

    // Set notification presentation options (sound, alert, badge)
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    async function registerForPushNotificationsAsync() {
      let token = null;

      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('Push notification permission not granted.');
          return null;
        }

        // Setup Android Notification Channels:
        // 1. Standard Medical Notifications
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Medical Care Notifications',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#0891b2',
            sound: 'default',
          });

          // 2. High-Priority Siren Emergency SOS Channel (Louder & Urgent Vibration)
          await Notifications.setNotificationChannelAsync('emergency-sos', {
            name: 'Emergency SOS Alerts',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 500, 250, 500, 250, 500],
            lightColor: '#ef4444',
            sound: 'default',
            bypassDnd: true, // Rings even in Do Not Disturb if allowed
            enableVibrate: true,
          });
        }

        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

        try {
          const tokenRes = await Notifications.getExpoPushTokenAsync({ projectId });
          token = tokenRes.data;
          console.log('Real Push Token registered:', token);
        } catch (e) {
          console.log('Error getting push token:', e);
        }
      } else {
        console.log('Notice: Physical device is required for push notifications.');
      }

      return token;
    }

    registerForPushNotificationsAsync().then(tok => {
      if (isMounted && tok) {
        setExpoPushToken(tok);
      }
    });

    // Foreground notification listener
    notificationListener.current = Notifications.addNotificationReceivedListener(notif => {
      if (isMounted) setNotification(notif);
    });

    // Notification tapped listener
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped by user:', response);
    });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  return { expoPushToken, notification };
}
