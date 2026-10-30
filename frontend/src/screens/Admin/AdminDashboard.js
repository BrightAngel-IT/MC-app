import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/themeContext';

// Import Screens
import AdminOverviewScreen from './AdminOverviewScreen';
import AdminApprovalsScreen from './AdminApprovalsScreen';
import AdminAppointmentsScreen from './AdminAppointmentsScreen';
import AdminUsersScreen from './AdminUsersScreen';
import AdminFinanceScreen from './AdminFinanceScreen';

const Tab = createBottomTabNavigator();

const AdminDashboard = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Overview') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Approvals') {
            iconName = focused ? 'check-decagram' : 'check-decagram-outline';
          } else if (route.name === 'Appointments') {
            iconName = focused ? 'clipboard-check' : 'clipboard-check-outline';
          } else if (route.name === 'Finance') {
            iconName = focused ? 'cash-multiple' : 'cash-refund';
          } else if (route.name === 'Users') {
            iconName = focused ? 'account-group' : 'account-group-outline';
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
      })}
    >
      <Tab.Screen name="Overview" component={AdminOverviewScreen} />
      <Tab.Screen name="Approvals" component={AdminApprovalsScreen} />
      <Tab.Screen name="Appointments" component={AdminAppointmentsScreen} options={{ tabBarLabel: 'Audit' }} />
      <Tab.Screen name="Finance" component={AdminFinanceScreen} options={{ tabBarLabel: 'Finance' }} />
      <Tab.Screen name="Users" component={AdminUsersScreen} options={{ tabBarLabel: 'Users' }} />
    </Tab.Navigator>
  );
};

export default AdminDashboard;
