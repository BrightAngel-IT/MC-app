import React, { createContext, useState, useEffect, useContext } from 'react';
import { darkTheme, lightTheme } from '../styles/theme';

import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false); // Default to light mode as per corporate styling preference
  const [loadingTheme, setLoadingTheme] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themePref');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
      }
    } catch (e) {
      console.log('Failed to load theme preference', e);
    } finally {
      setLoadingTheme(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('themePref', newTheme ? 'dark' : 'light');
    } catch (e) {
      console.log('Failed to save theme', e);
    }
  };

  const colors = isDarkMode ? darkTheme : lightTheme;

  if (loadingTheme) return null;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
