import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Share,
  Platform,
  Alert,
  Modal
} from 'react-native';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../api/axios';

const ElderHomeDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const rawParam = route.params?.elderHome;
  const elderHomeParam = (rawParam && typeof rawParam === 'object') ? rawParam : {};
  const elderHomeId = route.params?.id || route.params?.elderHomeId || elderHomeParam.id || elderHomeParam.userId;

  const [elderHome, setElderHome] = useState(elderHomeParam);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts' | 'services' | 'policies' | 'about'
  const [selectedImageUri, setSelectedImageUri] = useState(null);

  useEffect(() => {
    fetchElderHomeDetail();
  }, [elderHomeId]);

  const fetchElderHomeDetail = async () => {
    try {
      if (!elderHomeId) return;
      const res = await api.get(`/elder-home/${elderHomeId}`);
      if (res.data) {
        setElderHome(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.log('Error fetching elder home details:', err);
    } finally {
      setLoading(false);
    }
  };

  const phone = elderHome.contactPhone || elderHome.user?.phone;
  const whatsappNumber = elderHome.socialWhatsapp || phone;

  const handleCall = () => {
    if (!phone) {
      Alert.alert('Notice', 'No contact phone number provided by this facility.');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsApp = () => {
    if (!whatsappNumber) {
      Alert.alert('Notice', 'No WhatsApp number available for this facility.');
      return;
    }
    const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(`Hello ${elderHome.fullName || ''}, I found your elder home on Bright Angle Healthcare App and would like to inquire about admission.`);
    Linking.openURL(`https://wa.me/${cleanNumber}?text=${message}`).catch(() => {
      Alert.alert('Error', 'Unable to open WhatsApp.');
    });
  };

  const handleOpenLink = (url) => {
    if (!url) return;
    const finalUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(finalUrl).catch(() => {
      Alert.alert('Error', 'Could not open the link.');
    });
  };

  const handleShare = async (title, content) => {
    try {
      await Share.share({
        message: `${elderHome.fullName || 'Elder Home'} - ${title || 'Update'}\n${content || ''}\nContact: ${phone || ''}`,
      });
    } catch (e) {}
  };

  const resolveImage = (imgPath) => {
    if (!imgPath) return null;
    let url = imgPath;
    if (url.includes('localhost:5000')) {
      url = url.replace('http://localhost:5000', 'https://mcbackend.crescereluna.com');
    }
    if (url.startsWith('http') || url.startsWith('data:image')) return url;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    const baseUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'https://mcbackend.crescereluna.com';
    return `${baseUrl}${cleanPath}`;
  };

  const coverUri = resolveImage(elderHome.coverImage);
  const profileUri = resolveImage(elderHome.profileImage);

  const posts = elderHome.elderHomePosts || [];
  const services = elderHome.elderHomeServices || [];

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Cover Photo / Banner */}
        <View style={styles.coverContainer}>
          {coverUri ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setSelectedImageUri(coverUri)} style={{ width: '100%', height: '100%' }}>
              <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <View style={styles.coverFallback}>
              <MaterialCommunityIcons name="home-heart" size={54} color="#ffffff" style={{ opacity: 0.8 }} />
              <Text style={styles.coverFallbackText}>{elderHome.fullName || 'Elder Care Facility'}</Text>
            </View>
          )}
          <View style={styles.coverBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#10b981" />
            <Text style={styles.coverBadgeText}>Verified Care Facility</Text>
          </View>
        </View>

        {/* Header Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => profileUri && setSelectedImageUri(profileUri)}
              style={styles.avatarContainer}
            >
              {profileUri ? (
                <Image source={{ uri: profileUri }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {elderHome.fullName ? elderHome.fullName.charAt(0).toUpperCase() : 'E'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text style={styles.homeName}>{elderHome.fullName || 'Elder Home'}</Text>
              {elderHome.specialization ? (
                <Text style={styles.ownerSubtitle}>Owner / In-charge: {elderHome.specialization}</Text>
              ) : null}
              <View style={styles.ratingRow}>
                <View style={styles.ratingBadge}>
                  <FontAwesome5 name="star" solid size={11} color="#f59e0b" />
                  <Text style={styles.ratingText}>{elderHome.rating ? Number(elderHome.rating).toFixed(1) : '5.0'}</Text>
                </View>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.typeTag}>Boarding & Senior Living</Text>
              </View>
            </View>
          </View>

          {/* Location & Address */}
          {(elderHome.address || elderHome.workingHospital) && (
            <View style={styles.addressRow}>
              <Ionicons name="location-sharp" size={16} color={colors.primary} />
              <Text style={styles.addressText}>{elderHome.address || elderHome.workingHospital}</Text>
            </View>
          )}

          {/* Social Links Row */}
          <View style={styles.socialRow}>
            {elderHome.socialFacebook && (
              <TouchableOpacity
                style={[styles.socialChip, { backgroundColor: '#1877F215', borderColor: '#1877F240' }]}
                onPress={() => handleOpenLink(elderHome.socialFacebook)}
              >
                <FontAwesome5 name="facebook" size={14} color="#1877F2" />
                <Text style={[styles.socialChipText, { color: '#1877F2' }]}>Facebook</Text>
              </TouchableOpacity>
            )}

            {elderHome.socialInstagram && (
              <TouchableOpacity
                style={[styles.socialChip, { backgroundColor: '#E1306C15', borderColor: '#E1306C40' }]}
                onPress={() => handleOpenLink(elderHome.socialInstagram)}
              >
                <FontAwesome5 name="instagram" size={14} color="#E1306C" />
                <Text style={[styles.socialChipText, { color: '#E1306C' }]}>Instagram</Text>
              </TouchableOpacity>
            )}

            {elderHome.socialWebsite && (
              <TouchableOpacity
                style={[styles.socialChip, { backgroundColor: '#0284c715', borderColor: '#0284c740' }]}
                onPress={() => handleOpenLink(elderHome.socialWebsite)}
              >
                <Ionicons name="globe-outline" size={14} color="#0284c7" />
                <Text style={[styles.socialChipText, { color: '#0284c7' }]}>Website</Text>
              </TouchableOpacity>
            )}

            {phone && (
              <TouchableOpacity
                style={[styles.socialChip, { backgroundColor: '#10b98115', borderColor: '#10b98140' }]}
                onPress={handleCall}
              >
                <Ionicons name="call" size={13} color="#10b981" />
                <Text style={[styles.socialChipText, { color: '#10b981' }]}>{phone}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.actionGrid}>
            <TouchableOpacity style={styles.callActionBtn} onPress={handleCall}>
              <Ionicons name="call" size={18} color="#ffffff" />
              <Text style={styles.callActionText}>Direct Call</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.whatsappActionBtn} onPress={handleWhatsApp}>
              <FontAwesome5 name="whatsapp" size={18} color="#ffffff" />
              <Text style={styles.whatsappActionText}>WhatsApp Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'posts' && styles.tabItemActive]}
            onPress={() => setActiveTab('posts')}
          >
            <FontAwesome5
              name="newspaper"
              size={14}
              color={activeTab === 'posts' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === 'posts' && styles.tabLabelActive]}>
              Updates ({posts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'services' && styles.tabItemActive]}
            onPress={() => setActiveTab('services')}
          >
            <FontAwesome5
              name="hand-holding-heart"
              size={14}
              color={activeTab === 'services' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === 'services' && styles.tabLabelActive]}>
              Services & Fees ({services.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'policies' && styles.tabItemActive]}
            onPress={() => setActiveTab('policies')}
          >
            <FontAwesome5
              name="clipboard-list"
              size={14}
              color={activeTab === 'policies' ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.tabLabel, activeTab === 'policies' && styles.tabLabelActive]}>
              Policies & Rules
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Updates & Ads Feed */}
        {activeTab === 'posts' && (
          <View style={styles.tabContent}>
            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="newspaper-variant-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No Updates Yet</Text>
                <Text style={styles.emptySub}>
                  This elder home hasn't published any photos, ads, or announcements yet. Contact them directly for recent updates.
                </Text>
              </View>
            ) : (
              posts.map((post) => {
                const postImgUri = resolveImage(post.imageUrl);
                const createdDate = new Date(post.createdAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                });

                return (
                  <View key={post.id} style={styles.postCard}>
                    {/* Post Card Header */}
                    <View style={styles.postHeader}>
                      <View style={styles.postAuthorInfo}>
                        <View style={styles.postMiniAvatar}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>
                            {elderHome.fullName?.charAt(0) || 'E'}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.postAuthorName}>{elderHome.fullName}</Text>
                          <Text style={styles.postDate}>{createdDate}</Text>
                        </View>
                      </View>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{post.category || 'UPDATE'}</Text>
                      </View>
                    </View>

                    {/* Post Title */}
                    {post.title ? <Text style={styles.postTitle}>{post.title}</Text> : null}

                    {/* Post Content */}
                    <Text style={styles.postContent}>{post.content}</Text>

                    {/* Post Image */}
                    {postImgUri ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => setSelectedImageUri(postImgUri)}
                        style={{ width: '100%', marginBottom: 10 }}
                      >
                        <Image source={{ uri: postImgUri }} style={styles.postImage} resizeMode="cover" />
                        <View style={styles.tapToViewBadge}>
                          <Ionicons name="scan-outline" size={13} color="#ffffff" />
                          <Text style={styles.tapToViewText}>Tap to view</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}

                    {/* Post Footer Actions */}
                    <View style={styles.postFooter}>
                      <TouchableOpacity
                        style={styles.postFooterBtn}
                        onPress={() => handleShare(post.title, post.content)}
                      >
                        <Ionicons name="share-social-outline" size={16} color={colors.textLight} />
                        <Text style={styles.postFooterBtnText}>Share</Text>
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.postFooterBtn} onPress={handleWhatsApp}>
                        <FontAwesome5 name="whatsapp" size={15} color="#10b981" />
                        <Text style={[styles.postFooterBtnText, { color: '#10b981' }]}>Inquire via WhatsApp</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Tab 2: Services & Pricing */}
        {activeTab === 'services' && (
          <View style={styles.tabContent}>
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color={colors.primary} />
              <Text style={styles.infoBannerText}>
                Elder Home stays and packages are subject to availability and elderly care assessment. Contact the management to arrange an in-person tour.
              </Text>
            </View>

            {services.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="tag-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Custom Packages Available</Text>
                <Text style={styles.emptySub}>
                  Standard boarding, nursing care, and day-care packages are tailored on request. Please call the home directly.
                </Text>
              </View>
            ) : (
              services.map((service) => (
                <View key={service.id} style={styles.serviceCard}>
                  <View style={styles.serviceHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      {service.description ? (
                        <Text style={styles.serviceDescription}>{service.description}</Text>
                      ) : null}
                    </View>
                    <View style={styles.servicePriceBox}>
                      <Text style={styles.servicePrice}>
                        Rs. {Number(service.price).toLocaleString()}
                      </Text>
                      <Text style={styles.serviceUnit}>{service.priceUnit || 'per month'}</Text>
                    </View>
                  </View>

                  <View style={styles.serviceFooter}>
                    <TouchableOpacity
                      style={styles.serviceInquireBtn}
                      onPress={() => {
                        const cleanNumber = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, '') : '';
                        const msg = encodeURIComponent(`Hello, I am inquiring about the "${service.name}" package (Rs. ${service.price} ${service.priceUnit}) at ${elderHome.fullName}.`);
                        if (cleanNumber) {
                          Linking.openURL(`https://wa.me/${cleanNumber}?text=${msg}`);
                        } else {
                          handleCall();
                        }
                      }}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.primary} />
                      <Text style={styles.serviceInquireBtnText}>Inquire for this Package</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Tab 3: Policies & Facilities */}
        {activeTab === 'policies' && (
          <View style={styles.tabContent}>
            {/* Facilities Box */}
            <View style={styles.policySection}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons name="check-decagram" size={20} color={colors.primary} />
                <Text style={styles.sectionHeaderTitle}>Facilities & Amenities</Text>
              </View>
              <Text style={styles.policyBody}>
                {elderHome.facilities ||
                  '• 24/7 Professional Caregiver & Nursing Assistance\n• Daily Doctor Visits & Medical Monitoring\n• Nutritious, Hygienic & Custom Diabetic/Dietary Meals\n• Spacious Rooms with Attached Bathrooms\n• Wheelchair Friendly & Emergency Alarm Systems\n• Peaceful Garden & Recreational Activities'}
              </Text>
            </View>

            {/* Admission & Living Policies Box */}
            <View style={styles.policySection}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="document-text" size={20} color="#f59e0b" />
                <Text style={styles.sectionHeaderTitle}>Admission & Visiting Policies</Text>
              </View>
              <Text style={styles.policyBody}>
                {elderHome.policies ||
                  '1. Initial medical health report / doctor summary required prior to admission.\n2. Family visiting hours: 9:00 AM – 12:00 PM and 4:00 PM – 7:00 PM.\n3. Prescribed medications must be provided along with relevant medical prescriptions.\n4. Prior appointment recommended for trial stay or facility visits.\n5. Peaceful and respectful community atmosphere maintained at all times.'}
              </Text>
            </View>

            {/* Admission Process Info */}
            <View style={styles.stepBox}>
              <Text style={styles.stepBoxTitle}>How to Enroll an Elder?</Text>
              <View style={styles.stepItem}>
                <View style={styles.stepCircle}><Text style={styles.stepNum}>1</Text></View>
                <Text style={styles.stepText}>Contact the Elder Home via Direct Call or WhatsApp to discuss availability.</Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepCircle}><Text style={styles.stepNum}>2</Text></View>
                <Text style={styles.stepText}>Schedule an on-site visit to inspect rooms, facilities, and staff care.</Text>
              </View>
              <View style={styles.stepItem}>
                <View style={styles.stepCircle}><Text style={styles.stepNum}>3</Text></View>
                <Text style={styles.stepText}>Submit medical documents and finalize admission agreements directly.</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Contact Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomHomeName} numberOfLines={1}>{elderHome.fullName}</Text>
          <Text style={styles.bottomStatusText}>Direct Admission & Boarding</Text>
        </View>

        <TouchableOpacity style={styles.bottomCallBtn} onPress={handleCall}>
          <Ionicons name="call" size={18} color="#ffffff" />
          <Text style={styles.bottomCallBtnText}>Call Home</Text>
        </TouchableOpacity>
      </View>

      {/* Full-screen Image Viewer Modal */}
      <Modal
        visible={!!selectedImageUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageUri(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerCloseBtn}
            onPress={() => setSelectedImageUri(null)}
          >
            <Ionicons name="close-circle" size={36} color="#ffffff" />
          </TouchableOpacity>

          {selectedImageUri ? (
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
          ) : null}
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
  coverContainer: {
    width: '100%',
    height: 180,
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
    padding: 20,
  },
  coverFallbackText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  coverBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  coverBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  profileSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -32,
    marginBottom: 8,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: colors.surface,
    backgroundColor: colors.surfaceLight || colors.background,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
    marginTop: 24,
  },
  homeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  ownerSubtitle: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#92400e',
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: colors.textMuted,
  },
  typeTag: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 6,
  },
  addressText: {
    fontSize: 13,
    color: colors.textLight,
    flex: 1,
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  socialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
  },
  socialChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  callActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 11,
    borderRadius: SIZES.radius,
    gap: 8,
    elevation: 2,
  },
  callActionText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  whatsappActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 11,
    borderRadius: SIZES.radius,
    gap: 8,
    elevation: 2,
  },
  whatsappActionText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  tabContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  postCard: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  postAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postMiniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight || '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  postAuthorName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text,
  },
  postDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  categoryBadge: {
    backgroundColor: colors.primaryLight || '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 6,
  },
  postContent: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: SIZES.radius,
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  postFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  postFooterBtnText: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight || '#e0f2fe',
    padding: 12,
    borderRadius: SIZES.radius,
    marginBottom: 14,
    gap: 10,
    alignItems: 'center',
  },
  infoBannerText: {
    fontSize: 12,
    color: colors.primaryDark || '#0369a1',
    flex: 1,
    lineHeight: 17,
  },
  serviceCard: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  serviceDescription: {
    fontSize: 13,
    color: colors.textLight,
    marginTop: 4,
    lineHeight: 18,
  },
  servicePriceBox: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  serviceUnit: {
    fontSize: 11,
    color: colors.textMuted,
  },
  serviceFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  serviceInquireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  serviceInquireBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  policySection: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  policyBody: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 22,
  },
  stepBox: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBoxTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNum: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 13,
    color: colors.textLight,
    flex: 1,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  bottomInfo: {
    flex: 1,
    marginRight: 12,
  },
  bottomHomeName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  bottomStatusText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  bottomCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    gap: 6,
  },
  bottomCallBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tapToViewBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tapToViewText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerCloseBtn: {
    position: 'absolute',
    top: 45,
    right: 20,
    zIndex: 999,
  },
  imageViewerImage: {
    width: '94%',
    height: '80%',
  },
});

export default ElderHomeDetailScreen;
