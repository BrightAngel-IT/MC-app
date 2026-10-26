import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator } from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';

import { AuthContext } from '../context/authContext';
import { useTheme } from '../context/themeContext';
import LoginScreen from '../screens/Auth/loginScreen';
import RegisterScreen from '../screens/Auth/registerScreen';
import PendingApprovalScreen from '../screens/Auth/PendingApprovalScreen';

import PatientDashboard from '../screens/patient/patientDashboard';
import DoctorSearch from '../screens/patient/DoctorSearch';
import AppointmentsScreen from '../screens/patient/AppointmentsScreen';
import ProfileScreen from '../screens/patient/ProfileScreen';
import PharmacyScreen from '../screens/patient/PharmacyScreen';
import PharmacyShopScreen from '../screens/patient/PharmacyShopScreen';
import AllProductsScreen from '../screens/patient/AllProductsScreen';
import NurseScreen from '../screens/patient/NurseScreen';
import LabTechSearch from '../screens/patient/LabTechSearch';
import ParamedicSearch from '../screens/patient/ParamedicSearch';
import CaregiverSearch from '../screens/patient/CaregiverSearch';
import ElderHomeSearch from '../screens/patient/ElderHomeSearch';
import ElderHomeDetailScreen from '../screens/patient/ElderHomeDetailScreen';
import ElderHomeDashboard from '../screens/ElderHome/ElderHomeDashboard';
import ProfessionalDashboard from '../screens/Professional/ProfessionalDashboard';
import ProfessionalAppointments from '../screens/Professional/ProfessionalAppointments';
import ParamedicSOS from '../screens/Professional/ParamedicSOS';
import VendorDashboard from '../screens/Vendor/VendorDashboard';
import VendorProductsScreen from '../screens/Vendor/VendorProductsScreen';
import VendorOrdersScreen from '../screens/Vendor/VendorOrdersScreen';
import AdminDashboard from '../screens/Admin/AdminDashboard';
import ReportsScreen from '../screens/ReportsScreen';
import AdminReportsScreen from '../screens/Admin/AdminReportsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import CalendarScreen from '../screens/CalendarScreen';
import EditProfessionalProfileScreen from '../screens/Professional/EditProfessionalProfileScreen';
import AdminProfileScreen from '../screens/Admin/AdminProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Patient Bottom Tabs
const PatientTabs = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          elevation: 5,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={PatientDashboard} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="home" color={color} size={size} />
          )
        }} 
      />
      <Tab.Screen 
        name="AppointmentsTab" 
        component={AppointmentsScreen} 
        options={{
          tabBarLabel: 'Appointments',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="calendar-alt" color={color} size={size} />
          )
        }} 
      />
      <Tab.Screen 
        name="PrescriptionsTab" 
        component={PharmacyScreen} 
        options={{
          tabBarLabel: 'Prescriptions',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="file-medical" color={color} size={size} />
          )
        }} 
      />
      <Tab.Screen 
        name="ReportsTab" 
        component={ReportsScreen} 
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="chart-bar" color={color} size={size} />
          )
        }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          )
        }} 
      />
    </Tab.Navigator>
  );
};

// Professional Bottom Tabs
const ProfessionalTabs = () => {
  const { colors } = useTheme();
  const { user } = useContext(AuthContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          elevation: 5,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen 
        name="ProfessionalHome" 
        component={ProfessionalDashboard} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="home" color={color} size={size} />
          )
        }} 
      />
      {user?.role === 'PARAMEDIC' ? (
        <Tab.Screen 
          name="SOSRequests" 
          component={ParamedicSOS} 
          options={{
            tabBarLabel: 'SOS Alerts',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="ambulance" color={color} size={size} />
            )
          }} 
        />
      ) : (
        <Tab.Screen 
          name="AppointmentsTab" 
          component={ProfessionalAppointments} 
          options={{
            tabBarLabel: 'Appointments',
            tabBarIcon: ({ color, size }) => (
              <FontAwesome5 name="calendar-check" color={color} size={size} />
            )
          }} 
        />
      )}
      <Tab.Screen 
        name="ReportsTab" 
        component={ReportsScreen} 
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="chart-bar" color={color} size={size} />
          )
        }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          )
        }} 
      />
    </Tab.Navigator>
  );
};

