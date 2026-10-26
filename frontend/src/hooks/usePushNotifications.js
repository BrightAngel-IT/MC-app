import { useState } from 'react';

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('dummy-token-for-localhost');
  const [notification, setNotification] = useState(null);

  return { expoPushToken, notification };
}
