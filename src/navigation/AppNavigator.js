import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { currentUser } = useAuth();
  return (
    <NavigationContainer>
      {currentUser ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
