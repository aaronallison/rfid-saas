import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseService } from './src/services/database';
import { RfidService } from './src/services/rfid';

export default function App() {
  useEffect(() => {
    // Initialize the database when the app starts
    DatabaseService.initDatabase().catch(console.error);
    
    // Initialize the RFID service
    RfidService.getInstance().initialize().catch(console.error);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}