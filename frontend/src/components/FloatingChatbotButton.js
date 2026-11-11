import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/themeContext';

const FloatingChatbotButton = ({ bottomOffset = 24 }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  // Playful Jumping Animation
  const jumpAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        // Jump Up
        Animated.timing(jumpAnim, {
          toValue: -14,
          duration: 350,
          useNativeDriver: true,
        }),
        // Land Down
        Animated.timing(jumpAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        // Small Bounce Up
        Animated.timing(jumpAnim, {
          toValue: -6,
          duration: 200,
          useNativeDriver: true,
        }),
        // Land Back Down
        Animated.timing(jumpAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        // Rest Pause between jumps
        Animated.delay(1800),
      ])
    ).start();
  }, [jumpAnim]);

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          bottom: bottomOffset,
          transform: [{ translateY: jumpAnim }]
        }
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        style={[styles.floatingChatBtn, { backgroundColor: colors.primary || '#6366f1' }]}
        onPress={() => navigation.navigate('Chatbot')}
        activeOpacity={0.85}
      >
        <MaterialCommunityIcons name="robot" size={26} color="#fff" />
        <View style={styles.chatBadge}>
          <View style={styles.onlineDot} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default FloatingChatbotButton;

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  floatingChatBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#a5b4fc',
  },
  chatBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#fff',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#6366f1',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
});

