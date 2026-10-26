import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SIZES } from '../styles/theme';
import { useTheme } from '../context/themeContext';

const RecentsList = ({ items, title, renderItem, onSeeAll }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {!items || items.length === 0 ? (
        <Text style={{ color: colors.textLight, fontStyle: 'italic', paddingVertical: 10 }}>No recent activities found.</Text>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => (
            <View key={item.id || index}>
              {renderItem(item)}
            </View>
          ))}
        </View>
      )}
      {items.length >= 7 && onSeeAll && (
        <TouchableOpacity style={styles.seeAllBtn} onPress={onSeeAll}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  list: {
    gap: 12,
  },
  seeAllBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: SIZES.radius,
  },
  seeAllText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  }
});

export default RecentsList;
