import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Modal, Platform, TextInput } from 'react-native';
import { WebView } from 'react-native-webview';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';
import { SIZES } from '../../styles/theme';
import api from '../../api/axios';

const ProfessionalWalletScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);

  // PayHere Payment States
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [payLoading, setPayLoading] = useState(false);

  // Payout / Withdrawal States
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [branchName, setBranchName] = useState('');


  const fetchWallet = async () => {
    try {
      const res = await api.get('/wallet/my-wallet');
      if (res.data) {
        setWalletBalance(res.data.walletBalance || 0);
        setIsBlocked(!!res.data.isWalletBlocked);
        setTransactions(res.data.transactions || []);
      }
    } catch (error) {
      console.log('Error fetching wallet:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWallet();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  const handleInitiatePayment = async () => {
    if (walletBalance >= 0) {
      Alert.alert("All Clear", "You have no outstanding commission dues to settle.");
      return;
    }

    try {
      setPayLoading(true);
      const res = await api.post('/wallet/payhere-initiate');
      if (res.data) {
        setPaymentData(res.data);

        // If Web browser (Chrome / Edge / Firefox)
        if (Platform.OS === 'web') {
          // Dynamically load PayHere official JS SDK if not present
          const loadPayHereScript = () => {
            return new Promise((resolve, reject) => {
              if (window.payhere) {
                return resolve(window.payhere);
              }
              const script = document.createElement('script');
              script.src = 'https://www.payhere.lk/lib/payhere.js';
              script.type = 'text/javascript';
              script.onload = () => resolve(window.payhere);
              script.onerror = () => reject(new Error('Failed to load PayHere script'));
              document.head.appendChild(script);
            });
          };

          try {
            const payhere = await loadPayHereScript();

            payhere.onCompleted = function onCompleted(orderId) {
              console.log("PayHere Payment completed. OrderID:" + orderId);
              handlePaymentSuccess(orderId);
            };

            payhere.onDismissed = function onDismissed() {
              console.log("PayHere Payment dismissed");
            };

            payhere.onError = function onError(error) {
              console.log("PayHere Error:" + error);
              Alert.alert("PayHere Error", String(error));
            };

            const paymentObject = {
              sandbox: res.data.sandbox,
              merchant_id: res.data.merchant_id,
              return_url: window.location.origin + '/ProfessionalWallet',
              cancel_url: window.location.origin + '/ProfessionalWallet',
              notify_url: 'https://mcbackend.crescereluna.com/api/wallet/payhere-notify',
              order_id: res.data.order_id,
              items: res.data.items,
              amount: res.data.amount,
              currency: res.data.currency,
              hash: res.data.hash,
              first_name: res.data.first_name,
              last_name: res.data.last_name,
              email: res.data.email,
              phone: res.data.phone,
              address: res.data.address,
              city: res.data.city,
              country: res.data.country,
              custom_1: res.data.custom_1,
              custom_2: res.data.custom_2,
            };

            payhere.startPayment(paymentObject);
          } catch (sdkError) {
            console.error("PayHere SDK loading failed, falling back to direct checkout:", sdkError);
            Alert.alert("Error", "Could not load PayHere popup. Please retry.");
          }
        } else {
          // Mobile (Android / iOS) uses In-App WebView
          setPayModalVisible(true);
        }
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to initiate payment gateway.";
      Alert.alert("Payment Error", msg);
    } finally {
      setPayLoading(false);
    }
  };



  const handlePaymentSuccess = async (paymentRef) => {
    try {
      setPayLoading(true);
      setPayModalVisible(false);
      const dueAmount = Math.abs(walletBalance);
      
      const res = await api.post('/wallet/verify-settle', {
        order_id: paymentData?.order_id,
        amount: dueAmount,
        payment_id: paymentRef || 'PAYHERE-APP'
      });

      Alert.alert(
        "Settlement Successful! 🎉", 
        "Your commission due has been successfully settled and your wallet balance is updated.",
        [{ text: "OK", onPress: () => fetchWallet() }]
      );
      fetchWallet();
    } catch (error) {
      console.error("Error settling wallet on client:", error);
      Alert.alert("Status", "Payment recorded. Refreshing wallet...");
      fetchWallet();
    } finally {
      setPayLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    const amountNum = parseFloat(withdrawAmount);
    if (!amountNum || amountNum <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid withdrawal amount.");
      return;
    }

    if (amountNum > walletBalance) {
      Alert.alert("Insufficient Balance", `You can withdraw up to Rs. ${walletBalance.toFixed(2)}.`);
      return;
    }

    if (!bankName.trim() || !accountNumber.trim() || !accountHolderName.trim()) {
      Alert.alert("Required Fields", "Please enter your Bank Name, Account Number, and Account Holder Name.");
      return;
    }

    try {
      setWithdrawLoading(true);
      const res = await api.post('/wallet/payout-request', {
        amount: amountNum,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
        branchName: branchName.trim()
      });

      setWithdrawModalVisible(false);
      setWithdrawAmount('');
      setBankName('');
      setAccountNumber('');
      setAccountHolderName('');
      setBranchName('');

      Alert.alert(
        "Request Submitted! 🏦", 
        res.data.message || "Withdrawal request sent to Admin for transfer."
      );
      fetchWallet();
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to submit withdrawal request.";
      Alert.alert("Withdrawal Error", msg);
    } finally {
      setWithdrawLoading(false);
    }
  };


  const getPayHereHtml = (data) => {
    if (!data) return '';
    const actionUrl = data.sandbox 
      ? 'https://sandbox.payhere.lk/pay/checkout' 
      : 'https://www.payhere.lk/pay/checkout';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f8fafc; }
            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #10b981; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            h2 { color: #1e293b; font-size: 18px; margin: 0 0 8px 0; }
            p { color: #64748b; font-size: 14px; margin: 0; }
          </style>
        </head>
        <body onload="document.forms['payhere_form'].submit()">
          <div class="loader"></div>
          <h2>Connecting to PayHere Secure Gateway...</h2>
          <p>Please wait, do not close or press back.</p>
          <form id="payhere_form" method="post" action="${actionUrl}">
            <input type="hidden" name="merchant_id" value="${data.merchant_id}">
            <input type="hidden" name="return_url" value="https://mcbackend.crescereluna.com/api/payment/success">
            <input type="hidden" name="cancel_url" value="https://mcbackend.crescereluna.com/api/payment/cancel">
            <input type="hidden" name="notify_url" value="https://mcbackend.crescereluna.com/api/wallet/payhere-notify">
            <input type="hidden" name="order_id" value="${data.order_id}">
            <input type="hidden" name="items" value="${data.items}">
            <input type="hidden" name="currency" value="${data.currency}">
            <input type="hidden" name="amount" value="${data.amount}">
            <input type="hidden" name="first_name" value="${data.first_name}">
            <input type="hidden" name="last_name" value="${data.last_name}">
            <input type="hidden" name="email" value="${data.email}">
            <input type="hidden" name="phone" value="${data.phone}">
            <input type="hidden" name="address" value="${data.address}">
            <input type="hidden" name="city" value="${data.city}">
            <input type="hidden" name="country" value="${data.country}">
            <input type="hidden" name="hash" value="${data.hash}">
            <input type="hidden" name="custom_1" value="${data.custom_1}">
            <input type="hidden" name="custom_2" value="${data.custom_2}">
          </form>
        </body>
      </html>
    `;
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

  const isPositive = walletBalance >= 0;


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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Wallet & Earnings</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Balance Card */}
        <View style={[
          styles.balanceCard, 
          { backgroundColor: isPositive ? '#065f46' : '#991b1b' }
        ]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.balanceLabel}>Current Wallet Balance</Text>
              <Text style={styles.balanceAmount}>
                {isPositive ? `+Rs. ${walletBalance.toFixed(2)}` : `-Rs. ${Math.abs(walletBalance).toFixed(2)}`}
              </Text>
            </View>
            <View style={styles.walletIconCircle}>
              <Ionicons name="wallet-outline" size={32} color="#fff" />
            </View>
          </View>

          <View style={styles.cardStatusRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons 
                name={isPositive ? "checkmark-circle" : "alert-circle"} 
                size={16} 
                color={isPositive ? "#6ee7b7" : "#fca5a5"} 
                style={{ marginRight: 6 }} 
              />
              <Text style={{ color: isPositive ? "#6ee7b7" : "#fca5a5", fontSize: 13, fontWeight: 'bold' }}>
                {isPositive ? "Account Settled & In Good Standing" : "Outstanding Commission Due to Company"}
              </Text>
            </View>
          </View>

          {!isPositive && (
            <View style={styles.debtNoticeBox}>
              <Text style={styles.debtNoticeText}>
                ⚠️ You have collected cash directly from patients. Please settle the company commission to avoid account blocking after 30 days.
              </Text>
            </View>
          )}

          {/* PayHere Settle Due Button */}
          {!isPositive && (
            <TouchableOpacity 
              style={styles.payNowBtn}
              onPress={handleInitiatePayment}
              disabled={payLoading}
            >
              {payLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                  <FontAwesome5 name="credit-card" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.payNowBtnText}>
                    Pay Outstanding Due (Rs. {Math.abs(walletBalance).toFixed(2)})
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Request Bank Payout Button for Positive Balance */}
          {isPositive && walletBalance > 0 && (
            <TouchableOpacity 
              style={[styles.payNowBtn, { backgroundColor: '#ffffff' }]}
              onPress={() => setWithdrawModalVisible(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="cash-outline" size={18} color="#065f46" style={{ marginRight: 8 }} />
                <Text style={[styles.payNowBtnText, { color: '#065f46' }]}>
                  Request Bank Withdrawal (Max: Rs. {walletBalance.toFixed(2)})
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#065f46" style={{ marginLeft: 6 }} />
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Doctor Withdrawal Modal */}
        <Modal
          visible={withdrawModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setWithdrawModalVisible(false)}
        >
          <View style={styles.withdrawModalOverlay}>
            <View style={[styles.withdrawModalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.withdrawModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="business" size={20} color={colors.primary} />
                  <Text style={[styles.withdrawModalTitle, { color: colors.text }]}>Withdraw to Bank Account</Text>
                </View>
                <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textLight} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 16 }}>
                <Text style={{ fontSize: 13, color: colors.textLight, marginBottom: 14 }}>
                  Available Balance: <Text style={{ fontWeight: 'bold', color: '#10b981' }}>Rs. {walletBalance.toFixed(2)}</Text>
                </Text>

                <Text style={styles.inputLabel}>Withdrawal Amount (Rs.) *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder={`e.g. ${walletBalance.toFixed(0)}`}
                  placeholderTextColor={colors.textLight}
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                />

                <Text style={styles.inputLabel}>Bank Name *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. Commercial Bank, BOC, Sampath"
                  placeholderTextColor={colors.textLight}
                  value={bankName}
                  onChangeText={setBankName}
                />

                <Text style={styles.inputLabel}>Account Number *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. 10002345678"
                  placeholderTextColor={colors.textLight}
                  keyboardType="number-pad"
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                />

                <Text style={styles.inputLabel}>Account Holder Name *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. Dr. K. A. Perera"
                  placeholderTextColor={colors.textLight}
                  value={accountHolderName}
                  onChangeText={setAccountHolderName}
                />

                <Text style={styles.inputLabel}>Branch Name (Optional)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                  placeholder="e.g. Colombo Fort"
                  placeholderTextColor={colors.textLight}
                  value={branchName}
                  onChangeText={setBranchName}
                />

                <TouchableOpacity 
                  style={[styles.confirmWithdrawBtn, { backgroundColor: colors.primary }]}
                  onPress={handleRequestPayout}
                  disabled={withdrawLoading}
                >
                  {withdrawLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmWithdrawBtnText}>Submit Payout Request</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>


        {/* PayHere Checkout Modal */}
        <Modal
          visible={payModalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setPayModalVisible(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setPayModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>PayHere Secure Payment</Text>
              <View style={{ width: 40 }} />
            </View>

            {paymentData && (
              <WebView
                source={{ html: getPayHereHtml(paymentData) }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                renderLoading={() => (
                  <View style={styles.webViewLoader}>
                    <ActivityIndicator size="large" color="#10b981" />
                    <Text style={{ marginTop: 12, color: '#475569', fontWeight: '500' }}>Loading PayHere Portal...</Text>
                  </View>
                )}
                onNavigationStateChange={(navState) => {
                  const url = navState.url;
                  // Detect return / success URL
                  if (url.includes('payment/success') || url.includes('payhere.lk/pay/success') || url.includes('status=2')) {
                    handlePaymentSuccess(paymentData.order_id);
                  } else if (url.includes('payment/cancel') || url.includes('payhere.lk/pay/cancel')) {
                    setPayModalVisible(false);
                    Alert.alert("Payment Cancelled", "Due settlement transaction was cancelled.");
                  }
                }}
              />
            )}
          </View>
        </Modal>

        {/* Info Explainer */}
        <View style={[styles.infoCard, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>How Wallet Works</Text>
            <Text style={[styles.infoText, { color: colors.textLight }]}>
              • <Text style={{ fontWeight: 'bold' }}>CARD Payments:</Text> Doctor share is credited to your balance (+).{'\n'}
              • <Text style={{ fontWeight: 'bold' }}>CASH Payments:</Text> You collect full cash, and company commission is debited (-).
            </Text>
          </View>
        </View>


        {/* Transactions Section Title */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction History (Line by Line)</Text>
          <Text style={{ fontSize: 12, color: colors.textLight }}>{transactions.length} entries</Text>
        </View>

        {/* Line by Line Transactions */}
        {transactions.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={44} color={colors.textLight} />
            <Text style={{ color: colors.textLight, marginTop: 10, fontSize: 14 }}>No wallet transactions yet.</Text>
            <Text style={{ color: colors.textLight, fontSize: 12, marginTop: 4 }}>Completed appointments will appear here.</Text>
          </View>
        ) : (
          transactions.map((tx) => {
            const isCredit = tx.type === 'CREDIT';
            return (
              <View 
                key={tx.id} 
                style={[
                  styles.txCard, 
                  { backgroundColor: colors.surface, borderColor: colors.border }
                ]}
              >
                {/* Header Row: Badge & Amount */}
                <View style={styles.txHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[
                      styles.methodBadge, 
                      { backgroundColor: tx.paymentMethod === 'CARD' ? '#dbeafe' : '#fef3c7' }
                    ]}>
                      <Ionicons 
                        name={tx.paymentMethod === 'CARD' ? 'card-outline' : 'cash-outline'} 
                        size={12} 
                        color={tx.paymentMethod === 'CARD' ? '#1e40af' : '#92400e'} 
                      />
                      <Text style={[
                        styles.methodBadgeText, 
                        { color: tx.paymentMethod === 'CARD' ? '#1e40af' : '#92400e' }
                      ]}>
                        {tx.paymentMethod}
                      </Text>
                    </View>

                    <Text style={[styles.txDate, { color: colors.textLight, marginLeft: 8 }]}>
                      {formatDateTime(tx.createdAt)}
                    </Text>
                  </View>

                  <Text style={[
                    styles.txAmount, 
                    { color: isCredit ? '#10b981' : '#ef4444' }
                  ]}>
                    {isCredit ? `+Rs. ${Math.abs(tx.amount).toFixed(2)}` : `-Rs. ${Math.abs(tx.amount).toFixed(2)}`}
                  </Text>
                </View>

                {/* Description */}
                <Text style={[styles.txDescription, { color: colors.text }]}>{tx.description}</Text>

                {/* Breakdown details */}
                <View style={[styles.txBreakdownBox, { backgroundColor: colors.surfaceLight }]}>
                  <View style={styles.breakdownCol}>
                    <Text style={styles.breakdownLabel}>Total Fee</Text>
                    <Text style={[styles.breakdownVal, { color: colors.text }]}>Rs. {tx.totalFee?.toFixed(2) || '0.00'}</Text>
                  </View>

                  <View style={styles.breakdownCol}>
                    <Text style={styles.breakdownLabel}>Platform Fee</Text>
                    <Text style={[styles.breakdownVal, { color: '#ef4444' }]}>Rs. {tx.commissionAmount?.toFixed(2) || '0.00'}</Text>
                  </View>

                  <View style={styles.breakdownCol}>
                    <Text style={styles.breakdownLabel}>Balance After</Text>
                    <Text style={[
                      styles.breakdownVal, 
                      { color: (tx.balanceAfter || 0) >= 0 ? '#10b981' : '#ef4444', fontWeight: 'bold' }
                    ]}>
                      Rs. {tx.balanceAfter?.toFixed(2) || '0.00'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  balanceAmount: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  walletIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardStatusRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  debtNoticeBox: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 10,
    borderRadius: 8,
  },
  debtNoticeText: { color: '#fef08a', fontSize: 12, lineHeight: 18 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  infoText: { fontSize: 12, lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },
  emptyBox: {
    padding: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  txHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  methodBadgeText: { fontSize: 11, fontWeight: 'bold' },
  txDate: { fontSize: 12 },
  txAmount: { fontSize: 16, fontWeight: 'bold' },
  txDescription: { fontSize: 13, marginBottom: 10, lineHeight: 18 },
  txBreakdownBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
  },
  breakdownCol: { alignItems: 'center' },
  breakdownLabel: { fontSize: 10, color: '#6b7280', marginBottom: 2 },
  breakdownVal: { fontSize: 12, fontWeight: '600' },
  payNowBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  payNowBtnText: {
    color: '#991b1b',
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  webViewLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  withdrawModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  withdrawModalContent: {
    borderRadius: 16,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  withdrawModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  withdrawModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  confirmWithdrawBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  confirmWithdrawBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default ProfessionalWalletScreen;
