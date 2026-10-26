import 'react-native-gesture-handler';
import React from 'react';
import { AuthProvider } from './src/context/authContext';
import { ThemeProvider } from './src/context/themeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigate/appNavigator';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppNavigator />
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
