import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/themeContext';
import { AuthContext } from '../../context/authContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import api from '../../api/axios';
import NotificationBell from '../../components/NotificationBell';
import CustomAlertModal from '../../components/CustomAlertModal';
import MapComponent from '../../components/MapComponent';
import { searchLocationByName } from '../../utils/geocode';

const CATEGORIES = [
  { id: 'UPDATE', label: 'General Update', icon: 'bullhorn' },
  { id: 'AD', label: 'Ad / Offer', icon: 'tag' },
  { id: 'FACILITY', label: 'Facility Photo', icon: 'home' },
  { id: 'EVENT', label: 'Event / Celebration', icon: 'calendar-alt' }
];

const ElderHomeDashboard = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'services' | 'details'

  // Alert Modal State (supports Web & Mobile)
  const [alertConfig, setAlertConfig] = useState({ visible: false, type: 'success', title: '', message: '' });
  const showAlert = (type, title, message) => {
    setAlertConfig({ visible: true, type, title, message });
  };

  const handleLockedFieldPress = (fieldName = 'This detail') => {
    showAlert(
      'error',
      'Locked Field 🔒',
      `${fieldName} is verified by Admin during approval and cannot be modified directly. If you need to make changes, please contact Admin Support.`
    );
  };

  // Post Modal State
  const [postModalVisible, setPostModalVisible] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState('UPDATE');
  const [postImageBase64, setPostImageBase64] = useState(null);
  const [isPublishingPost, setIsPublishingPost] = useState(false);

  // Service Modal State
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceUnit, setServiceUnit] = useState('per month');
  const [isSavingService, setIsSavingService] = useState(false);

  // Profile Details Edit State
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPolicies, setEditPolicies] = useState('');
  const [editFacilities, setEditFacilities] = useState('');
  const [editFacebook, setEditFacebook] = useState('');
  const [editInstagram, setEditInstagram] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Map & Location State
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState({ latitude: 7.8731, longitude: 80.7718, latitudeDelta: 0.1, longitudeDelta: 0.1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchMyProfile();
    }, [])
  );

  const fetchMyProfile = async () => {
    try {
      const res = await api.get('/elder-home/my/profile');
      if (res.data) {
        setProfile(res.data);
        syncEditFields(res.data);
      }
    } catch (err) {
      console.log('Error fetching my profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const syncEditFields = (data) => {
    setEditFullName(data.fullName || '');
    setEditOwnerName(data.specialization || '');
    setEditPhone(data.contactPhone || data.user?.phone || '');
    setEditAddress(data.address || '');
    setEditPolicies(data.policies || '');
    setEditFacilities(data.facilities || '');
    setEditFacebook(data.socialFacebook || '');
    setEditInstagram(data.socialInstagram || '');
    setEditWhatsapp(data.socialWhatsapp || '');
    setEditWebsite(data.socialWebsite || '');
    if (data.locationLat && data.locationLng) {
      setLocationLat(data.locationLat);
      setLocationLng(data.locationLng);
      setSelectedRegion({
        latitude: data.locationLat,
        longitude: data.locationLng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('error', 'Permission Denied', 'Please enable location permissions in your device settings.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setSelectedRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05
      });
    } catch (e) {
      showAlert('error', 'Location Error', 'Failed to retrieve current GPS location.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingLocation(true);
    try {
      const result = await searchLocationByName(searchQuery.trim());
      if (result) {
        setSelectedRegion({
          latitude: result.latitude,
          longitude: result.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        });
      } else {
        showAlert('error', 'Not Found', 'Location not found. Try searching with a broader name or city.');
      }
    } catch (e) {
      showAlert('error', 'Search Error', 'Failed to search location.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleConfirmLocation = async (lat, lng) => {
    setIsUpdatingLocation(true);
    try {
      await api.put('/elder-home/my/profile', {
        locationLat: lat,
        locationLng: lng
      });
      setLocationLat(lat);
      setLocationLng(lng);
      setMapModalVisible(false);
      showAlert('success', 'Location Updated! 📍', 'Your Elder Home location has been successfully pinned on the map.');
      fetchMyProfile();
    } catch (err) {
      showAlert('error', 'Error', err.response?.data?.message || 'Failed to update location.');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyProfile();
  };

  const resolveImage = (imgPath) => {
    if (!imgPath) return null;
    if (imgPath.startsWith('http') || imgPath.startsWith('data:image')) return imgPath;
    const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'http://localhost:5000';
    return `${baseUrl}${imgPath}`;
  };

  // Image Picker for Post
  const pickPostImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setPostImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Image Picker for Cover Photo
  const pickCoverPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await api.put('/elder-home/my/profile', { coverImage: base64Img });
        showAlert('success', 'Cover Banner Updated', 'Your cover photo has been updated successfully.');
        fetchMyProfile();
      }
    } catch (e) {
      showAlert('error', 'Upload Failed', 'Failed to upload cover photo.');
    }
  };

  // Image Picker for Profile Avatar
  const pickProfileAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
        await api.put('/elder-home/my/profile', { profileImage: base64Img });
        showAlert('success', 'Profile Logo Updated', 'Your profile logo has been updated successfully.');
        fetchMyProfile();
      }
    } catch (e) {
      showAlert('error', 'Upload Failed', 'Failed to upload profile photo.');
    }
  };

  // Post Actions
  const handlePublishPost = async () => {
    if (!postContent.trim()) {
      showAlert('error', 'Content Required', 'Please enter some text or description for your post.');
      return;
    }

    setIsPublishingPost(true);
    try {
      await api.post('/elder-home/my/posts', {
        title: postTitle.trim(),
        content: postContent.trim(),
        category: postCategory,
        image: postImageBase64,
      });

      showAlert('success', 'Post Published! 📢', 'Your ad / update has been published to your feed successfully.');
      setPostModalVisible(false);
      setPostTitle('');
      setPostContent('');
      setPostImageBase64(null);
      setPostCategory('UPDATE');
      fetchMyProfile();
    } catch (error) {
      showAlert('error', 'Error', error.response?.data?.message || 'Failed to publish post');
    } finally {
      setIsPublishingPost(false);
    }
  };

  const handleDeletePost = (postId) => {
    const doDelete = async () => {
      try {
        await api.delete(`/elder-home/my/posts/${postId}`);
        showAlert('success', 'Post Deleted', 'The post has been removed successfully.');
        fetchMyProfile();
      } catch (err) {
        showAlert('error', 'Error', 'Failed to delete post.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this post / ad?')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Post',
        'Are you sure you want to delete this post / ad?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete }
        ]
      );
    }
  };

  // Service Actions
  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setServiceName('');
    setServiceDescription('');
    setServicePrice('');
    setServiceUnit('per month');
    setServiceModalVisible(true);
  };

  const handleOpenEditService = (service) => {
    setEditingServiceId(service.id);
    setServiceName(service.name);
    setServiceDescription(service.description || '');
    setServicePrice(service.price ? service.price.toString() : '');
    setServiceUnit(service.priceUnit || 'per month');
    setServiceModalVisible(true);
  };

  const handleSaveService = async () => {
    if (!serviceName.trim()) {
      showAlert('error', 'Required Field', 'Service / package name is required.');
      return;
    }

    setIsSavingService(true);
    try {
      const payload = {
        name: serviceName.trim(),
        description: serviceDescription.trim(),
        price: parseFloat(servicePrice) || 0,
        priceUnit: serviceUnit
      };

      if (editingServiceId) {
        await api.put(`/elder-home/my/services/${editingServiceId}`, payload);
        showAlert('success', 'Package Updated! 🏷️', 'Service package updated successfully.');
      } else {
        await api.post('/elder-home/my/services', payload);
        showAlert('success', 'Package Added! 🏷️', 'New service package added successfully.');
      }

      setServiceModalVisible(false);
      fetchMyProfile();
    } catch (err) {
      showAlert('error', 'Error', err.response?.data?.message || 'Failed to save service');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteService = (serviceId) => {
    const doDelete = async () => {
      try {
        await api.delete(`/elder-home/my/services/${serviceId}`);
        showAlert('success', 'Package Deleted', 'Service package removed successfully.');
        fetchMyProfile();
      } catch (err) {
        showAlert('error', 'Error', 'Failed to delete service.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to remove this service package?')) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Package',
        'Are you sure you want to remove this service package?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete }
        ]
      );
    }
  };

  // Details Save (Only editable operational details)
  const handleSaveDetails = async () => {
    setIsSavingDetails(true);
    try {
      await api.put('/elder-home/my/profile', {
        contactPhone: editPhone.trim(),
        socialWhatsapp: editWhatsapp.trim(),
        socialFacebook: editFacebook.trim(),
        socialInstagram: editInstagram.trim(),
        socialWebsite: editWebsite.trim(),
        facilities: editFacilities.trim(),
        policies: editPolicies.trim()
      });

      showAlert(
        'success',
        'Saved Successfully! 🎉',
        'Elder Home contact numbers, social media links, facilities, and policies have been updated.'
      );
      fetchMyProfile();
    } catch (err) {
      showAlert('error', 'Error', err.response?.data?.message || 'Failed to update details');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const coverUri = resolveImage(profile?.coverImage);
  const profileUri = resolveImage(profile?.profileImage);
  const posts = profile?.elderHomePosts || [];
  const services = profile?.elderHomeServices || [];

  const styles = getStyles(colors);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textLight }}>Loading your Elder Home dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.topBarWelcome}>Elder Home Management</Text>
          <Text style={styles.topBarTitle} numberOfLines={1}>{profile?.fullName || 'My Elder Home'}</Text>
          <TouchableOpacity 
            onPress={() => setMapModalVisible(true)}
            style={{ 
              flexDirection: 'row', 
              alignItems: 'center', 
              marginTop: 4, 
              backgroundColor: locationLat ? '#ea580c18' : '#64748b15', 
              paddingHorizontal: 8, 
              paddingVertical: 3, 
              borderRadius: 10, 
              alignSelf: 'flex-start' 
            }}
          >
            <Ionicons name="location" size={12} color={locationLat ? '#ea580c' : colors.textMuted} />
            <Text style={{ fontSize: 11, color: locationLat ? '#ea580c' : colors.textMuted, marginLeft: 4, fontWeight: '700' }}>
              {locationLat ? 'Location Pinned on Map 📍' : 'Set Location on Map'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity 
            onPress={() => setMapModalVisible(true)}
            style={{ backgroundColor: colors.surface, padding: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border }}
          >
            <Ionicons name="map-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
          <NotificationBell />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Cover Photo Area */}
        <View style={styles.coverArea}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverFallback}>
              <MaterialCommunityIcons name="image-plus" size={36} color="#ffffff" style={{ opacity: 0.8 }} />
              <Text style={styles.coverFallbackText}>Add Cover Banner</Text>
            </View>
          )}

          <TouchableOpacity style={styles.changeCoverBtn} onPress={pickCoverPhoto}>
            <Ionicons name="camera" size={16} color="#ffffff" />
            <Text style={styles.changeCoverText}>Edit Cover</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Avatar & Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={pickProfileAvatar}>
              {profileUri ? (
                <Image source={{ uri: profileUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'E'}
                  </Text>
                </View>
              )}
              <View style={styles.avatarCameraBadge}>
                <Ionicons name="camera" size={12} color="#ffffff" />
              </View>
            </TouchableOpacity>

            <View style={styles.profileMeta}>
              <Text style={styles.profileTitle}>{profile?.fullName}</Text>
              <Text style={styles.profileOwner}>Owner: {profile?.specialization || 'Not set'}</Text>
              <View style={styles.verifiedTag}>
                <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                <Text style={styles.verifiedText}>Approved Facility</Text>
              </View>
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{posts.length}</Text>
              <Text style={styles.metricLabel}>Posts & Ads</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{services.length}</Text>
              <Text style={styles.metricLabel}>Packages</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{profile?.rating ? Number(profile.rating).toFixed(1) : '5.0'} ⭐</Text>
              <Text style={styles.metricLabel}>Rating</Text>
            </View>
          </View>

          {/* Direct Action Chips */}
          <View style={styles.directActionsRow}>
            <TouchableOpacity style={styles.primaryActionBtn} onPress={() => setPostModalVisible(true)}>
              <FontAwesome5 name="plus" size={13} color="#ffffff" />
              <Text style={styles.primaryActionBtnText}>Post Ad / Update</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleOpenAddService}>
              <FontAwesome5 name="tag" size={13} color={colors.primary} />
              <Text style={styles.secondaryActionBtnText}>Add Service</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Management Tabs */}
        <View style={styles.tabNav}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'posts' && styles.tabBtnActive]}
            onPress={() => setActiveTab('posts')}
          >
            <FontAwesome5
              name="newspaper"
              size={14}
              color={activeTab === 'posts' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabBtnText, activeTab === 'posts' && styles.tabBtnTextActive]}>
              My Posts ({posts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'services' && styles.tabBtnActive]}
            onPress={() => setActiveTab('services')}
          >
            <FontAwesome5
              name="hand-holding-heart"
              size={14}
              color={activeTab === 'services' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabBtnText, activeTab === 'services' && styles.tabBtnTextActive]}>
              Packages ({services.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'details' && styles.tabBtnActive]}
            onPress={() => setActiveTab('details')}
          >
            <FontAwesome5
              name="cog"
              size={14}
              color={activeTab === 'details' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabBtnText, activeTab === 'details' && styles.tabBtnTextActive]}>
              Home Info & Rules
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: POSTS & ADS */}
        {activeTab === 'posts' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeading}>Published Ads & Updates</Text>
              <TouchableOpacity
                style={styles.smallAddBtn}
                onPress={() => setPostModalVisible(true)}
              >
                <FontAwesome5 name="plus" size={11} color="#ffffff" />
                <Text style={styles.smallAddBtnText}>New Post</Text>
              </TouchableOpacity>
            </View>

            {posts.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="bullhorn-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyCardTitle}>No Ads or Updates Posted</Text>
                <Text style={styles.emptyCardSub}>
                  Publish photos of your facility, discount offers, daily activities, and admission announcements so patients can see them.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { marginTop: 14 }]}
                  onPress={() => setPostModalVisible(true)}
                >
                  <Text style={styles.primaryActionBtnText}>Post Your First Update</Text>
                </TouchableOpacity>
              </View>
            ) : (
              posts.map((post) => {
                const imgUri = resolveImage(post.imageUrl);
                const postDate = new Date(post.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <View key={post.id} style={styles.postManageCard}>
                    <View style={styles.postManageHeader}>
                      <View style={styles.postCategoryBadge}>
                        <Text style={styles.postCategoryText}>{post.category || 'UPDATE'}</Text>
                      </View>
                      <Text style={styles.postManageDate}>{postDate}</Text>
                      <TouchableOpacity
                        style={styles.postDeleteBtn}
                        onPress={() => handleDeletePost(post.id)}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    {post.title ? <Text style={styles.postManageTitle}>{post.title}</Text> : null}
                    <Text style={styles.postManageContent}>{post.content}</Text>

                    {imgUri ? (
                      <Image source={{ uri: imgUri }} style={styles.postManageImage} resizeMode="cover" />
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: SERVICES & PRICING */}
        {activeTab === 'services' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeading}>Services & Pricing Packages</Text>
              <TouchableOpacity
                style={styles.smallAddBtn}
                onPress={handleOpenAddService}
              >
                <FontAwesome5 name="plus" size={11} color="#ffffff" />
                <Text style={styles.smallAddBtnText}>Add Package</Text>
              </TouchableOpacity>
            </View>

            {services.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="cash-multiple" size={48} color={colors.textMuted} />
                <Text style={styles.emptyCardTitle}>No Packages Listed</Text>
                <Text style={styles.emptyCardSub}>
                  List monthly boarding rates, daycare options, or specialized dementia care packages to help families choose the right care.
                </Text>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, { marginTop: 14 }]}
                  onPress={handleOpenAddService}
                >
                  <Text style={styles.primaryActionBtnText}>Add First Package</Text>
                </TouchableOpacity>
              </View>
            ) : (
              services.map((service) => (
                <View key={service.id} style={styles.serviceManageCard}>
                  <View style={styles.serviceManageHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceManageName}>{service.name}</Text>
                      {service.description ? (
                        <Text style={styles.serviceManageDesc}>{service.description}</Text>
                      ) : null}
                    </View>
                    <View style={styles.serviceManagePriceBox}>
                      <Text style={styles.serviceManagePrice}>
                        Rs. {Number(service.price).toLocaleString()}
                      </Text>
                      <Text style={styles.serviceManageUnit}>{service.priceUnit || 'per month'}</Text>
                    </View>
                  </View>

                  <View style={styles.serviceManageFooter}>
                    <TouchableOpacity
                      style={styles.editServiceBtn}
                      onPress={() => handleOpenEditService(service)}
                    >
                      <Ionicons name="create-outline" size={16} color={colors.primary} />
                      <Text style={styles.editServiceBtnText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteServiceBtn}
                      onPress={() => handleDeleteService(service.id)}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ef4444" />
                      <Text style={styles.deleteServiceBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: DETAILS, POLICIES & SOCIAL LINKS */}
        {activeTab === 'details' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeadingRow}>
              <Text style={styles.sectionHeading}>Policies & Public Profile</Text>
            </View>

            <View style={styles.formCard}>
              {/* Verified Account Notice */}
              <View style={styles.verifiedNoticeCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Ionicons name="shield-checkmark" size={18} color="#0284c7" />
                  <Text style={styles.verifiedNoticeTitle}>Verified Facility Details</Text>
                </View>
                <Text style={styles.verifiedNoticeSub}>
                  Elder Home Name, Owner Name, and Registered Address are verified and locked to prevent misleading information. To modify these details, please contact Admin.
                </Text>
              </View>

              {/* Locked Field: Home Name */}
              <TouchableOpacity activeOpacity={0.7} onPress={() => handleLockedFieldPress('Elder Home Name')}>
                <View style={styles.labelWithLock}>
                  <Text style={styles.formLabel}>Elder Home Name</Text>
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={11} color="#64748b" />
                    <Text style={styles.lockBadgeText}>Locked</Text>
                  </View>
                </View>
                <View style={[styles.formInput, styles.lockedInput]}>
                  <Text style={styles.lockedInputText}>{profile?.fullName || editFullName}</Text>
                  <Ionicons name="lock-closed" size={15} color="#94a3b8" />
                </View>
              </TouchableOpacity>

              {/* Locked Field: Owner Name */}
              <TouchableOpacity activeOpacity={0.7} onPress={() => handleLockedFieldPress('Owner / Manager Name')}>
                <View style={styles.labelWithLock}>
                  <Text style={styles.formLabel}>Owner / Manager Name</Text>
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={11} color="#64748b" />
                    <Text style={styles.lockBadgeText}>Locked</Text>
                  </View>
                </View>
                <View style={[styles.formInput, styles.lockedInput]}>
                  <Text style={styles.lockedInputText}>{profile?.specialization || editOwnerName || 'Not specified'}</Text>
                  <Ionicons name="lock-closed" size={15} color="#94a3b8" />
                </View>
              </TouchableOpacity>

              {/* Locked Field: Address */}
              <TouchableOpacity activeOpacity={0.7} onPress={() => handleLockedFieldPress('Registered Address')}>
                <View style={styles.labelWithLock}>
                  <Text style={styles.formLabel}>Full Address / Location</Text>
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={11} color="#64748b" />
                    <Text style={styles.lockBadgeText}>Locked</Text>
                  </View>
                </View>
                <View style={[styles.formInput, styles.lockedInput, { minHeight: 46, height: 'auto', paddingVertical: 10 }]}>
                  <Text style={styles.lockedInputText}>{profile?.address || editAddress || 'Not specified'}</Text>
                  <Ionicons name="lock-closed" size={15} color="#94a3b8" />
                </View>
              </TouchableOpacity>

              <Text style={styles.formSectionSub}>Contact & Inquiries</Text>

              <Text style={styles.formLabel}>Direct Contact Phone</Text>
              <TextInput
                style={styles.formInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="e.g. +94 77 123 4567"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.formLabel}>WhatsApp Number</Text>
              <TextInput
                style={styles.formInput}
                value={editWhatsapp}
                onChangeText={setEditWhatsapp}
                placeholder="e.g. 94771234567"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textMuted}
              />

              {/* Social Media Links */}
              <Text style={styles.formSectionSub}>Social Media Links</Text>

              <Text style={styles.formLabel}>Facebook Page Link</Text>
              <TextInput
                style={styles.formInput}
                value={editFacebook}
                onChangeText={setEditFacebook}
                placeholder="https://facebook.com/your-page"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.formLabel}>Instagram Profile Link</Text>
              <TextInput
                style={styles.formInput}
                value={editInstagram}
                onChangeText={setEditInstagram}
                placeholder="https://instagram.com/your-account"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.formLabel}>Official Website URL</Text>
              <TextInput
                style={styles.formInput}
                value={editWebsite}
                onChangeText={setEditWebsite}
                placeholder="https://your-elder-home.lk"
                autoCapitalize="none"
                placeholderTextColor={colors.textMuted}
              />

              {/* Facilities & Policies */}
              <Text style={styles.formSectionSub}>Facilities & Living Policies</Text>

              <Text style={styles.formLabel}>Facilities & Amenities</Text>
              <TextInput
                style={[styles.formInput, { height: 80 }]}
                value={editFacilities}
                onChangeText={setEditFacilities}
                placeholder="e.g. 24/7 nursing, doctor visits, dietary meals, AC rooms, garden"
                multiline
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.formLabel}>Admission Policies & Rules</Text>
              <TextInput
                style={[styles.formInput, { height: 90 }]}
                value={editPolicies}
                onChangeText={setEditPolicies}
                placeholder="e.g. Visiting hours, medical certificates needed, trial stay period"
                multiline
                placeholderTextColor={colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.saveAllBtn, isSavingDetails && { opacity: 0.7 }]}
                onPress={handleSaveDetails}
                disabled={isSavingDetails}
              >
                {isSavingDetails ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#ffffff" />
                    <Text style={styles.saveAllBtnText}>Save All Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* CREATE POST MODAL */}
      <Modal visible={postModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Publish Ad or Update</Text>
              <TouchableOpacity onPress={() => setPostModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Category selector */}
              <Text style={styles.modalLabel}>Category</Text>
              <View style={styles.categoryPills}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryPill,
                      postCategory === cat.id && styles.categoryPillActive
                    ]}
                    onPress={() => setPostCategory(cat.id)}
                  >
                    <FontAwesome5
                      name={cat.icon}
                      size={12}
                      color={postCategory === cat.id ? '#ffffff' : colors.text}
                    />
                    <Text
                      style={[
                        styles.categoryPillText,
                        postCategory === cat.id && styles.categoryPillTextActive
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title */}
              <Text style={styles.modalLabel}>Headline / Title (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Special Holiday Admission Offer"
                placeholderTextColor={colors.textMuted}
                value={postTitle}
                onChangeText={setPostTitle}
              />

              {/* Content */}
              <Text style={styles.modalLabel}>Post Content / Announcement *</Text>
              <TextInput
                style={[styles.modalInput, { height: 100 }]}
                placeholder="Write your update, announcement, or advertisement details..."
                placeholderTextColor={colors.textMuted}
                multiline
                value={postContent}
                onChangeText={setPostContent}
              />

              {/* Image Picker */}
              <Text style={styles.modalLabel}>Attach Photo / Banner</Text>
              {postImageBase64 ? (
                <View style={styles.imagePreviewBox}>
                  <Image source={{ uri: postImageBase64 }} style={styles.previewImage} resizeMode="cover" />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setPostImageBase64(null)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.pickImageBtn} onPress={pickPostImage}>
                  <Ionicons name="image-outline" size={24} color={colors.primary} />
                  <Text style={styles.pickImageText}>Choose Photo from Gallery</Text>
                </TouchableOpacity>
              )}

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setPostModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, isPublishingPost && { opacity: 0.7 }]}
                  onPress={handlePublishPost}
                  disabled={isPublishingPost}
                >
                  {isPublishingPost ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Publish</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SERVICE MODAL */}
      <Modal visible={serviceModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingServiceId ? 'Edit Service Package' : 'Add New Service Package'}
              </Text>
              <TouchableOpacity onPress={() => setServiceModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Package Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Full Boarding & Nursing Care"
                placeholderTextColor={colors.textMuted}
                value={serviceName}
                onChangeText={setServiceName}
              />

              <Text style={styles.modalLabel}>Price (LKR) *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 55000"
                keyboardType="numeric"
                placeholderTextColor={colors.textMuted}
                value={servicePrice}
                onChangeText={setServicePrice}
              />

              <Text style={styles.modalLabel}>Billing Frequency / Unit</Text>
              <View style={styles.unitSelectorRow}>
                {['per month', 'per day', 'per week', 'one-time'].map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitChip,
                      serviceUnit === unit && styles.unitChipActive
                    ]}
                    onPress={() => setServiceUnit(unit)}
                  >
                    <Text
                      style={[
                        styles.unitChipText,
                        serviceUnit === unit && styles.unitChipTextActive
                      ]}
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Description & Inclusions</Text>
              <TextInput
                style={[styles.modalInput, { height: 90 }]}
                placeholder="What is included? e.g. 3 meals, doctor checkup, laundry, private AC room"
                placeholderTextColor={colors.textMuted}
                multiline
                value={serviceDescription}
                onChangeText={setServiceDescription}
              />

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setServiceModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, isSavingService && { opacity: 0.7 }]}
                  onPress={handleSaveService}
                  disabled={isSavingService}
                >
                  {isSavingService ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Save Package</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Global Alert Modal for Web & Mobile */}
      <CustomAlertModal
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />

      {/* Map Location Picker Modal */}
      <Modal visible={mapModalVisible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Pin Elder Home Location 📍</Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Patients will see this facility on the Nearby Map</Text>
            </View>
            <TouchableOpacity onPress={() => setMapModalVisible(false)}>
              <Ionicons name="close" size={26} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            {/* Search Bar & Current GPS */}
            <View style={{
              position: 'absolute',
              top: 15,
              left: 15,
              right: 15,
              zIndex: 999,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <View style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'white',
                borderRadius: 25,
                paddingHorizontal: 15,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 5,
              }}>
                <Ionicons name="search" size={18} color="#666" style={{ marginRight: 8 }} />
                <TextInput
                  placeholder="Search city, town or address..."
                  placeholderTextColor="#999"
                  style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: '#333' }}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchLocation}
                  returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
                    <Ionicons name="close-circle" size={16} color="#999" />
                  </TouchableOpacity>
                )}
                {isSearchingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 5 }} />
                ) : (
                  <TouchableOpacity onPress={handleSearchLocation} style={{ marginLeft: 5 }}>
                    <Ionicons name="arrow-forward-circle" size={24} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={{
                  marginLeft: 10,
                  backgroundColor: colors.primary,
                  padding: 12,
                  borderRadius: 25,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                  elevation: 5,
                }}
                onPress={getCurrentLocation}
                disabled={isGettingLocation}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialIcons name="my-location" size={20} color="white" />
                )}
              </TouchableOpacity>
            </View>

            {mapModalVisible && (
              <MapComponent
                selectedRegion={selectedRegion}
                setSelectedRegion={setSelectedRegion}
              />
            )}

            {/* Bottom Confirm Location Card */}
            <View style={{
              position: 'absolute',
              bottom: 25,
              left: 20,
              right: 20,
              backgroundColor: 'rgba(255,255,255,0.96)',
              padding: 16,
              borderRadius: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 6
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#ea580c20', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  <Ionicons name="business" size={20} color="#ea580c" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#0f172a' }}>{profile?.fullName || 'Elder Care Home'}</Text>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>
                    {selectedRegion.latitude.toFixed(4)}, {selectedRegion.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 12, color: '#475569', marginBottom: 14, lineHeight: 16 }}>
                Drag the map pin to mark your exact facility location. Patients in your area can view your profile, photos, and contact you directly.
              </Text>

              <TouchableOpacity
                style={{
                  backgroundColor: '#ea580c',
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  elevation: 2
                }}
                onPress={() => handleConfirmLocation(selectedRegion.latitude, selectedRegion.longitude)}
                disabled={isUpdatingLocation}
              >
                {isUpdatingLocation ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Confirm Elder Home Location 📍</Text>
                )}
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
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBarWelcome: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  coverArea: {
    width: '100%',
    height: 160,
    backgroundColor: colors.primary,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverFallbackText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
  },
  changeCoverBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  changeCoverText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -30,
    marginBottom: 12,
  },
  avatarWrapper: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceLight || colors.background,
    overflow: 'hidden',
    position: 'relative',
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primaryLight || '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.primary,
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileMeta: {
    flex: 1,
    marginLeft: 12,
    marginTop: 24,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  profileOwner: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight || colors.background,
    borderRadius: SIZES.radius,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border,
    height: '80%',
    alignSelf: 'center',
  },
  directActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    gap: 6,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    gap: 6,
  },
  secondaryActionBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabNav: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  tabSection: {
    padding: 16,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  smallAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SIZES.radius,
    gap: 4,
  },
  smallAddBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 10,
  },
  emptyCardSub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  postManageCard: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postManageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postCategoryBadge: {
    backgroundColor: colors.primaryLight || '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  postCategoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
  },
  postManageDate: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 8,
    flex: 1,
  },
  postDeleteBtn: {
    padding: 4,
  },
  postManageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  postManageContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  postManageImage: {
    width: '100%',
    height: 180,
    borderRadius: SIZES.radius,
  },
  serviceManageCard: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  serviceManageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceManageName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  serviceManageDesc: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 4,
    lineHeight: 18,
  },
  serviceManagePriceBox: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  serviceManagePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  serviceManageUnit: {
    fontSize: 11,
    color: colors.textMuted,
  },
  serviceManageFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editServiceBtnText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteServiceBtnText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verifiedNoticeCard: {
    backgroundColor: '#0284c712',
    borderWidth: 1,
    borderColor: '#0284c735',
    borderRadius: SIZES.radius,
    padding: 12,
    marginBottom: 14,
  },
  verifiedNoticeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0369a1',
  },
  verifiedNoticeSub: {
    fontSize: 12,
    color: colors.textLight,
    lineHeight: 17,
  },
  labelWithLock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.border + '60',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  lockBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  lockedInput: {
    backgroundColor: colors.surfaceLight || '#f1f5f9',
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    opacity: 0.9,
  },
  lockedInputText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  formSectionSub: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 18,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  formInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  saveAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    marginTop: 20,
    gap: 8,
  },
  saveAllBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  categoryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight || colors.background,
    gap: 6,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  modalInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },
  imagePreviewBox: {
    position: 'relative',
    height: 160,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    marginTop: 6,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  pickImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: SIZES.radius,
    paddingVertical: 20,
    gap: 8,
    backgroundColor: colors.primaryLight || '#e0f2fe20',
    marginTop: 6,
  },
  pickImageText: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  unitSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight || colors.background,
  },
  unitChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitChipText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '600',
  },
  unitChipTextActive: {
    color: '#ffffff',
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    marginBottom: 6,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: SIZES.radius,
    backgroundColor: colors.surfaceLight || colors.border,
  },
  modalCancelText: {
    color: colors.text,
    fontWeight: 'bold',
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: SIZES.radius,
    backgroundColor: colors.primary,
  },
  modalSubmitText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});

export default ElderHomeDashboard;
