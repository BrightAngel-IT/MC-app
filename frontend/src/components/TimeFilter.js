import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { SIZES } from '../styles/theme';
import { useTheme } from '../context/themeContext';

const TimeFilter = ({ selectedFilter, onSelectFilter }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [modalVisible, setModalVisible] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'today', label: 'Today' },
    { id: 'weekly', label: 'Week' },
    { id: 'monthly', label: 'Month' },
    { id: 'custom', label: 'Custom' }
  ];

  const handleSelect = (id) => {
    if (id === 'custom') {
      setModalVisible(true);
    } else {
      onSelectFilter(id);
    }
  };

  const applyCustom = () => {
    if (!start || !end) {
      Alert.alert('Error', 'Please enter both start and end dates (YYYY-MM-DD)');
      return;
    }
    setModalVisible(false);
    onSelectFilter(`custom&customStart=${start}&customEnd=${end}`);
  };

  const isSelected = (id) => {
    if (id === 'custom' && selectedFilter?.startsWith('custom')) return true;
    return selectedFilter === id;
  };

  return (
    <View style={styles.container}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterBtn,
            isSelected(filter.id) && styles.activeFilterBtn
          ]}
          onPress={() => handleSelect(filter.id)}
        >
          <Text
            style={[
              styles.filterText,
              isSelected(filter.id) && styles.activeFilterText
            ]}
          >
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Custom Date Range</Text>
            
            <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={start} onChangeText={setStart} placeholder="2024-01-01" />
            
            <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={end} onChangeText={setEnd} placeholder="2024-12-31" />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyCustom} style={styles.applyBtn}>
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 5
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  activeFilterBtn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textLight
  },
  activeFilterText: {
    color: '#fff'
  },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, borderRadius: SIZES.radiusLg, padding: 24 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 12 },
  label: { fontSize: 14, color: colors.textLight, marginBottom: 8, marginTop: 15 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text, backgroundColor: colors.background },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 15 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  cancelText: { color: colors.textLight, fontWeight: 'bold' },
  applyBtn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: SIZES.radius },
  applyText: { color: '#fff', fontWeight: 'bold' }
});

export default TimeFilter;
