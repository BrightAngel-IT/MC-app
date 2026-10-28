import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';
import { SIZES } from '../styles/theme';

const CustomAlertModal = ({ 
  visible, 
  type = 'info', 
  title, 
  message, 
  onClose,
  showCancel = false,
  cancelText = 'Cancel',
  confirmText = 'OK',
  onConfirm,
  confirmDestructive = false
}) => {
  const { colors } = useTheme();

  if (!visible) return null;

  const isSuccess = type === 'success';
  const isDanger = type === 'danger' || confirmDestructive;
  const isWarning = type === 'warning';

  let iconName = 'information-circle';
  let iconColor = colors.primary || '#0284c7';

  if (isSuccess) {
    iconName = 'checkmark-circle';
    iconColor = colors.success || '#10b981';
  } else if (isDanger) {
    iconName = 'trash-outline' || 'alert-circle';
    iconColor = colors.danger || '#ef4444';
  } else if (isWarning) {
    iconName = 'alert-circle';
    iconColor = colors.warning || '#f59e0b';
  }

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.alertBox, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconCircle, { backgroundColor: iconColor + '18' }]}>
            <Ionicons name={iconName} size={38} color={iconColor} />
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textLight }]}>{message}</Text>
          
          <View style={styles.buttonRow}>
            {showCancel && (
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: colors.border }]} 
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textLight }]}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[
                styles.button, 
                { backgroundColor: iconColor, flex: showCancel ? 1 : undefined, width: showCancel ? undefined : '100%' }
              ]} 
              onPress={handleConfirm}
            >
              <Text style={styles.buttonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: SIZES.radiusLg,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  button: {
    paddingVertical: 13,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default CustomAlertModal;
