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
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('TRANSACTIONS'); // 'TRANSACTIONS' | 'WALLETS' | 'PAYOUTS'
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'CREDIT' | 'DEBIT'
  const [filterMethod, setFilterMethod] = useState('ALL'); // 'ALL' | 'CARD' | 'CASH'
  const [selectedDoctorWallet, setSelectedDoctorWallet] = useState(null);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [loadingDoctorWallet, setLoadingDoctorWallet] = useState(false);
  const [processingPayoutId, setProcessingPayoutId] = useState(null);

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

  const fetchPayouts = async () => {
    try {
      const res = await api.get('/wallet/admin/payouts');
      if (res.data) {
        setPayoutRequests(res.data);
      }
    } catch (err) {
      console.log('Error fetching payout requests:', err);
    }
  };

  const handleProcessPayout = async (requestId, action) => {
    try {
      setProcessingPayoutId(requestId);
      const res = await api.put(`/wallet/admin/payout/${requestId}`, {
        action: action,
        referenceNumber: `BANK-TX-${Date.now().toString().slice(-6)}`,
        adminNote: action === 'APPROVE' ? 'Approved & transferred via bank' : 'Rejected by Admin'
      });

      fetchLedger();
    } catch (err) {
      console.error('Error processing payout:', err);
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const [ledgerRes, payoutRes] = await Promise.allSettled([
        api.get(`/admin/financial-ledger?type=${filterType}&paymentMethod=${filterMethod}`),
        api.get('/wallet/admin/payouts')
      ]);

      if (ledgerRes.status === 'fulfilled' && ledgerRes.value.data) {
        setSummary(ledgerRes.value.data.summary);
        setProfessionals(ledgerRes.value.data.professionals || []);
        setTransactions(ledgerRes.value.data.transactions || []);
      }

      if (payoutRes.status === 'fulfilled' && payoutRes.value.data) {
        setPayoutRequests(payoutRes.value.data);
      }
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
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
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Financial Ledger & Wallets</Text>
          <Text style={styles.headerSub}>Platform Commission, Doctor Balances & Debits/Credits</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* KPI Summary Cards */}
        {summary && (
          <View style={styles.kpiContainer}>
            {/* Top Large Card: Total Commission Earned */}
            <View style={[styles.kpiCard, { backgroundColor: colors.isDark ? '#0f172a' : '#1e293b' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.kpiLabel}>TOTAL COMMISSION EARNED</Text>
                <Ionicons name="shield-checkmark" size={20} color="#10b981" />
              </View>
              <Text style={styles.kpiValue}>Rs. {Number(summary.totalPlatformCommissionEarned || 0).toFixed(2)}</Text>
              <Text style={styles.kpiDesc}>Platform revenue from card & cash bookings</Text>
            </View>

            {/* Split Row: Due From Doctors vs Payable to Doctors */}
            <View style={styles.kpiRow}>
              {/* Due From Doctors (Debit balance) */}
              <View style={[styles.kpiCardHalf, { backgroundColor: '#7f1d1d' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.kpiLabelSmall}>DUE FROM DOCTORS</Text>
                  <Ionicons name="arrow-down-circle" size={18} color="#fca5a5" />
                </View>
                <Text style={styles.kpiValueSmall}>Rs. {Number(summary.totalDebitsReceivable || 0).toFixed(2)}</Text>
                <Text style={styles.kpiDescSmall}>Cash commission doctors owe to Company</Text>
              </View>

              {/* Payable to Doctors (Credit balance) */}
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

        {/* Navigation Sub-Tabs (Scrollable for complete visibility) */}
        <View style={styles.subTabScrollWrapper}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabSwitchContainer}
          >
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

            <TouchableOpacity 
              style={[styles.switchTab, activeTab === 'PAYOUTS' && styles.activeSwitchTab]}
              onPress={() => setActiveTab('PAYOUTS')}
            >
              <Ionicons 
                name="cash-outline" 
                size={18} 
                color={activeTab === 'PAYOUTS' ? '#fff' : colors.textLight} 
              />
              <Text style={[styles.switchTabText, activeTab === 'PAYOUTS' && styles.activeSwitchTabText]}>
                Payout Requests ({payoutRequests.filter(r => r.status === 'PENDING').length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* View 1: Line by Line Transactions */}
        {activeTab === 'TRANSACTIONS' && (
          <View style={styles.sectionContainer}>
            {/* Filter Chips */}
            <View style={styles.filtersRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
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
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
            ) : transactions.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="receipt-outline" size={48} color={colors.textLight} />
                <Text style={{ color: colors.textLight, marginTop: 10 }}>No transactions recorded yet.</Text>
              </View>
            ) : (
              transactions.map((tx) => {
                const isCredit = tx.type === 'CREDIT';
                const isCard = tx.paymentMethod === 'CARD';
                return (
                  <View key={tx.id} style={[styles.txCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.txTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                        <View style={[
                          styles.methodBadge, 
                          { backgroundColor: isCard ? '#eff6ff' : '#fef3c7' }
                        ]}>
                          <Text style={{ 
                            fontSize: 10, 
                            fontWeight: 'bold', 
                            color: isCard ? '#1d4ed8' : '#92400e' 
                          }}>
                            {tx.paymentMethod}
                          </Text>
                        </View>
                        <View>
                          <Text style={[styles.docName, { color: colors.text }]}>{tx.doctorName}</Text>
                          <Text style={{ fontSize: 11, color: colors.textLight }}>{formatDateTime(tx.createdAt)}</Text>
                        </View>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[
                          styles.txAmount, 
                          { color: isCredit ? '#10b981' : '#ef4444' }
                        ]}>
                          {isCredit ? `+Rs. ${Math.abs(tx.amount).toFixed(2)}` : `-Rs. ${Math.abs(tx.amount).toFixed(2)}`}
                        </Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: isCredit ? '#059669' : '#dc2626' }}>
                          {isCredit ? 'CREDIT (Doctor Payable)' : 'DEBIT (Company Comm)'}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.txDesc, { color: colors.text }]}>
                      {tx.description}
                    </Text>

                    <View style={[styles.txBottomGrid, { borderTopColor: colors.border }]}>
                      <View>
                        <Text style={styles.gridLabel}>TOTAL APPT FEE</Text>
                        <Text style={[styles.gridValue, { color: colors.text }]}>
                          Rs. {Number(tx.totalFee || 0).toFixed(2)}
                        </Text>
                      </View>

                      <View>
                        <Text style={styles.gridLabel}>COMPANY COMM</Text>
                        <Text style={[styles.gridValue, { color: '#ef4444' }]}>
                          Rs. {Number(tx.commissionAmount || 0).toFixed(2)}
                        </Text>
                      </View>

                      <View>
                        <Text style={styles.gridLabel}>BALANCE AFTER</Text>
                        <Text style={[
                          styles.gridValue, 
                          { fontWeight: 'bold', color: (tx.balanceAfter || 0) >= 0 ? colors.primary : '#ef4444' }
                        ]}>
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

        {/* View 2: Doctor Wallets List */}
        {activeTab === 'WALLETS' && (
          <View style={styles.sectionContainer}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
            ) : professionals.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="wallet-outline" size={48} color={colors.textLight} />
                <Text style={{ color: colors.textLight, marginTop: 10 }}>No registered doctors found.</Text>
              </View>
            ) : (
              professionals.map((prof) => {
                const bal = Number(prof.walletBalance || 0);
                const isPositive = bal >= 0;
                return (
                  <View key={prof.id} style={[styles.walletCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.walletCardHeader}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={[styles.walletDocName, { color: colors.text }]}>{prof.doctorName}</Text>
                        <Text style={{ fontSize: 12, color: colors.textLight }}>
                          {prof.specialization || 'General Practitioner'} • {prof.phone || 'No phone'}
                        </Text>
                      </View>
                      <View style={[
                        styles.walletStatusBadge,
                        { backgroundColor: isPositive ? '#ecfdf5' : '#fef2f2' }
                      ]}>
                        <Text style={[
                          styles.walletStatusText,
                          { color: isPositive ? '#065f46' : '#991b1b' }
                        ]}>
                          {isPositive ? 'PAYABLE' : 'OWING COMM'}
                        </Text>
                      </View>
                    </View>

                    <View style={[
                      styles.walletBalanceBar,
                      { backgroundColor: colors.surfaceLight }
                    ]}>
                      <View>
                        <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '600' }}>CURRENT RUNNING BALANCE</Text>
                        <Text style={{ 
                          fontSize: 18, 
                          fontWeight: 'bold', 
                          marginTop: 2,
                          color: isPositive ? '#10b981' : '#ef4444' 
                        }}>
                          {isPositive ? `+Rs. ${bal.toFixed(2)}` : `-Rs. ${Math.abs(bal).toFixed(2)}`}
                        </Text>
                      </View>

                      <TouchableOpacity 
                        style={{ 
                          backgroundColor: colors.primary, 
                          paddingHorizontal: 12, 
                          paddingVertical: 7, 
                          borderRadius: 8,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4
                        }}
                        onPress={() => openDoctorStatement(prof.id, prof.doctorName)}
                      >
                        <Ionicons name="document-text-outline" size={14} color="#fff" />
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Statement</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* View 3: Doctor Payout Requests */}
        {activeTab === 'PAYOUTS' && (
          <View style={styles.sectionContainer}>
            <View style={{ marginBottom: 12, padding: 12, backgroundColor: colors.surfaceLight, borderRadius: 10 }}>
              <Text style={{ fontSize: 13, color: colors.text, fontWeight: 'bold' }}>
                Bank Payout Withdrawals Management
              </Text>
              <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 2 }}>
                When doctors have positive balance from Card bookings, they can request bank payouts. Review and approve bank transfers here.
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 30 }} />
            ) : payoutRequests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="cash-outline" size={48} color={colors.textLight} />
                <Text style={{ color: colors.textLight, marginTop: 10 }}>No withdrawal requests found.</Text>
              </View>
            ) : (
              payoutRequests.map((req) => {
                const isPending = req.status === 'PENDING';
                const isApproved = req.status === 'APPROVED';
                return (
                  <View key={req.id} style={[styles.txCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.text }}>
                        {req.professional?.user?.fullName || 'Doctor'}
                      </Text>
                      <View style={{
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        backgroundColor: isPending ? '#fef3c7' : isApproved ? '#d1fae5' : '#fee2e2'
                      }}>
                        <Text style={{
                          fontSize: 10,
                          fontWeight: 'bold',
                          color: isPending ? '#92400e' : isApproved ? '#065f46' : '#991b1b'
                        }}>
                          {req.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.primary, marginVertical: 6 }}>
                      Rs. {Number(req.amount).toFixed(2)}
                    </Text>

                    {/* Bank Info */}
                    <View style={{ backgroundColor: colors.surfaceLight, padding: 8, borderRadius: 8, marginVertical: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text }}>Bank Details:</Text>
                      <Text style={{ fontSize: 12, color: colors.textLight, marginTop: 2 }}>
                        Bank: {req.bankName} | Branch: {req.branchName}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textLight }}>
                        Account Name: {req.accountHolderName}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text, marginTop: 2 }}>
                        Account No: {req.accountNumber}
                      </Text>
                    </View>

                    <Text style={{ fontSize: 11, color: colors.textLight, marginTop: 4 }}>
                      Requested: {formatDateTime(req.createdAt)}
                    </Text>

                    {isPending && (
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: '#10b981',
                            paddingVertical: 9,
                            borderRadius: 8,
                            alignItems: 'center'
                          }}
                          onPress={() => handleProcessPayout(req.id, 'APPROVE')}
                          disabled={processingPayoutId === req.id}
                        >
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                            {processingPayoutId === req.id ? 'Processing...' : 'Approve & Mark Paid'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: '#ef4444',
                            paddingVertical: 9,
                            borderRadius: 8,
                            alignItems: 'center'
                          }}
                          onPress={() => handleProcessPayout(req.id, 'REJECT')}
                          disabled={processingPayoutId === req.id}
                        >
                          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                            {processingPayoutId === req.id ? 'Processing...' : 'Reject Request'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Doctor Detailed Statement Modal */}
      <Modal visible={walletModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Doctor Statement & Ledger</Text>
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
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  headerSub: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  refreshBtn: { padding: 8, borderRadius: 20, backgroundColor: colors.surfaceLight },
  kpiContainer: { padding: 14, gap: 10 },
  kpiCard: { borderRadius: 12, padding: 16 },
  kpiLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold' },
  kpiValue: { color: '#10b981', fontSize: 24, fontWeight: 'bold', marginVertical: 3 },
  kpiDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
  kpiRow: { flexDirection: 'row', gap: 10 },
  kpiCardHalf: { flex: 1, borderRadius: 10, padding: 12 },
  kpiLabelSmall: { color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: 'bold' },
  kpiValueSmall: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginVertical: 3 },
  kpiDescSmall: { color: 'rgba(255,255,255,0.7)', fontSize: 9.5 },
  subTabScrollWrapper: {
    marginHorizontal: 14,
    marginBottom: 10,
  },
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  switchTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    cursor: Platform.OS === 'web' ? 'pointer' : 'auto',
  },
  activeSwitchTab: { backgroundColor: colors.primary },
  switchTabText: { fontSize: 11.5, fontWeight: 'bold', color: colors.textLight },
  activeSwitchTabText: { color: '#ffffff' },
  sectionContainer: { paddingHorizontal: 14 },
  filtersRow: { marginBottom: 10 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
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
  txCard: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  txTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  methodBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  docName: { fontSize: 13.5, fontWeight: 'bold' },
  txAmount: { fontSize: 15, fontWeight: 'bold' },
  txDesc: { fontSize: 11.5, marginVertical: 6 },
  txBottomGrid: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 6 },
  gridLabel: { fontSize: 9, color: colors.textLight, fontWeight: '600' },
  gridValue: { fontSize: 11.5, marginTop: 2 },
  walletCard: { borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  walletCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletDocName: { fontSize: 14, fontWeight: 'bold' },
  walletStatusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  walletStatusText: { fontSize: 9.5, fontWeight: 'bold' },
  walletBalanceBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
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
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalBalanceCard: {
    borderRadius: 12,
    padding: 14,
  },
});

export default AdminFinanceScreen;
