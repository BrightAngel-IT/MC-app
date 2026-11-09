import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, LANGUAGES } from '../i18n';

export const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const [loadingLanguage, setLoadingLanguage] = useState(true);

  useEffect(() => {
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('appLanguage');
      if (savedLang && (savedLang === 'en' || savedLang === 'si' || savedLang === 'ta')) {
        setLanguageState(savedLang);
      }
    } catch (e) {
      console.log('Failed to load language preference', e);
    } finally {
      setLoadingLanguage(false);
    }
  };

  const changeLanguage = async (newLang) => {
    try {
      if (newLang === 'en' || newLang === 'si' || newLang === 'ta') {
        setLanguageState(newLang);
        await AsyncStorage.setItem('appLanguage', newLang);
      }
    } catch (e) {
      console.log('Failed to save language', e);
    }
  };

  /**
   * Translate a key with optional dynamic parameter replacements
   * Example: t('appointment_today_desc', { count: 3 })
   */
  const t = (key, params = {}) => {
    const langDict = translations[language] || translations.en;
    let text = langDict[key] || translations.en[key] || key;

    if (params && typeof params === 'object') {
      Object.keys(params).forEach((paramKey) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey]);
      });
    }

    return text;
  };

  if (loadingLanguage) return null;

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

