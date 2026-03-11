import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from '../screens/main/DashboardScreen';
import RegisterShiftScreen from '../screens/main/RegisterShiftScreen';
import ShiftHistoryScreen from '../screens/main/ShiftHistoryScreen';
import SalaryCompareScreen from '../screens/main/SalaryCompareScreen';
import ReportScreen from '../screens/main/ReportScreen';
import ConfigScreen from '../screens/main/ConfigScreen';

const Stack = createStackNavigator();

export default function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="RegisterShift" component={RegisterShiftScreen} />
      <Stack.Screen name="History" component={ShiftHistoryScreen} />
      <Stack.Screen name="Compare" component={SalaryCompareScreen} />
      <Stack.Screen name="Report" component={ReportScreen} />
      <Stack.Screen name="Config" component={ConfigScreen} />
    </Stack.Navigator>
  );
}
