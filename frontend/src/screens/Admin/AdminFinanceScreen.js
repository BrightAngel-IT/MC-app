import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  FlatList, 
  Platform,
  Dimensions,
  Modal
} from 'react-native';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';

const AdminFinanceScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeTab, setActiveTab] = useState('TRANSACTIONS'); // 'TRANSACTIONS' | 'WALLETS'
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'CREDIT' | 'DEBIT'
  const [filterMethod, setFilterMethod] = useState('ALL'); // 'ALL' | 'CARD' | 'CASH'
  const [selectedDoctorWallet, setSelectedDoctorWallet] = useState(null);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [loadingDoctorWallet, setLoadingDoctorWallet] = useState(false);

  const openDoctorStatement = async (profId, docName) => {
    try {
      setLoadingDoctorWallet(true);
      setWalletModalVisible(true);
      setSelectedDoctorWallet({ doctorName: docName, walletBalance: 0, transactions: [] });
      const res = await api.get(`/admin/wallet/${profId}`);
      if (res.data) {
        setSelectedDoctorWallet(res.data);
      }
    } catch (err) {
      console.log('Error fetching doctor wallet statement:', err);
    } finally {
      setLoadingDoctorWallet(false);
    }
  };

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/financial-ledger?type=${filterType}&paymentMethod=${filterMethod}`);
      if (res.data) {
        setSummary(res.data.summary);
        setProfessionals(res.data.professionals || []);
        setTransactions(res.data.transactions || []);
      }
    } catch (error) {
      console.log('Error fetching financial ledger:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [filterType, filterMethod]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLedger();
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Financial Ledger & Wallets</Text>
          <Text style={styles.headerSub}>Platform Commission, Doctor Balances & Debits/Credits</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* KPI Cards */}
        {summary && (
          <View style={styles.kpiContainer}>
            {/* Total Company Commission */}
            <View style={[styles.kpiCard, { backgroundColor: '#0f172a' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.kpiLabel}>TOTAL COMMISSION EARNED</Text>
                <MaterialCommunityIcons name="shield-check" size={20} color="#10b981" />
              </View>
              <Text style={styles.kpiValue}>Rs. {Number(summary.totalCompanyCommission || 0).toFixed(2)}</Text>
              <Text style={styles.kpiDesc}>Platform revenue from card & cash bookings</Text>
            </View>

            <View style={styles.kpiRow}>
              {/* Doctor Debits Due to Company */}
              <View style={[styles.kpiCardHalf, { backgroundColor: '#7f1d1d' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.kpiLabelSmall}>DUE FROM DOCTORS</Text>
                  <Ionicons name="arrow-down-circle" size={18} color="#fca5a5" />
                </View>
                <Text style={styles.kpiValueSmall}>Rs. {Number(summary.totalDebitsDue || 0).toFixed(2)}</Text>
                <Text style={styles.kpiDescSmall}>Cash commission doctors owe to Company</Text>
              </View>

              {/* Company Credits Payable to Doctors */}
              <View style={[styles.kpiCardHalf, { backgroundColor: '#064e3b' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.kpiLabelSmall}>PAYABLE TO DOCTORS</Text>
                  <Ionicons name="arrow-up-circle" size={18} color="#6ee7b7" />
                </View>
                <Text style={styles.kpiValueSmall}>Rs. {Number(summary.totalCreditsPayable || 0).toFixed(2)}</Text>
                <Text style={styles.kpiDescSmall}>Doctor net earnings collected via Card</Text>
              </View>
            </View>
          </View>
        )}

        {/* Navigation Sub-Tabs */}
        <View style={styles.tabSwitchContainer}>
          <TouchableOpacity 
            style={[styles.switchTab, activeTab === 'TRANSACTIONS' && styles.activeSwitchTab]}
            onPress={() => setActiveTab('TRANSACTIONS')}
          >
            <MaterialCommunityIcons 
              name="format-list-bulleted-type" 
              size={18} 
              color={activeTab === 'TRANSACTIONS' ? '#fff' : colors.textLight} 
            />
            <Text style={[styles.switchTabText, activeTab === 'TRANSACTIONS' && styles.activeSwitchTabText]}>
              Line-by-Line Ledger ({transactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.switchTab, activeTab === 'WALLETS' && styles.activeSwitchTab]}
            onPress={() => setActiveTab('WALLETS')}
          >
            <Ionicons 
              name="wallet-outline" 
              size={18} 
              color={activeTab === 'WALLETS' ? '#fff' : colors.textLight} 
            />
            <Text style={[styles.switchTabText, activeTab === 'WALLETS' && styles.activeSwitchTabText]}>
              Doctor Wallets ({professionals.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* View 1: Line by Line Transactions */}
        {activeTab === 'TRANSACTIONS' && (
          <View style={styles.sectionContainer}>
            {/* Filter Chips */}
            <View style={styles.filtersRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['ALL', 'CREDIT', 'DEBIT'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterChip, filterType === type && styles.activeFilterChip]}
                    onPress={() => setFilterType(type)}
                  >
                    <Text style={[styles.filterChipText, filterType === type && styles.activeFilterChipText]}>
                      {type === 'ALL' ? 'All Types' : type === 'CREDIT' ? '🟢 Credits (+)' : '🔴 Debits (-)'}
                    </Text>
                  </TouchableOpacity>
                ))}

                <View style={{ width: 1, backgroundColor: colors.border, marginHorizontal: 8, height: 26 }} />

                {['ALL', 'CASH', 'CARD'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.filterChip, filterMethod === method && styles.activeFilterChip]}
                    onPress={() => setFilterMethod(method)}
                  >
                    <Text style={[styles.filterChipText, filterMethod === method && styles.activeFilterChipText]}>
                      {method === 'ALL' ? 'All Methods' : method === 'CARD' ? '💳 Card' : '💵 Cash'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
            ) : transactions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="receipt-outline" size={48} color={colors.textLight} />
                <Text style={{ color: colors.textLight, marginTop: 10, fontStyle: 'italic' }}>
                  No payment transactions recorded yet.
                </Text>
              </View>
            ) : (
              transactions.map((tx) => {
                const isCredit = tx.type === 'CREDIT';
                return (
                  <View key={tx.id} style={[styles.txCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.txTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.methodBadge, { backgroundColor: tx.paymentMethod === 'CARD' ? '#dbeafe' : '#fef3c7' }]}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: tx.paymentMethod === 'CARD' ? '#1e40af' : '#92400e' }}>
                            {tx.paymentMethod}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.docName, { color: colors.text }]}>{tx.doctorName}</Text>
                          <Text style={{ fontSize: 11, color: colors.textLight }}>{formatDateTime(tx.createdAt)}</Text>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.txAmount, { color: isCredit ? '#10b981' : '#ef4444' }]}>
                          {isCredit ? `+Rs. ${Math.abs(tx.amount).toFixed(2)}` : `-Rs. ${Math.abs(tx.amount).toFixed(2)}`}
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: isCredit ? '#059669' : '#dc2626' }}>
                          {isCredit ? 'CREDIT (Doctor Share)' : 'DEBIT (Company Comm)'}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.txDesc, { color: colors.text }]}>{tx.description}</Text>

                    <View style={[styles.txBottomGrid, { borderTopColor: colors.border }]}>
                      <View>
                        <Text style={styles.gridLabel}>TOTAL APPT FEE</Text>
                        <Text style={[styles.gridValue, { color: colors.text }]}>Rs. {Number(tx.totalFee || 0).toFixed(2)}</Text>
                      </View>
                      <View>
                        <Text style={styles.gridLabel}>COMPANY COMM</Text>
                        <Text style={[styles.gridValue, { color: '#ef4444' }]}>Rs. {Number(tx.commissionAmount || 0).toFixed(2)}</Text>
                      </View>
                      <View>
                        <Text style={styles.gridLabel}>BALANCE AFTER</Text>
                        <Text style={[styles.gridValue, { color: colors.primary, fontWeight: 'bold' }]}>
                          Rs. {Number(tx.balanceAfter || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* View 2: All Doctor Wallets List */}
        {activeTab === 'WALLETS' && (
          <View style={styles.sectionContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
            ) : professionals.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="people-outline" size={48} color={colors.textLight} />
                <Text style={{ color: colors.textLight, marginTop: 10, fontStyle: 'italic' }}>
                  No professionals registered yet.
                </Text>
              </View>
            ) : (
              professionals.map((prof) => {
                const bal = Number(prof.walletBalance || 0);
                const isPositive = bal >= 0;

                return (
                  <TouchableOpacity 
                    key={prof.id} 
                    activeOpacity={0.7}
                    onPress={() => openDoctorStatement(prof.id, prof.name)}
                    style={[styles.walletCard, { backgroundColor: colors.surface, borderColor: isPositive ? '#10b98133' : '#ef444433' }]}
                  >
                    <View style={styles.walletCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.walletDocName, { color: colors.text }]}>{prof.name}</Text>
                        <Text style={{ fontSize: 12, color: colors.textLight }}>{prof.role} • {prof.phone || 'No phone'}</Text>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.walletStatusBadge, { backgroundColor: isPositive ? '#ecfdf5' : '#fef2f2' }]}>
                          <Text style={[styles.walletStatusText, { color: isPositive ? '#059669' : '#dc2626' }]}>
                            {isPositive ? 'POSITIVE' : 'DEBTOR'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
                      </View>
                    </View>

                    <View style={[styles.walletBalanceBar, { backgroundColor: isPositive ? '#ecfdf5' : '#fef2f2' }]}>
                      <Text style={{ fontSize: 12, color: isPositive ? '#065f46' : '#991b1b', fontWeight: '600' }}>
                        {isPositive ? 'Company Owes Doctor:' : 'Doctor Owes Company:'}
                      </Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: isPositive ? '#059669' : '#dc2626' }}>
                        {isPositive ? `+Rs. ${bal.toFixed(2)}` : `-Rs. ${Math.abs(bal).toFixed(2)}`}
                      </Text>
                    </View>

                    <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>Tap to view full payment history</Text>
                      <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Doctor Wallet Statement History Modal */}
      <Modal 
        visible={walletModalVisible} 
        transparent={true} 
        animationType="slide" 
        onRequestClose={() => setWalletModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Doctor Statement History</Text>
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: 'bold', marginTop: 2 }}>
                  {selectedDoctorWallet?.doctorName || 'Doctor'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setWalletModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={26} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {loadingDoctorWallet ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: colors.textLight, marginTop: 10 }}>Loading statement history...</Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Balance Summary Header */}
                <View style={[
                  styles.modalBalanceCard,
                  { backgroundColor: (selectedDoctorWallet?.walletBalance || 0) >= 0 ? '#065f46' : '#991b1b' }
                ]}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 'bold' }}>CURRENT WALLET BALANCE</Text>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>
                    {(selectedDoctorWallet?.walletBalance || 0) >= 0 
                      ? `+Rs. ${(selectedDoctorWallet?.walletBalance || 0).toFixed(2)}` 
                      : `-Rs. ${Math.abs(selectedDoctorWallet?.walletBalance || 0).toFixed(2)}`}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 }}>
                    {(selectedDoctorWallet?.walletBalance || 0) >= 0
                      ? 'Doctor has net earnings to receive from Company.'
                      : 'Doctor owes commission to Company from cash appointments.'}
                  </Text>
                </View>

                {/* Line by line list */}
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text, marginVertical: 12 }}>
                  All Recorded Transactions ({selectedDoctorWallet?.transactions?.length || 0})
                </Text>

                {(!selectedDoctorWallet?.transactions || selectedDoctorWallet.transactions.length === 0) ? (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ color: colors.textLight, fontStyle: 'italic' }}>No transactions recorded for this doctor yet.</Text>
                  </View>
                ) : (
                  selectedDoctorWallet.transactions.map((tx) => {
                    const isCredit = tx.type === 'CREDIT';
                    return (
                      <View key={tx.id} style={[styles.txCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 4,
                              backgroundColor: tx.paymentMethod === 'CARD' ? '#dbeafe' : '#fef3c7'
                            }}>
                              <Text style={{ fontSize: 10, fontWeight: 'bold', color: tx.paymentMethod === 'CARD' ? '#1e40af' : '#92400e' }}>
                                {tx.paymentMethod}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 11, color: colors.textLight }}>{formatDateTime(tx.createdAt)}</Text>
                          </View>

                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: isCredit ? '#10b981' : '#ef4444' }}>
                            {isCredit ? `+Rs. ${Math.abs(tx.amount).toFixed(2)}` : `-Rs. ${Math.abs(tx.amount).toFixed(2)}`}
                          </Text>
                        </View>

                        <Text style={{ fontSize: 12, color: colors.text, marginTop: 6 }}>{tx.description}</Text>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border }}>
                          <Text style={{ fontSize: 11, color: colors.textLight }}>Total Fee: Rs. {Number(tx.totalFee || 0).toFixed(2)}</Text>
                          <Text style={{ fontSize: 11, color: '#ef4444' }}>Company Comm: Rs. {Number(tx.commissionAmount || 0).toFixed(2)}</Text>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.text }}>Balance: Rs. {Number(tx.balanceAfter || 0).toFixed(2)}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: 18,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  headerSub: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  refreshBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.surfaceLight },
  kpiContainer: { padding: 16, gap: 12 },
  kpiCard: { borderRadius: 14, padding: 18 },
  kpiLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' },
  kpiValue: { color: '#10b981', fontSize: 28, fontWeight: 'bold', marginVertical: 4 },
  kpiDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  kpiRow: { flexDirection: 'row', gap: 12 },
  kpiCardHalf: { flex: 1, borderRadius: 12, padding: 14 },
  kpiLabelSmall: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 'bold' },
  kpiValueSmall: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  kpiDescSmall: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  tabSwitchContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  switchTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  activeSwitchTab: { backgroundColor: colors.primary },
  switchTabText: { fontSize: 12, fontWeight: 'bold', color: colors.textLight },
  activeSwitchTabText: { color: '#ffffff' },
  sectionContainer: { paddingHorizontal: 16 },
  filtersRow: { marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  activeFilterChip: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: 11, color: colors.textLight, fontWeight: '600' },
  activeFilterChipText: { color: '#ffffff' },
  emptyBox: { padding: 40, alignItems: 'center' },
  txCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  txTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  methodBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  docName: { fontSize: 14, fontWeight: 'bold' },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  txDesc: { fontSize: 12, marginVertical: 8 },
  txBottomGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 8 },
  gridLabel: { fontSize: 9, color: colors.textLight, fontWeight: '600' },
  gridValue: { fontSize: 12, marginTop: 2 },
  walletCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  walletCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletDocName: { fontSize: 15, fontWeight: 'bold' },
  walletStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  walletStatusText: { fontSize: 10, fontWeight: 'bold' },
  walletBalanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBalanceCard: {
    borderRadius: 12,
    padding: 16,
  },
});

export default AdminFinanceScreen;
