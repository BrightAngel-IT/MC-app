import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/themeContext';
import { SIZES } from '../styles/theme';

const LanguageSelectorModal = ({ visible, onClose }) => {
  const { language, changeLanguage, languages, t } = useLanguage();
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <TouchableOpacity 
          style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={1}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="language" size={20} color={colors.primary} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>{t('select_language')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Languages List */}
          <View style={{ paddingVertical: 8 }}>
            {languages.map((langItem) => {
              const isSelected = language === langItem.code;
              return (
                <TouchableOpacity
                  key={langItem.code}
                  style={[
                    styles.langItem,
                    { borderColor: isSelected ? colors.primary : colors.border },
                    isSelected && { backgroundColor: colors.primary + '12' }
                  ]}
                  onPress={() => {
                    changeLanguage(langItem.code);
                    onClose();
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 24 }}>{langItem.flag}</Text>
                    <View>
                      <Text style={[styles.langNative, { color: isSelected ? colors.primary : colors.text }]}>
                        {langItem.nativeLabel}
                      </Text>
                      <Text style={[styles.langSub, { color: colors.textLight }]}>
                        {langItem.label}
                      </Text>
                    </View>
                  </View>

                  <View style={[
                    styles.radioCircle,
                    { borderColor: isSelected ? colors.primary : colors.border },
                    isSelected && { backgroundColor: colors.primary }
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const LanguageSwitchButton = ({ compact = false, style }) => {
  const { language, languages } = useLanguage();
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <>
      <TouchableOpacity
        style={[
          styles.switchBtn,
          { backgroundColor: colors.surfaceLight || '#f1f5f9', borderColor: colors.border },
          compact && styles.compactBtn,
          style
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="globe-outline" size={compact ? 16 : 18} color={colors.primary} />
        <Text style={[styles.btnText, { color: colors.text }]}>
          {compact ? currentLang.nativeLabel : `${currentLang.flag} ${currentLang.nativeLabel}`}
        </Text>
        <Ionicons name="chevron-down" size={12} color={colors.textLight} />
      </TouchableOpacity>

      <LanguageSelectorModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
};

export default LanguageSelectorModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  langItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginVertical: 6,
  },
  langNative: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  langSub: {
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  compactBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

