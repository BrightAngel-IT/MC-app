import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity, 
  Modal, 
  Platform,
  Image,
  Linking
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';

const PatientFinanceScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [summary, setSummary] = useState({
    totalSpent: 0,
    totalPending: 0,
    doctor: { paid: 0, pending: 0, count: 0 },
    pharmacy: { paid: 0, pending: 0, count: 0 }
  });
  const [history, setHistory] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'APPOINTMENT' | 'PHARMACY'
  
  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const fetchFinanceHistory = async () => {
    try {
      const res = await api.get('/patient/finance-history');
      if (res.data) {
        setSummary(res.data.summary || {
          totalSpent: 0,
          totalPending: 0,
          doctor: { paid: 0, pending: 0, count: 0 },
          pharmacy: { paid: 0, pending: 0, count: 0 }
        });
        setHistory(res.data.history || []);
      }
    } catch (error) {
      console.log('Error fetching patient finance history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFinanceHistory();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFinanceHistory();
  };

  const formatDateTime = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const filteredHistory = history.filter(item => {
    if (selectedFilter === 'ALL') return true;
    return item.category === selectedFilter;
  });

  const styles = getStyles(colors);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {navigation?.canGoBack && navigation.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 28 }} />
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>Billing & Finance History</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Total Overall Spend Card */}
        <View style={styles.overviewCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.overviewLabel}>Total Healthcare Spend</Text>
              <Text style={styles.overviewAmount}>Rs. {summary.totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.walletIconCircle}>
              <Ionicons name="receipt-outline" size={28} color="#fff" />
            </View>
          </View>

          {summary.totalPending > 0 && (
            <View style={styles.pendingNoticeRow}>
              <Ionicons name="time-outline" size={16} color="#fef08a" style={{ marginRight: 6 }} />
              <Text style={styles.pendingNoticeText}>
                Pending / Unpaid visits & orders: <Text style={{ fontWeight: 'bold' }}>Rs. {summary.totalPending.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Breakdown by Category (Doctor visits vs Pharmacy orders) */}
        <View style={styles.categorySummaryRow}>
          {/* Doctor Card */}
          <TouchableOpacity 
            style={[
              styles.categoryBox, 
              { backgroundColor: colors.surface, borderColor: selectedFilter === 'APPOINTMENT' ? colors.primary : colors.border },
              selectedFilter === 'APPOINTMENT' && { borderWidth: 2 }
            ]}
            onPress={() => setSelectedFilter(selectedFilter === 'APPOINTMENT' ? 'ALL' : 'APPOINTMENT')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={[styles.catIconCircle, { backgroundColor: '#eff6ff' }]}>
                <FontAwesome5 name="user-md" size={16} color="#2563eb" />
              </View>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>Doctor & Visits</Text>
            </View>
            <Text style={[styles.categoryAmount, { color: '#2563eb' }]}>
              Rs. {summary.doctor?.paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 2 }}>
              {summary.doctor?.count || 0} visits completed
            </Text>
          </TouchableOpacity>

          {/* Pharmacy Card */}
          <TouchableOpacity 
            style={[
              styles.categoryBox, 
              { backgroundColor: colors.surface, borderColor: selectedFilter === 'PHARMACY' ? '#10b981' : colors.border },
              selectedFilter === 'PHARMACY' && { borderWidth: 2 }
            ]}
            onPress={() => setSelectedFilter(selectedFilter === 'PHARMACY' ? 'ALL' : 'PHARMACY')}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={[styles.catIconCircle, { backgroundColor: '#ecfdf5' }]}>
                <MaterialCommunityIcons name="pill" size={18} color="#059669" />
              </View>
              <Text style={[styles.categoryTitle, { color: colors.text }]}>Pharmacy & Meds</Text>
            </View>
            <Text style={[styles.categoryAmount, { color: '#059669' }]}>
              Rs. {summary.pharmacy?.paid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 2 }}>
              {summary.pharmacy?.count || 0} orders processed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filter Chips Bar */}
        <View style={styles.filterBar}>
          <TouchableOpacity 
            style={[styles.filterChip, selectedFilter === 'ALL' && { backgroundColor: colors.primary }]}
            onPress={() => setSelectedFilter('ALL')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'ALL' && { color: '#fff', fontWeight: 'bold' }]}>
              All Expenses ({history.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterChip, selectedFilter === 'APPOINTMENT' && { backgroundColor: '#2563eb' }]}
            onPress={() => setSelectedFilter('APPOINTMENT')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'APPOINTMENT' && { color: '#fff', fontWeight: 'bold' }]}>
              Doctor Visits ({summary.doctor?.count || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.filterChip, selectedFilter === 'PHARMACY' && { backgroundColor: '#059669' }]}
            onPress={() => setSelectedFilter('PHARMACY')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'PHARMACY' && { color: '#fff', fontWeight: 'bold' }]}>
              Medicine Orders ({summary.pharmacy?.count || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transactions List */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Itemized Statements</Text>

        {filteredHistory.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={44} color={colors.textLight} />
            <Text style={{ color: colors.textLight, marginTop: 10, fontSize: 14 }}>No billing records found.</Text>
            <Text style={{ color: colors.textLight, fontSize: 12, marginTop: 4 }}>
              Completed doctor visits and pharmacy orders will appear here.
            </Text>
          </View>
        ) : (
          filteredHistory.map((item) => {
            const isDoctor = item.category === 'APPOINTMENT';
            const isPaid = item.paymentStatus === 'PAID';
            
            return (
              <TouchableOpacity
                key={`${item.category}_${item.id}`}
                style={[styles.txCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                activeOpacity={0.8}
                onPress={() => {
                  setSelectedItem(item);
                  setDetailModalVisible(true);
                }}
              >
                {/* Header: Icon + Category Badge + Date + Amount */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                    <View style={[
                      styles.itemIconCircle, 
                      { backgroundColor: isDoctor ? '#eff6ff' : '#ecfdf5' }
                    ]}>
                      {isDoctor ? (
                        <FontAwesome5 name="user-md" size={14} color="#2563eb" />
                      ) : (
                        <MaterialCommunityIcons name="pill" size={16} color="#059669" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.providerNameText, { color: colors.text }]} numberOfLines={1}>
                        {isDoctor ? `Dr. ${item.providerName}` : item.providerName}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textLight }}>
                        {formatDateTime(item.date)}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.itemAmountText, { color: colors.text }]}>
                      Rs. {item.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                    <View style={[
                      styles.statusBadge, 
                      { backgroundColor: isPaid ? '#dcfce7' : '#fef3c7' }
                    ]}>
                      <Text style={[
                        styles.statusBadgeText, 
                        { color: isPaid ? '#15803d' : '#b45309' }
                      ]}>
                        {isPaid ? 'PAID' : item.paymentStatus}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Sub-info: Service Type or Items Count */}
                <View style={[styles.cardFooterRow, { borderTopColor: colors.border, backgroundColor: colors.surfaceLight || '#f8fafc' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons 
                      name={isDoctor ? "medical-outline" : "bag-check-outline"} 
                      size={13} 
                      color={colors.textLight} 
                      style={{ marginRight: 4 }} 
                    />
                    <Text style={{ fontSize: 12, color: colors.textLight }}>
                      {item.serviceType}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600', marginRight: 2 }}>
                      View Receipt
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Itemized Receipt Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="receipt" size={20} color={colors.primary} />
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Expense Receipt</Text>
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={{ padding: 18 }}>
                {/* Provider Card */}
                <View style={[
                  styles.providerBanner, 
                  { backgroundColor: selectedItem.category === 'APPOINTMENT' ? '#eff6ff' : '#ecfdf5' }
                ]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[
                      styles.bannerIconCircle, 
                      { backgroundColor: selectedItem.category === 'APPOINTMENT' ? '#dbeafe' : '#d1fae5' }
                    ]}>
                      {selectedItem.category === 'APPOINTMENT' ? (
                        <FontAwesome5 name="user-md" size={18} color="#1d4ed8" />
                      ) : (
                        <MaterialCommunityIcons name="pill" size={20} color="#047857" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: selectedItem.category === 'APPOINTMENT' ? '#1d4ed8' : '#047857', textTransform: 'uppercase' }}>
                        {selectedItem.category === 'APPOINTMENT' ? 'Doctor / Home Visit Provider' : 'Pharmacy Provider'}
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#1e293b' }}>
                        {selectedItem.category === 'APPOINTMENT' ? `Dr. ${selectedItem.providerName}` : selectedItem.providerName}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                        {formatDateTime(selectedItem.date)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Status & Method Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                  <View style={[styles.detailBadgeBox, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 11, color: colors.textLight }}>Payment Status</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: selectedItem.paymentStatus === 'PAID' ? '#10b981' : '#f59e0b', marginTop: 2 }}>
                      {selectedItem.paymentStatus}
                    </Text>
                  </View>

                  <View style={[styles.detailBadgeBox, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                    <Text style={{ fontSize: 11, color: colors.textLight }}>Payment Method</Text>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginTop: 2 }}>
                      {selectedItem.paymentMethod || 'CASH'}
                    </Text>
                  </View>
                </View>

                {/* Itemized Fee Breakdown for Appointments */}
                {selectedItem.category === 'APPOINTMENT' && selectedItem.breakdown && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
                      Visit Fee Breakdown
                    </Text>
                    <View style={[styles.breakdownTable, { borderColor: colors.border }]}>
                      <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                        <Text style={{ fontSize: 13, color: colors.text }}>Consultation Base Fee</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                          Rs. {selectedItem.breakdown.baseFee?.toFixed(2) || '0.00'}
                        </Text>
                      </View>

                      {selectedItem.breakdown.travelFee > 0 && (
                        <View style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                          <Text style={{ fontSize: 13, color: colors.text }}>Distance / Travel Charge</Text>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                            Rs. {selectedItem.breakdown.travelFee?.toFixed(2) || '0.00'}
                          </Text>
                        </View>
                      )}

                      <View style={[styles.tableRow, { backgroundColor: colors.surfaceLight }]}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>Total Paid / Due</Text>
                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.primary }}>
                          Rs. {selectedItem.totalAmount.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Itemized Medicine List for Pharmacy Orders */}
                {selectedItem.category === 'PHARMACY' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
                      Purchased Medicines / Items ({selectedItem.items?.length || 0})
                    </Text>
                    <View style={[styles.breakdownTable, { borderColor: colors.border }]}>
                      {selectedItem.items && selectedItem.items.length > 0 ? (
                        selectedItem.items.map((med, idx) => (
                          <View key={med.id || idx} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={{ fontSize: 13, fontWeight: '500', color: colors.text }}>{med.name}</Text>
                              <Text style={{ fontSize: 11, color: colors.textLight }}>Qty: {med.quantity} × Rs. {med.price}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>
                              Rs. {med.subtotal?.toFixed(2) || '0.00'}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <View style={{ padding: 12 }}>
                          <Text style={{ fontSize: 12, color: colors.textLight, fontStyle: 'italic' }}>
                            Prescription order items prepared by pharmacy.
                          </Text>
                        </View>
                      )}

                      <View style={[styles.tableRow, { backgroundColor: colors.surfaceLight }]}>
                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>Total Bill Amount</Text>
                        <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#059669' }}>
                          Rs. {selectedItem.totalAmount.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Bill Image View if Pharmacy provided invoice upload */}
                {selectedItem.billImageUrl ? (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>
                      Pharmacy Invoice / Bill Slip
                    </Text>
                    <Image 
                      source={{ uri: selectedItem.billImageUrl }} 
                      style={{ width: '100%', height: 200, borderRadius: 10, resizeMode: 'contain', backgroundColor: '#000' }} 
                    />
                  </View>
                ) : null}

                {/* Notes if available */}
                {selectedItem.notes ? (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 12, color: colors.textLight, marginBottom: 4 }}>Notes / Reason</Text>
                    <Text style={{ fontSize: 13, color: colors.text, fontStyle: 'italic' }}>
                      "{selectedItem.notes}"
                    </Text>
                  </View>
                ) : null}

                {/* Close Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 13,
                    borderRadius: 10,
                    alignItems: 'center',
                    marginBottom: 20
                  }}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Close Receipt</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  refreshBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  overviewCard: {
    backgroundColor: '#0f766e',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  overviewLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  overviewAmount: { color: '#ffffff', fontSize: 30, fontWeight: 'bold', marginTop: 4 },
  walletIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  pendingNoticeText: { color: '#fef08a', fontSize: 12 },
  categorySummaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  categoryBox: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  catIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  categoryTitle: { fontSize: 12, fontWeight: '600' },
  categoryAmount: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  filterChipText: { fontSize: 12, color: colors.textLight },
  sectionHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyBox: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCard: {
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  itemIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  providerNameText: { fontSize: 14, fontWeight: '600' },
  itemAmountText: { fontSize: 15, fontWeight: 'bold' },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    borderRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalHeaderTitle: { fontSize: 16, fontWeight: 'bold' },
  providerBanner: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  bannerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailBadgeBox: {
    flex: 0.48,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  breakdownTable: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
});

export default PatientFinanceScreen;
