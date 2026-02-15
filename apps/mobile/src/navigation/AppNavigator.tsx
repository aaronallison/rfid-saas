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
};

export type MainTabParamList = {
  BatchesTab: undefined;
  RfidSettings: undefined;
  TagStream: undefined;
  Sync: undefined;
};

export type BatchesStackParamList = {
  BatchesList: undefined;
  CreateBatch: undefined;
  Capture: { batchId: number; batchName: string };
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const BatchesStack = createStackNavigator<BatchesStackParamList>();

// Batches Stack Navigator
function BatchesStackNavigator() {
  return (
    <BatchesStack.Navigator
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
      <BatchesStack.Screen
        name="BatchesList"
        component={BatchesListScreen}
        options={{ 
          headerShown: false, // Will be handled by tab navigator
        }}
      />
      <BatchesStack.Screen
        name="CreateBatch"
        component={CreateBatchScreen}
        options={{ 
          title: 'Create Batch',
          presentation: 'modal',
        }}
      />
      <BatchesStack.Screen
        name="Capture"
        component={CaptureScreen}
        options={({ route }) => ({ 
          title: `Capture - ${route.params.batchName}`,
        })}
      />
    </BatchesStack.Navigator>
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
          paddingBottom: 8,
          paddingTop: 8,
          height: 70,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="BatchesTab"
        component={BatchesStackNavigator}
        options={{
          tabBarLabel: 'Batches',
          headerShown: true,
          headerTitle: 'Batches',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTitleStyle: {
            color: '#fff',
            fontWeight: 'bold',
          },
          headerTintColor: '#fff',
          // You can add tab icons here with tabBarIcon
        }}
      />
      <Tab.Screen
        name="RfidSettings"
        component={ReaderSettingsScreen}
        options={{
          tabBarLabel: 'RFID Settings',
          headerShown: true,
          headerTitle: 'RFID Reader',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTitleStyle: {
            color: '#fff',
            fontWeight: 'bold',
          },
          headerTintColor: '#fff',
          // You can add tab icons here with tabBarIcon
        }}
      />
      <Tab.Screen
        name="TagStream"
        component={TagStreamScreen}
        options={{
          tabBarLabel: 'Tag Stream',
          headerShown: true,
          headerTitle: 'Tag Stream',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTitleStyle: {
            color: '#fff',
            fontWeight: 'bold',
          },
          headerTintColor: '#fff',
          // You can add tab icons here with tabBarIcon
        }}
      />
      <Tab.Screen
        name="Sync"
        component={SyncScreen}
        options={{
          tabBarLabel: 'Sync',
          headerShown: true,
          headerTitle: 'Sync',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTitleStyle: {
            color: '#fff',
            fontWeight: 'bold',
          },
          headerTintColor: '#fff',
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
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}