// Vendor Bottom Tabs
const VendorTabs = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, elevation: 5 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen 
        name="VendorHome" component={VendorDashboard} 
        options={{ tabBarLabel: 'Home', tabBarIcon: ({ color, size }) => (<FontAwesome5 name="store" color={color} size={size} />) }} 
      />
      <Tab.Screen 
        name="VendorOrders" component={VendorOrdersScreen} 
        options={{ tabBarLabel: 'Orders', tabBarIcon: ({ color, size }) => (<FontAwesome5 name="clipboard-list" color={color} size={size} />) }} 
      />
      <Tab.Screen 
        name="VendorProducts" component={VendorProductsScreen} 
        options={{ tabBarLabel: 'Products', tabBarIcon: ({ color, size }) => (<FontAwesome5 name="box-open" color={color} size={size} />) }} 
      />
      <Tab.Screen 
        name="ReportsTab" component={ReportsScreen} 
        options={{ tabBarLabel: 'Reports', tabBarIcon: ({ color, size }) => (<FontAwesome5 name="chart-bar" color={color} size={size} />) }} 
      />
      <Tab.Screen 
        name="ProfileTab" component={ProfileScreen} 
        options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color, size }) => (<Ionicons name="person" color={color} size={size} />) }} 
      />
    </Tab.Navigator>
  );
};

// Admin Bottom Tabs
const AdminTabs = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, elevation: 5 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen 
        name="AdminHome" component={AdminDashboard} 
        options={{ tabBarLabel: 'Dashboard', tabBarIcon: ({ color, size }) => (<FontAwesome5 name="tachometer-alt" color={color} size={size} />) }} 
      />
      <Tab.Screen 
        name="AdminReports" component={AdminReportsScreen} 
        options={{ tabBarLabel: 'Reports', tabBarIcon: ({ color, size }) => (<FontAwesome5 name="chart-pie" color={color} size={size} />) }} 
      />
      <Tab.Screen 
        name="ProfileTab" component={AdminProfileScreen} 
        options={{ tabBarLabel: 'Settings', tabBarIcon: ({ color, size }) => (<Ionicons name="settings-sharp" color={color} size={size} />) }} 
      />
    </Tab.Navigator>
  );
};

// Elder Home Bottom Tabs
const ElderHomeTabs = () => {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, elevation: 5 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen 
        name="ElderHomeHome" component={ElderHomeDashboard} 
        options={{ tabBarLabel: 'Dashboard', tabBarIcon: ({ color, size }) => (<FontAwesome5 name="home" color={color} size={size} />) }} 
      />
      <Tab.Screen 
        name="ReportsTab" component={ReportsScreen} 
        options={{ tabBarLabel: 'Reports', tabBarIcon: ({ color, size }) => (<FontAwesome5 name="chart-bar" color={color} size={size} />) }} 
      />
      <Tab.Screen 
        name="ProfileTab" component={ProfileScreen} 
        options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color, size }) => (<Ionicons name="person" color={color} size={size} />) }} 
      />
    </Tab.Navigator>
  );
};

