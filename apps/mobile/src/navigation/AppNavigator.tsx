import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import OrganizationSelectScreen from '../screens/OrganizationSelectScreen';
import BatchesListScreen from '../screens/BatchesListScreen';
import CreateBatchScreen from '../screens/CreateBatchScreen';
import CaptureScreen from '../screens/CaptureScreen';
import SyncScreen from '../screens/SyncScreen';
import ReaderSettingsScreen from '../screens/ReaderSettingsScreen';
import TagStreamScreen from '../screens/TagStreamScreen';

export type RootStackParamList = {
  Login: undefined;
  OrganizationSelect: undefined;
  Main: undefined;
  CreateBatch: undefined;
  Capture: { batchId: number; batchName: string };
  ReaderSettings: undefined;
  TagStream: undefined;
};

export type MainTabParamList = {
  Batches: undefined;
  RFID: undefined;
  Sync: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Simple RFID screen with built-in tabs
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
      }}
    >
      <Tab.Screen
        name="Batches"
        component={BatchesListScreen}
        options={{
          tabBarLabel: 'Batches',
          // You can add tab icons here with tabBarIcon
        }}
      />
      <Tab.Screen
        name="RFID"
        component={ReaderSettingsScreen}
        options={{
          tabBarLabel: 'RFID',
          headerShown: true,
          headerTitle: 'RFID Reader',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTitleStyle: {
            color: '#fff',
            fontWeight: 'bold',
          },
          // You can add tab icons here with tabBarIcon
        }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncScreen}
        options={{
          tabBarLabel: 'Sync',
          // You can add tab icons here with tabBarIcon
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, selectedOrganization, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {!user ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : !selectedOrganization ? (
          <Stack.Screen
            name="OrganizationSelect"
            component={OrganizationSelectScreen}
            options={{ title: 'Select Organization' }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="CreateBatch"
              component={CreateBatchScreen}
              options={{ title: 'Create Batch' }}
            />
            <Stack.Screen
              name="Capture"
              component={CaptureScreen}
              options={({ route }) => ({ 
                title: `Capture - ${route.params.batchName}` 
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}