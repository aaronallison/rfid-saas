import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PermissionsAndroid, Platform } from 'react-native';
import { RfidService } from '@/services/rfid';
import { 
  ReaderSettingsScreen, 
  TagStreamScreen, 
  CaptureScreen 
} from '@/screens';

const Stack = createStackNavigator();

const App: React.FC = () => {
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Request location permissions
    if (Platform.OS === 'android') {
      try {
        await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs location access to tag captures with GPS coordinates',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
      } catch (err) {
        console.warn('Location permission error:', err);
      }
    }

    // Initialize RFID service with saved configuration
    try {
      const rfidService = RfidService.getInstance();
      await rfidService.initializeWithSavedConfig();
    } catch (error) {
      console.error('Failed to initialize RFID service:', error);
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Capture"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Capture"
          component={CaptureScreen}
          options={{
            title: 'RFID Capture',
            headerRight: () => null,
          }}
        />
        <Stack.Screen
          name="ReaderSettings"
          component={ReaderSettingsScreen}
          options={{ title: 'Reader Settings' }}
        />
        <Stack.Screen
          name="TagStream"
          component={TagStreamScreen}
          options={{ title: 'Tag Stream' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;