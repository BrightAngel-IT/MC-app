import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/themeContext';
import { useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/authContext';
import api from '../api/axios';

const STORAGE_KEY = '@medical_care_chat_sessions';

const getInitialGreetingForRole = (role, fullName) => {
  const name = fullName ? ` ${fullName}` : '';
  const r = (role || 'PATIENT').toUpperCase();

  switch (r) {
    case 'DOCTOR':
      return {
        id: '1',
        sender: 'ai',
        text: `Hello Dr.${name}! 👨‍⚕️ I am your Practice AI Assistant. I can help guide you with appointments, working area & visiting fees, patient consultations, prescriptions, and your wallet earnings. (English, සිංහල, or தமிழ்)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    case 'NURSE':
      return {
        id: '1',
        sender: 'ai',
        text: `Hello Nurse${name}! 👩‍⚕️ I am your Professional Assistant. Ask me anything about home nursing visits, patient care logs, managing your availability, and earnings. (English, සිංහල, or தமிழ்)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    case 'PARAMEDIC':
      return {
        id: '1',
        sender: 'ai',
        text: `Hello Officer${name}! 🚑 I am your Emergency Operations Assistant. I can guide you through active SOS ambulance dispatches, turn-by-turn navigation, patient contact, and ride billing. (English, සිංහල, or தமிழ்)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    case 'LAB_TECH':
      return {
        id: '1',
        sender: 'ai',
        text: `Hello Lab Specialist${name}! 🧪 I am here to help you manage home sample collections, lab test appointments, test reports, and service radius. (English, සිංහල, or தமிழ்)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    case 'CAREGIVER':
      return {
        id: '1',
        sender: 'ai',
        text: `Hello Caregiver${name}! 🤝 I am your Care Assistant. I can guide you on patient home care requests, working hours, and payment settlements. (English, සිංහල, or தமிழ்)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    case 'PHARMACY':
    case 'VENDOR':
      return {
        id: '1',
        sender: 'ai',
        text: `Hello Pharmacy Partner${name}! 💊 I can help you process prescription orders, quote prices, manage products & stock, and update your pharmacy location. (English, සිංහල, or தமிழ்)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    case 'ELDER_HOME':
      return {
        id: '1',
        sender: 'ai',
        text: `Hello Elder Care Partner${name}! 🏡 I can guide you on publishing facility photos, advertising room packages, managing visitor guidelines, and inquiries. (English, සිංහල, or தமிழ்)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    case 'ADMIN':
      return {
        id: '1',
        sender: 'ai',
        text: `Hello Administrator${name}! 🛡️ I am your Platform Management Guide. I can help with platform analytics, approving doctors/nurses, system commission, and distance rates.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    default:
      return {
        id: '1',
        sender: 'ai',
        text: `Hello${name}! 🩺 I am your Personal Health Assistant. How can I assist you with booking doctors, ambulance SOS, home care, or finding services today? (English, සිංහල, or தமிழ்)`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
  }
};

const getSuggestionsForRole = (role) => {
  const r = (role || 'PATIENT').toUpperCase();
  switch (r) {
    case 'DOCTOR':
      return [
        { label: '📍 Set Working Area & Fee', query: 'How do I set my visiting fees and service radius on the map?' },
        { label: '📅 View Appointments', query: 'Where can I see upcoming patient booking requests and confirm them?' },
        { label: '💳 Wallet & Dues', query: 'How does the doctor wallet, cash deductions, and card payouts work?' },
        { label: '💊 Issue Prescription', query: 'How do I issue an electronic prescription to a patient?' }
      ];
    case 'NURSE':
      return [
        { label: '📍 Change Service Area', query: 'How do I set my home visiting radius and location?' },
        { label: '🟢 Toggle Availability', query: 'How do I turn my availability status ON or OFF?' },
        { label: '📅 Accept Nurse Bookings', query: 'How do I accept patient home nursing visit requests?' },
        { label: '💰 Check My Earnings', query: 'How do I check my completed visits and wallet balance?' }
      ];
    case 'PARAMEDIC':
      return [
        { label: '🚨 SOS Dispatch Flow', query: 'How does receiving and accepting an emergency ambulance SOS alert work?' },
        { label: '🗺️ GPS Route to Patient', query: 'How do I open Google Maps navigation to reach the patient?' },
        { label: '💳 Ride Fare & Payment', query: 'How do I bill the patient with cash or card after completing the emergency ride?' },
        { label: '📞 Contact Patient', query: 'How do I call the patient who triggered the emergency SOS?' }
      ];
    case 'PHARMACY':
    case 'VENDOR':
      return [
        { label: '📋 Process Prescriptions', query: 'How do I view uploaded patient prescriptions and attach medicine prices?' },
        { label: '💊 Add New Products', query: 'How do I add medical items, medicine, and prices to my store catalogue?' },
        { label: '📍 Set Store Location', query: 'How do I update my pharmacy GPS location so nearby patients can order?' },
        { label: '🚚 Dispatch Orders', query: 'How do I mark an order as dispatched or ready for pickup?' }
      ];
    case 'ELDER_HOME':
      return [
        { label: '📸 Publish Ads / Photos', query: 'How do I publish facility photos and updates to attract new residents?' },
        { label: '🛏️ Add Room Packages', query: 'How do I add AC and Non-AC monthly pricing packages?' },
        { label: '⏰ Visiting Hours & Rules', query: 'Where do I edit visiting hours, WhatsApp number, and elder care rules?' },
        { label: '📞 Inquiries & Residents', query: 'How do families contact our elder home through the app?' }
      ];
    case 'ADMIN':
      return [
        { label: '👥 Approve Professionals', query: 'Where do I review and approve pending doctor and nurse licenses?' },
        { label: '📊 System Revenue', query: 'How can I view platform commission earnings and transactions?' },
        { label: '⚙️ Distance Rate Settings', query: 'How do I change the per-km travel rate and company commission %?' },
        { label: '🚨 SOS Activity Log', query: 'Where can I monitor all emergency SOS dispatches across the platform?' }
      ];
    default:
      return [
        { label: '🩺 Book a Doctor', query: 'How do I search and book a nearby doctor for a home visit?' },
        { label: '🚨 Emergency SOS', query: 'How does the Emergency Ambulance SOS button work?' },
        { label: '💊 Order Medicines', query: 'How do I upload a doctor prescription to buy medicines?' },
        { label: '👩‍⚕️ Hire a Home Nurse', query: 'How can I find a qualified nurse or caregiver for an elderly patient?' }
      ];
  }
};

const ChatbotScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useContext(AuthContext);
  const flatListRef = useRef();

  const userRole = user?.role || 'PATIENT';
  const userName = user?.fullName || user?.fullname || '';
  const initialGreeting = getInitialGreetingForRole(userRole, userName);
  const suggestions = getSuggestionsForRole(userRole);

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([initialGreeting]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  // Load saved sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSessions(parsed);
          // Load the latest session
          const latest = parsed[0];
          setCurrentSessionId(latest.id);
          setMessages(latest.messages || [initialGreeting]);
          return;
        }
      }
      // If no stored sessions, create first session
      createNewChatSession();
    } catch (err) {
      console.log('Error loading chat history:', err);
      createNewChatSession();
    }
  };

  const saveSessionsToStorage = async (updatedSessions) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
    } catch (err) {
      console.log('Error saving sessions:', err);
    }
  };

  const createNewChatSession = () => {
    const newSession = {
      id: Date.now().toString(),
      title: `${userRole} Query`,
      date: new Date().toLocaleDateString(),
      messages: [initialGreeting]
    };

    setSessions(prev => {
      // Don't keep empty default sessions
      const filtered = prev.filter(s => s.messages && s.messages.length > 1);
      const updated = [newSession, ...filtered];
      saveSessionsToStorage(updated);
      return updated;
    });

    setCurrentSessionId(newSession.id);
    setMessages([initialGreeting]);
    setHistoryModalVisible(false);
  };

  const selectSession = (session) => {
    setCurrentSessionId(session.id);
    setMessages(session.messages || [initialGreeting]);
    setHistoryModalVisible(false);
  };

  const performDeleteSession = (sessionId) => {
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== sessionId);
      saveSessionsToStorage(updated);

      if (currentSessionId === sessionId) {
        if (updated.length > 0) {
          selectSession(updated[0]);
        } else {
          createNewChatSession();
        }
      }
      return updated;
    });
  };

  const deleteSession = (sessionId) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("Are you sure you want to delete this chat history?");
      if (confirmed) {
        performDeleteSession(sessionId);
      }
      return;
    }

    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDeleteSession(sessionId)
        }
      ]
    );
  };

  const performClearAll = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      setSessions([]);
      createNewChatSession();
    } catch (e) {
      console.log('Error clearing history:', e);
    }
  };

  const clearAllHistory = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm("This will permanently remove all your previous chats. Are you sure?");
      if (confirmed) {
        performClearAll();
      }
      return;
    }

    Alert.alert(
      "Clear All History",
      "This will remove all your previous medical chats.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: performClearAll
        }
      ]
    );
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    // Update session title with user query if it was first message
    const sessionTitle = messages.length <= 1 ? (userText.slice(0, 32) + (userText.length > 32 ? '...' : '')) : undefined;

    try {
      const res = await api.post('/chatbot/message', {
        message: userText,
        history: messages.map(m => ({ sender: m.sender, text: m.text }))
      });

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: res.data?.reply || "I didn't quite catch that. Could you please rephrase?",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);

      // Persist session
      setSessions(prev => {
        const updated = prev.map(s => {
          if (s.id === currentSessionId) {
            return {
              ...s,
              title: sessionTitle || s.title,
              messages: finalMessages,
              date: new Date().toLocaleDateString()
            };
          }
          return s;
        });
        saveSessionsToStorage(updated);
        return updated;
      });

    } catch (err) {
      console.error('Chatbot API error:', err);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "Connection issue. Please make sure your internet is stable and try again.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages([...newMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, loading]);

  const renderItem = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.userRow : styles.aiRow]}>
        {!isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
            <Ionicons name="medical" size={14} color="#fff" />
          </View>
        )}
        <View style={[
          styles.msgBubble,
          isUser 
            ? { backgroundColor: colors.primary } 
            : { backgroundColor: colors.surface, borderColor: colors.border }
        ]}>
          <Text style={[styles.msgText, { color: isUser ? '#fff' : colors.text }]}>
            {item.text}
          </Text>
          <Text style={[styles.timeText, { color: isUser ? 'rgba(255,255,255,0.7)' : colors.textLight }]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Medical AI Assistant</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={styles.onlineDot} />
            <Text style={{ fontSize: 11, color: '#10B981', fontWeight: 'bold' }}>Online 24/7</Text>
          </View>
        </View>

        {/* History Button */}
        <TouchableOpacity 
          onPress={() => setHistoryModalVisible(true)} 
          style={[styles.actionPillBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
          title="Chat History"
        >
          <Ionicons name="time-outline" size={16} color={colors.text} />
          <Text style={[styles.actionPillText, { color: colors.text }]}>History</Text>
        </TouchableOpacity>

        {/* New Chat Button */}
        <TouchableOpacity 
          onPress={createNewChatSession} 
          style={[styles.actionPillBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30', marginLeft: 6 }]}
          title="Start New Chat"
        >
          <Ionicons name="add" size={18} color={colors.primary} />
          <Text style={[styles.actionPillText, { color: colors.primary, fontWeight: 'bold' }]}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Message List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          loading ? (
            <View style={styles.typingRow}>
              <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
                <Ionicons name="medical" size={14} color="#fff" />
              </View>
              <View style={[styles.msgBubble, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          ) : null
        }
      />

      {/* Suggestions Pills (Role-Adaptive) */}
      {suggestions && suggestions.length > 0 && messages.length <= 2 && (
        <View style={styles.suggestionsWrapper}>
          <Text style={[styles.suggestionsHeader, { color: colors.textLight }]}>Quick Suggestions:</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={suggestions}
            keyExtractor={(item, index) => index.toString()}
            contentContainerStyle={styles.suggestionsList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.suggestionChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  setInputText(item.query);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.suggestionChipText, { color: colors.primary }]}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder={
              userRole === 'DOCTOR' ? "Ask about appointments, visiting fees, wallet..." :
              userRole === 'NURSE' ? "Ask about nursing requests, schedule, earnings..." :
              userRole === 'PARAMEDIC' ? "Ask about ambulance SOS dispatches, routes..." :
              userRole === 'PHARMACY' || userRole === 'VENDOR' ? "Ask about orders, products, store location..." :
              userRole === 'ELDER_HOME' ? "Ask about publishing ads, packages, inquiries..." :
              userRole === 'ADMIN' ? "Ask about system revenue, approvals, settings..." :
              "Ask about symptoms, doctors, SOS advice..."
            }
            placeholderTextColor={colors.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            returnKeyType="send"
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn, 
              { backgroundColor: inputText.trim() ? colors.primary : (colors.surfaceLight || '#e2e8f0') }
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || loading}
          >
            <Ionicons name="send" size={16} color={inputText.trim() ? '#fff' : colors.textLight} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Chat History Sidebar / Modal */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.historyModalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="time" size={20} color={colors.primary} />
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Chat History</Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.iconBtn}>
                <Ionicons name="close" size={22} color={colors.textLight} />
              </TouchableOpacity>
            </View>

            {/* Action Bar inside modal */}
            <View style={styles.historyActionRow}>
              <TouchableOpacity 
                style={[styles.newChatModalBtn, { backgroundColor: colors.primary }]}
                onPress={createNewChatSession}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.newChatModalBtnText}>Start New Chat</Text>
              </TouchableOpacity>

              {sessions.length > 0 && (
                <TouchableOpacity 
                  style={styles.clearAllBtn}
                  onPress={clearAllHistory}
                >
                  <Text style={{ fontSize: 12, color: colors.danger || '#ef4444', fontWeight: '600' }}>Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Sessions List */}
            {sessions.length === 0 ? (
              <View style={styles.emptyHistoryBox}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.textLight} />
                <Text style={{ color: colors.textLight, marginTop: 10, fontSize: 13 }}>No previous chats yet.</Text>
              </View>
            ) : (
              <FlatList
                data={sessions}
                keyExtractor={s => s.id}
                contentContainerStyle={{ paddingVertical: 8 }}
                renderItem={({ item }) => {
                  const isActive = item.id === currentSessionId;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.sessionItem,
                        { borderColor: isActive ? colors.primary : colors.border },
                        isActive && { backgroundColor: colors.primary + '12' }
                      ]}
                      onPress={() => selectSession(item)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
                          {item.title || 'Previous Query'}
                        </Text>
                        <Text style={[styles.sessionDate, { color: colors.textLight }]}>
                          {item.date} • {item.messages ? item.messages.length - 1 : 0} messages
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => deleteSession(item.id)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger || '#ef4444'} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ChatbotScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 5 },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4
  },
  actionPillText: { fontSize: 12 },
  listContent: { padding: 16, paddingBottom: 20 },
  msgRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  aiRow: { justifyContent: 'flex-start' },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4
  },
  msgBubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  msgText: { fontSize: 14, lineHeight: 20 },
  timeText: { fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  typingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    maxHeight: 100
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  historyModalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 18
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1
  },
  modalHeaderTitle: { fontSize: 17, fontWeight: 'bold' },
  historyActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12
  },
  newChatModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6
  },
  newChatModalBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  clearAllBtn: { padding: 6 },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 4
  },
  sessionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  sessionDate: { fontSize: 11 },
  deleteBtn: { padding: 6 },
  emptyHistoryBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  suggestionsWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  suggestionsHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsList: {
    gap: 8,
    paddingRight: 16,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionChipText: {
    fontSize: 12,
    fontWeight: '600',
  }
});
