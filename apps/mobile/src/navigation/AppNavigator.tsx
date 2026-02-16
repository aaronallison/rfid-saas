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

export type RfidTabParamList = {
  Settings: undefined;
  Stream: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const RfidTab = createBottomTabNavigator<RfidTabParamList>();

// RFID screen with nested tabs for Settings and Stream
function RfidTabs() {
  return (
    <RfidTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: { 
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E7',
        },
      }}
    >
      <RfidTab.Screen
        name="Settings"
        component={ReaderSettingsScreen}
        options={{ 
          tabBarLabel: 'Reader Settings',
          // You can add tab icons here with tabBarIcon
        }}
      />
      <RfidTab.Screen
        name="Stream"
        component={TagStreamScreen}
        options={{ 
          tabBarLabel: 'Tag Stream',
          // You can add tab icons here with tabBarIcon
        }}
      />
    </RfidTab.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E7',
          paddingBottom: 5,
          paddingTop: 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Batches"
        component={BatchesListScreen}
        options={{
          tabBarLabel: 'Batches',
          // TODO: Add tab icon - tabBarIcon: ({ color, size }) => <Icon name="list" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="RFID"
        component={RfidTabs}
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
          // TODO: Add tab icon - tabBarIcon: ({ color, size }) => <Icon name="radio" size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncScreen}
        options={{
          tabBarLabel: 'Sync',
          // TODO: Add tab icon - tabBarIcon: ({ color, size }) => <Icon name="sync" size={size} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, selectedOrganization, loading } = useAuth();

  // Show loading screen while checking authentication state
  if (loading) {
    // TODO: Replace with a proper loading screen component
    return null;
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