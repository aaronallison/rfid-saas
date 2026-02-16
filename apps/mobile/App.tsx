import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseService } from './src/services/database';

export default function App() {
  useEffect(() => {
    // Initialize the database when the app starts
    const initializeApp = async () => {
      try {
        await DatabaseService.initDatabase();
      } catch (error) {
        console.error('Failed to initialize database:', error);
        // You might want to show an error screen or fallback here
      }
    };
    
    initializeApp();
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