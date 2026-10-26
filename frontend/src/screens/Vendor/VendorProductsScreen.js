import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, Alert, ScrollView, Image, Platform } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const VendorProductsScreen = () => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successModal, setSuccessModal] = useState({ visible: false, message: '' });
  
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: 'Equipment',
    stockUnit: 'Pieces',
    image1: null,
    image2: null,
    isprescriptionRequired: false
  });

  const units = ['Pieces', 'mg', 'g', 'ml', 'L', 'Pills'];

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vendor/products');
      setProducts(response.data.products || []);
    } catch (error) {
      console.log('Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = (id) => {
    const executeDelete = async () => {
      try {
        await api.delete(`/vendor/products/${id}`);
        fetchProducts();
        setSuccessModal({ visible: true, message: 'Product deleted successfully!' });
        setTimeout(() => setSuccessModal({ visible: false, message: '' }), 2000);
      } catch (error) {
        const errorMsg = error.response?.data?.message || 'Failed to delete product';
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this product?')) {
        executeDelete();
      }
    } else {
      Alert.alert('Confirm Delete', 'Are you sure you want to delete this product?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: executeDelete }
      ]);
    }
  };

  const handleAddProduct = async () => {
    const nameStr = (formData.name || '').toString().trim();
    const priceStr = (formData.price || '').toString().trim();
    const stockStr = (formData.stock || '').toString().trim();

    if (formData.category === 'Equipment') {
      if (!nameStr || !priceStr || !formData.image1) {
        Alert.alert('Error', 'Product Name, Price, and at least 1 Image are required for Equipment.');
        return;
      }
    } else {
      if (!nameStr || !priceStr || !stockStr || !formData.image1) {
        Alert.alert('Error', 'Product Name, Price, Stock, and at least 1 Image are required for Medicine.');
        return;
      }
    }
    
    try {
      await api.post('/vendor/products', {
        ...formData,
        price: parseFloat(formData.price),
        stock: formData.stock ? parseInt(formData.stock) : 0
      });
      setModalVisible(false);
      setSuccessModal({ visible: true, message: 'Product added successfully!' });
      setFormData({ name: '', description: '', price: '', stock: '', category: 'Equipment', stockUnit: 'Pieces', image1: null, image2: null, isprescriptionRequired: false });
      fetchProducts();
    } catch (error) {
      Alert.alert('Error', 'Failed to add product');
    }
  };

  const pickImage = async (imageKey) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setFormData(prev => ({
        ...prev,
        [imageKey]: `data:image/jpeg;base64,${result.assets[0].base64}`
      }));
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
        {item.imageUrl1 && (
          <Image source={{uri: item.imageUrl1}} style={{width: 60, height: 60, borderRadius: 8}} />
        )}
        <View style={{flex: 1}}>
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{item.name}</Text>
            <TouchableOpacity onPress={() => handleDeleteProduct(item.id)}>
              <MaterialCommunityIcons name="delete-outline" size={20} color={colors.error || '#ef4444'} />
            </TouchableOpacity>
          </View>
          <Text style={styles.productPrice}>Rs. {item.price}</Text>
          <Text style={styles.productDesc}>{item.description}</Text>
        </View>
      </View>
      <View style={[styles.productFooter, item.stock === 0 ? {backgroundColor: (colors.error || '#ef4444') + '20', padding: 8, borderRadius: 5} : null]}>
        {item.stock === 0 ? (
          <Text style={[styles.productStock, {color: colors.error || '#ef4444', fontWeight: 'bold'}]}>Out of Stock</Text>
        ) : (
          <Text style={styles.productStock}>Stock: {item.stock} {item.stockUnit}</Text>
        )}
        <Text style={styles.productCategory}>{item.category}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Products & Ads</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <MaterialCommunityIcons name="plus" size={24} color="#fff" />
          <Text style={styles.addBtnText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {products.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>You haven't added any products or equipment yet.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={{ paddingBottom: 20 }}
          onRefresh={fetchProducts}
          refreshing={loading}
        />
      )}

      {/* Success Modal */}
      <Modal visible={successModal.visible} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContent, {alignItems: 'center', paddingVertical: 40}]}>
            <MaterialCommunityIcons name="check-circle" size={60} color={colors.primary} style={{marginBottom: 15}} />
            <Text style={{fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 10}}>Success!</Text>
            <Text style={{fontSize: 16, color: colors.textLight, marginBottom: 25, textAlign: 'center'}}>{successModal.message}</Text>
            <TouchableOpacity 
              style={[styles.submitBtn, {width: '100%', marginTop: 0, marginBottom: 0}]} 
              onPress={() => setSuccessModal({visible: false, message: ''})}
            >
              <Text style={styles.submitBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product / Ad</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              <Text style={styles.label}>Category</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                {['Equipment', 'Medicine'].map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.catBtn, formData.category === cat && styles.catBtnActive]}
                    onPress={() => setFormData({...formData, category: cat})}
                  >
                    <Text style={[styles.catBtnText, formData.category === cat && { color: '#fff' }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Product Name *</Text>
              <TextInput style={styles.input} value={formData.name} onChangeText={t => setFormData({...formData, name: t})} placeholder="e.g. Wheelchair, Paracetamol" placeholderTextColor={colors.textMuted} />
              
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={formData.description} onChangeText={t => setFormData({...formData, description: t})} placeholder="Product details..." placeholderTextColor={colors.textMuted} />
              
              {/* Product Images (Max 2) */}
              <Text style={styles.label}>Product Images (Max 2)</Text>
              <View style={{flexDirection: 'row', gap: 10, marginBottom: 15}}>
                <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('image1')}>
                  {formData.image1 ? (
                    <Image source={{uri: formData.image1}} style={styles.pickedImage} />
                  ) : (
                    <MaterialCommunityIcons name="camera-plus" size={30} color={colors.primary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.imagePicker} onPress={() => pickImage('image2')}>
                  {formData.image2 ? (
                    <Image source={{uri: formData.image2}} style={styles.pickedImage} />
                  ) : (
                    <MaterialCommunityIcons name="camera-plus" size={30} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Price (Rs.) *</Text>
                  <TextInput 
                    style={styles.input} 
                    keyboardType="numeric" 
                    value={formData.price} 
                    onChangeText={t => setFormData({...formData, price: t})} 
                    onEndEditing={(e) => {
                      const val = parseFloat(e.nativeEvent.text);
                      if (!isNaN(val)) {
                        setFormData({...formData, price: val.toFixed(2)});
                      }
                    }}
                    placeholder="0.00" 
                    placeholderTextColor={colors.textMuted} 
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Stock *</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={formData.stock} onChangeText={t => setFormData({...formData, stock: t})} placeholder="0" placeholderTextColor={colors.textMuted} />
                </View>
              </View>

              {/* Units Selection - Specially for Medicine */}
              {formData.category === 'Medicine' && (
                <>
                  <Text style={styles.label}>Stock Unit</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 15}}>
                    <View style={{flexDirection: 'row', gap: 8}}>
                      {units.map(unit => (
                        <TouchableOpacity 
                          key={unit} 
                          style={[styles.unitBtn, formData.stockUnit === unit && {backgroundColor: colors.primary}]}
                          onPress={() => setFormData({...formData, stockUnit: unit})}
                        >
                          <Text style={[styles.unitBtnText, formData.stockUnit === unit && {color: '#fff'}]}>{unit}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}
              
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddProduct}>
                <Text style={styles.submitBtnText}>Publish Product</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: SIZES.padding, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: SIZES.radius },
  addBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 4 },
  
  productCard: { backgroundColor: colors.surface, padding: 16, borderRadius: SIZES.radius, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  productName: { fontSize: 18, fontWeight: 'bold', color: colors.text, flex: 1 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: colors.primary },
  productDesc: { fontSize: 14, color: colors.textLight, marginBottom: 12 },
  productFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productStock: { fontSize: 12, color: colors.textMuted, backgroundColor: colors.surfaceLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  productCategory: { fontSize: 12, color: colors.secondary, fontWeight: 'bold' },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textLight, fontStyle: 'italic' },
  
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  formContainer: {},
  label: { fontSize: 14, color: colors.textLight, marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius, padding: 12, color: colors.text, marginBottom: 15 },
  catBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.primary },
  catBtnActive: { backgroundColor: colors.primary },
  catBtnText: { color: colors.primary, fontWeight: 'bold' },
  
  imagePicker: { width: 80, height: 80, borderRadius: SIZES.radius, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceLight },
  pickedImage: { width: '100%', height: '100%', borderRadius: SIZES.radius },
  
  unitBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  unitBtnText: { color: colors.textLight, fontSize: 13 },
  
  submitBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: SIZES.radius, alignItems: 'center', marginTop: 10, marginBottom: 30 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});

export default VendorProductsScreen;
