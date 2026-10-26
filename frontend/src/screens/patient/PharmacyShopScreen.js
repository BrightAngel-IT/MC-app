import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Image, Linking, Modal, ScrollView, Dimensions, TextInput } from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';
import { Ionicons } from '@expo/vector-icons';

const PharmacyShopScreen = ({ route, navigation }) => {
  const { pharmacyId, pharmacyName } = route.params;
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCartModal, setShowCartModal] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderFormData, setOrderFormData] = useState({ address: '', phone: '', quantity: '1' });
  const [directOrderProduct, setDirectOrderProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get(`/patient/products`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.log('Error fetching products');
    } finally {
      setLoading(false);
    }
  };

  const handleCall = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Not Available', 'Pharmacy phone number is not available.');
    }
  };

  const handleAddToCart = (product) => {
    const pName = product.pharmacistName || product.pharmacist?.businessName || product.pharmacist?.user?.fullName || 'Pharmacy';
    const pPhone = product.pharmacistPhone || product.pharmacist?.user?.phone;
    let imgUrl = product.imageUrl1 || (product.images && product.images[0]) || null;
    if (imgUrl && !imgUrl.startsWith('http')) {
      imgUrl = `${api.defaults.baseURL.replace('/api', '')}${imgUrl}`;
    }

    if (cart.length > 0 && cart[0].pharmacistId !== product.pharmacistId) {
      Alert.alert('Different Pharmacy', 'You can only add items from one pharmacy at a time. Do you want to clear your cart and add this item?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear & Add', onPress: () => { setCart([{ productId: product.id, name: product.name, price: product.price, quantity: 1, pharmacistId: product.pharmacistId, pharmacistName: pName, pharmacistPhone: pPhone, image: imgUrl }]); setSelectedProduct(null); } }
      ]);
      return;
    }

    setCart([...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1, pharmacistId: product.pharmacistId, pharmacistName: pName, pharmacistPhone: pPhone, image: imgUrl }]);
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const handleDirectOrder = async () => {
    if (!orderFormData.address || !orderFormData.phone || !orderFormData.quantity) {
      Alert.alert('Error', 'Please fill all details.');
      return;
    }

    try {
      await api.post('/patient/prescription/send', {
        pharmacistId: directOrderProduct.pharmacistId || directOrderProduct.pharmacist?.id,
        items: [{ productId: directOrderProduct.id || directOrderProduct.productId, quantity: parseInt(orderFormData.quantity), price: directOrderProduct.price }],
        patientNotes: `Address: ${orderFormData.address}\nContact: ${orderFormData.phone}`
      });
      Alert.alert('Success', 'Order placed successfully! The pharmacy will process it shortly.');
      setShowOrderForm(false);
      setDirectOrderProduct(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to place order.');
    }
  };

  const openOrderForm = (product = null) => {
    setDirectOrderProduct(product);
    setOrderFormData({ ...orderFormData, quantity: product ? '1' : cart.reduce((sum, item) => sum + item.quantity, 0).toString() });
    setShowOrderForm(true);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    Alert.alert(
      "Confirm Order",
      "Are you sure you want to place this order?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Place Order",
          onPress: async () => {
            try {
              await api.post('/patient/prescription/send', {
                pharmacistId: cart[0].pharmacistId,
                items: cart,
                patientNotes: `Address: ${orderFormData.address}\nContact: ${orderFormData.phone}`
              });
              Alert.alert('Success', 'Order placed successfully! The pharmacy will process it shortly.');
              setCart([]);
            } catch (error) {
              Alert.alert('Error', 'Failed to place order.');
            }
          }
        }
      ]
    );
  };

  const renderProduct = ({ item }) => {
    const imageUrl = item.imageUrl1 ? (item.imageUrl1.startsWith('http') ? item.imageUrl1 : `${api.defaults.baseURL.replace('/api', '')}${item.imageUrl1}`) : null;
    const imageUrl2 = item.imageUrl2 ? (item.imageUrl2.startsWith('http') ? item.imageUrl2 : `${api.defaults.baseURL.replace('/api', '')}${item.imageUrl2}`) : null;
    const pharmacistName = item.pharmacist?.businessName || item.pharmacist?.user?.fullName || 'Pharmacy';
    const pharmacistPhone = item.pharmacist?.user?.phone;
    const address = item.pharmacist?.address;

    const images = [];
    if (imageUrl) images.push(imageUrl);
    if (imageUrl2) images.push(imageUrl2);

    const isItemInCart = cart.some(cartItem => cartItem.productId === item.id);

    return (
      <View style={styles.productCard}>
        {pharmacistPhone && (
          <TouchableOpacity onPress={() => handleCall(pharmacistPhone)} style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, backgroundColor: colors.success || '#059669', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 3 }}>
            <Ionicons name="call" size={16} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.productTop} onPress={() => setSelectedProduct({ ...item, images, pharmacistName, pharmacistPhone, address })}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <View style={[styles.productImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="image-outline" size={24} color="#999" />
            </View>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.productPrice}>Rs. {item.price}</Text>
              <Text style={styles.productCategory}>{item.category}</Text>
              {item.stock === 0 && (
                <Text style={{ fontSize: 10, backgroundColor: (colors.error || '#ef4444') + '20', color: colors.error || '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold' }}>Out of Stock</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.pharmacyDetails}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pharmacyName}><Ionicons name="storefront" size={12} /> {pharmacistName}</Text>
            {address && <Text style={styles.pharmacyAddress}>{address}</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>

            <View style={{ flexDirection: 'row', gap: 5 }}>
              <TouchableOpacity
                style={[styles.addBtn, isItemInCart ? { backgroundColor: colors.error || '#ef4444' } : null, { paddingHorizontal: 10 }]}
                onPress={() => isItemInCart ? handleRemoveFromCart(item.id) : handleAddToCart(item)}
                disabled={item.stock === 0 && !isItemInCart}
              >
                <Text style={[styles.addBtnText, isItemInCart ? { color: '#fff' } : null, {textAlign: 'center', fontSize: 12}]}>{isItemInCart ? 'Remove' : (item.stock === 0 ? 'Out of Stock' : 'Add to Cart')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addBtn, { paddingHorizontal: 15, backgroundColor: colors.secondary || '#10b981' }]}
                onPress={() => openOrderForm(item)}
                disabled={item.stock === 0}
              >
                <Text style={[styles.addBtnText, { color: '#fff', textAlign: 'center', fontSize: 12 }]}>Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    )
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
        <Text style={[styles.headerTitle, { marginBottom: 0 }]}>{pharmacyName}</Text>

        <TouchableOpacity style={styles.floatingCartBtn} onPress={() => setShowCartModal(true)}>
          <Ionicons name="cart" size={24} color="#fff" />
          {cart.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cart.reduce((s, i) => s + i.quantity, 0)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for equipments..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : products.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>This pharmacy hasn't listed any products yet.</Text>
        </View>
      ) : (
        <FlatList
          data={products.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()) || p.category?.toLowerCase().includes(searchQuery.toLowerCase()))}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No equipments found matching "{searchQuery}"</Text>
            </View>
          }
        />
      )}


      {showOrderForm && (
        <Modal visible={true} transparent={true} animationType="slide" onRequestClose={() => setShowOrderForm(false)}>
          <View style={styles.modalBg}>
            <View style={[styles.modalContent, { padding: 15 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Order Details</Text>
                <TouchableOpacity onPress={() => setShowOrderForm(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={{ color: colors.text, marginBottom: 5, fontWeight: 'bold' }}>Delivery Address</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginBottom: 15, color: colors.text, backgroundColor: colors.background }}
                placeholder="Enter your full delivery address"
                value={orderFormData.address}
                onChangeText={(text) => setOrderFormData({ ...orderFormData, address: text })}
                multiline
              />

              <Text style={{ color: colors.text, marginBottom: 5, fontWeight: 'bold' }}>Contact Number</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 10, marginBottom: 15, color: colors.text, backgroundColor: colors.background }}
                placeholder="Enter your phone number"
                value={orderFormData.phone}
                onChangeText={(text) => setOrderFormData({ ...orderFormData, phone: text })}
                keyboardType="phone-pad"
              />

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.secondary || '#10b981' }]}
                onPress={handleDirectOrder}
              >
                <Text style={styles.modalBtnText}>Confirm Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {showCartModal && (
        <Modal visible={true} transparent={true} animationType="slide" onRequestClose={() => setShowCartModal(false)}>
          <View style={styles.modalBg}>
            <View style={[styles.modalContent, { padding: 15, maxHeight: '80%' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 10 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Your Cart</Text>
                <TouchableOpacity onPress={() => setShowCartModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {cart.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                  <Ionicons name="cart-outline" size={50} color={colors.textLight} />
                  <Text style={{ color: colors.textLight, marginTop: 10 }}>Cart is empty</Text>
                </View>
              ) : (
                <>
                  <ScrollView style={{ marginBottom: 15 }}>
                    {cart.map((item, index) => {
                      const productDetails = products.find(p => p.id === item.productId);
                      return (
                        <TouchableOpacity
                          key={index}
                          style={{ marginBottom: 10, backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}
                          onPress={() => {
                            if (productDetails) {
                              const images = [];
                              if (productDetails.imageUrl1) images.push(productDetails.imageUrl1.startsWith('http') ? productDetails.imageUrl1 : `${api.defaults.baseURL.replace('/api', '')}${productDetails.imageUrl1}`);
                              if (productDetails.imageUrl2) images.push(productDetails.imageUrl2.startsWith('http') ? productDetails.imageUrl2 : `${api.defaults.baseURL.replace('/api', '')}${productDetails.imageUrl2}`);

                              setSelectedProduct({
                                ...productDetails,
                                images,
                                pharmacistName: item.pharmacistName,
                                pharmacistPhone: item.pharmacistPhone
                              });
                              setShowCartModal(false);
                            }
                          }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 }}>
                            {item.image ? (
                              <Image source={{ uri: item.image }} style={{ width: 40, height: 40, borderRadius: 6, marginRight: 12 }} resizeMode="cover" />
                            ) : (
                              <View style={{ width: 40, height: 40, borderRadius: 6, marginRight: 12, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }}>
                                <Ionicons name="image-outline" size={20} color="#999" />
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: 'bold', color: colors.text }}>{item.name}</Text>
                              <Text style={{ color: colors.textLight, fontSize: 12, marginTop: 2 }}>Rs. {item.price} x {item.quantity}</Text>
                            </View>
                            <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 15 }}>Rs. {item.price * item.quantity}</Text>
                          </View>
                          <View style={{ backgroundColor: colors.primary + '10', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontWeight: 'bold', color: colors.text, fontSize: 11 }}><Ionicons name="storefront" size={12} /> {item.pharmacistName}</Text>
                            {item.pharmacistPhone && (
                              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleCall(item.pharmacistPhone)}>
                                <Ionicons name="call" size={12} color={colors.success || '#059669'} />
                                <Text style={{ color: colors.success || '#059669', fontSize: 11, fontWeight: 'bold' }}>Call</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15, marginBottom: 15 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text }}>Total Amount</Text>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>Rs. {totalAmount.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={() => { setShowCartModal(false); openOrderForm(null); }}>
                    <Text style={styles.modalBtnText}>Proceed to Checkout</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
      )}

      {selectedProduct && (
        <Modal visible={true} transparent={true} animationType="fade" onRequestClose={() => setSelectedProduct(null)}>
          <View style={styles.modalBg}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedProduct(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>

              {selectedProduct.images && selectedProduct.images.length > 0 ? (
                <View style={{ height: 200, marginBottom: 15 }}>
                  <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={true} style={{ width: '100%' }}>
                    {selectedProduct.images.map((img, index) => (
                      <View key={index} style={{ width: Dimensions.get('window').width - 80 }}>
                        <Image source={{ uri: img }} style={[styles.modalImage, { marginBottom: 0 }]} resizeMode="contain" />
                      </View>
                    ))}
                  </ScrollView>
                  {selectedProduct.images.length > 1 && (
                    <Text style={{ textAlign: 'center', fontSize: 10, color: colors.textLight, marginTop: 4 }}>Swipe to see more images <Ionicons name="arrow-forward" size={10} /></Text>
                  )}
                </View>
              ) : (
                <View style={[styles.modalImage, { backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="image-outline" size={50} color="#999" />
                </View>
              )}

              <Text style={styles.modalTitle}>{selectedProduct.name}</Text>
              <Text style={styles.modalCategory}>{selectedProduct.category}</Text>
              <Text style={styles.modalPrice}>Rs. {selectedProduct.price}</Text>
              <Text style={styles.modalDesc}>{selectedProduct.description}</Text>

              <View style={styles.modalPharmacyBox}>
                <Text style={{ fontWeight: 'bold', color: colors.text }}><Ionicons name="storefront" size={14} /> {selectedProduct.pharmacistName}</Text>
                {selectedProduct.address && <Text style={{ color: colors.textLight, fontSize: 12, marginTop: 4 }}>{selectedProduct.address}</Text>}
              </View>

              <View style={{ flexDirection: 'row', gap: 15, marginTop: 20 }}>
                {selectedProduct.pharmacistPhone && (
                  <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.success || '#059669' }]} onPress={() => handleCall(selectedProduct.pharmacistPhone)}>
                    <Ionicons name="call" size={18} color="#fff" />
                    <Text style={styles.modalBtnText}>Call</Text>
                  </TouchableOpacity>
                )}
                {(() => {
                  const isSelectedInCart = cart.some(cartItem => cartItem.productId === selectedProduct.id);
                  return (
                    <TouchableOpacity
                      style={[styles.modalBtn, { flex: 1 }, isSelectedInCart ? { backgroundColor: colors.error || '#ef4444' } : { backgroundColor: colors.primary }]}
                      onPress={() => isSelectedInCart ? handleRemoveFromCart(selectedProduct.id) : handleAddToCart(selectedProduct)}
                      disabled={selectedProduct.stock === 0 && !isSelectedInCart}
                    >
                      <Ionicons name={isSelectedInCart ? "trash" : "cart"} size={18} color="#fff" />
                      <Text style={styles.modalBtnText}>{isSelectedInCart ? 'Remove from Cart' : (selectedProduct.stock === 0 ? 'Out of Stock' : 'Add to Cart')}</Text>
                    </TouchableOpacity>
                  );
                })()}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: SIZES.padding },

  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 15 },

  productCard: { backgroundColor: colors.surface, padding: 12, borderRadius: SIZES.radius, marginBottom: 15, borderWidth: 1, borderColor: colors.border },
  productTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  productImage: { width: 60, height: 60, borderRadius: 8, marginRight: 12 },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  productDesc: { fontSize: 12, color: colors.textLight, marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  productPrice: { fontSize: 15, fontWeight: 'bold', color: colors.primary },
  productCategory: { fontSize: 10, backgroundColor: colors.surfaceLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, color: colors.textMuted },

  pharmacyDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  pharmacyName: { fontSize: 13, fontWeight: 'bold', color: colors.text },
  pharmacyAddress: { fontSize: 11, color: colors.textLight, marginTop: 2 },

  callSmallBtn: { backgroundColor: colors.success || '#059669', padding: 8, borderRadius: SIZES.radius, alignItems: 'center', justifyContent: 'center' },
  addBtn: { backgroundColor: colors.primary + '20', paddingHorizontal: 12, paddingVertical: 8, borderRadius: SIZES.radius, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textLight, fontStyle: 'italic' },

  floatingCartBtn: { backgroundColor: colors.primary, width: 45, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cartBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: 'red', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.surface, padding: 20, borderRadius: 12, width: '100%', position: 'relative' },
  closeModalBtn: { position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 5 },
  modalImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 5 },
  modalCategory: { fontSize: 12, color: colors.primary, marginBottom: 10, fontWeight: 'bold' },
  modalPrice: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
  modalDesc: { fontSize: 14, color: colors.textLight, marginBottom: 20, lineHeight: 22 },
  modalPharmacyBox: { backgroundColor: colors.background, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  modalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 8, gap: 8 },
  modalBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, marginHorizontal: SIZES.padding, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border, marginBottom: 15 },
  searchInput: { flex: 1, marginLeft: 10, color: colors.text, fontSize: 14 }
});

export default PharmacyShopScreen;
