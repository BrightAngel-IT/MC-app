import 'react-native-gesture-handler';
import React from 'react';
import { useFonts } from 'expo-font';
import { Ionicons, FontAwesome5, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthProvider } from './src/context/authContext';
import { ThemeProvider } from './src/context/themeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigate/appNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...FontAwesome5.font,
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
  });

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