// Main Patient Stack (includes Tabs + hidden screens like DoctorSearch)
const PatientStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={PatientTabs} />
      <Stack.Screen 
        name="DoctorSearch" 
        component={DoctorSearch} 
        options={{ 
          headerShown: true, 
          title: 'Find a Doctor',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <Stack.Screen 
        name="PharmacyScreen" 
        component={PharmacyScreen} 
        options={{ 
          headerShown: true, 
          title: 'Online Pharmacy',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <Stack.Screen 
        name="PharmacyShopScreen" 
        component={PharmacyShopScreen} 
        options={({ route }) => ({ 
          headerShown: true, 
          title: route.params?.pharmacyName || 'Pharmacy Shop',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        })} 
      />
      <Stack.Screen 
        name="AllProductsScreen" 
        component={AllProductsScreen} 
        options={{ 
          headerShown: true, 
          title: 'Medical Equipment & Products',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <Stack.Screen 
        name="NurseScreen" 
        component={NurseScreen} 
        options={{ 
          headerShown: true, 
          title: 'Home Nursing',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <Stack.Screen 
        name="LabTechSearch" 
        component={LabTechSearch} 
        options={{ 
          headerShown: true, 
          title: 'Medical Tests',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <Stack.Screen 
        name="ParamedicSearch" 
        component={ParamedicSearch} 
        options={{ 
          headerShown: true, 
          title: 'Ambulance & Transport',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <Stack.Screen 
        name="CaregiverSearch" 
        component={CaregiverSearch} 
        options={{ 
          headerShown: true, 
          title: 'Elder Care',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <Stack.Screen 
        name="ElderHomeSearch" 
        component={ElderHomeSearch} 
        options={{ 
          headerShown: true, 
          title: 'Elder Homes',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }} 
      />
      <Stack.Screen 
        name="ElderHomeDetail" 
        component={ElderHomeDetailScreen} 
        options={({ route }) => ({ 
          headerShown: true, 
          title: route.params?.elderHome?.fullName || 'Elder Home Profile',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        })} 
      />
    </Stack.Navigator>
  );
};

const linking = {
  prefixes: ['/'],
  config: {
    screens: {
      Login: 'login',
      Register: 'register',
      PendingApproval: 'pending-approval',
      AdminApp: 'admin',
      VendorApp: 'vendor',
      ElderHomeApp: 'elder-home',
      ProfessionalApp: 'doctor',
      PatientApp: 'patient',
      EditProfessionalProfile: 'EditProfessionalProfile',
      Notifications: 'notifications',
      Calendar: 'calendar',
    }
  }
};

const AppNavigator = () => {
  const { user, loading } = useContext(AuthContext);
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0891b2" />
      </View>
    );
  }

  const renderScreens = () => {
    if (!user) {
      return (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      );
    }

    if (user.verificationStatus === 'PENDING' || user.verificationStatus === 'REJECTED') {
      return (
        <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      );
    }

    let MainRoleApp = PatientStack;
    let mainRoleName = "PatientApp";

    if (user.role === 'ADMIN') {
      MainRoleApp = AdminTabs;
      mainRoleName = "AdminApp";
    } else if (user.role === 'VENDOR' || user.role === 'PHARMACIST') {
      MainRoleApp = VendorTabs;
      mainRoleName = "VendorApp";
    } else if (user.role === 'ELDER_HOME') {
      MainRoleApp = ElderHomeTabs;
      mainRoleName = "ElderHomeApp";
    } else if (['DOCTOR', 'NURSE', 'PARAMEDIC', 'LAB_TECH', 'CAREGIVER'].includes(user.role)) {
      MainRoleApp = ProfessionalTabs;
      mainRoleName = "ProfessionalApp";
    }

    return (
      <>
        <Stack.Screen name={mainRoleName} component={MainRoleApp} />
        <Stack.Screen 
          name="EditProfessionalProfile" 
          component={EditProfessionalProfileScreen} 
          options={{ 
            headerShown: true, 
            title: 'Edit Personal Details',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }} 
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationsScreen} 
          options={{ 
            headerShown: true, 
            title: 'Notifications',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }} 
        />
        <Stack.Screen 
          name="Calendar" 
          component={CalendarScreen} 
          options={{ 
            headerShown: true, 
            title: 'My Calendar',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }} 
        />
      </>
    );
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {renderScreens()}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
