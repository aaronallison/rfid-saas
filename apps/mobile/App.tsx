import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseService } from './src/services/database';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeDatabase = async () => {
      try {
        await DatabaseService.initDatabase();
        if (isMounted) {
          setIsDbReady(true);
        }
      } catch (error) {
        console.error('Database initialization failed:', error);
        if (isMounted) {
          setDbError(
            error instanceof Error 
              ? error.message 
              : 'Failed to initialize database'
          );
        }
      }
    };

    initializeDatabase();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, []);

  // Show loading screen while database initializes
  if (!isDbReady && !dbError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, color: '#666' }}>
          Initializing database...
        </Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  // Show error screen if database initialization fails
  if (dbError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#FF3B30', marginBottom: 10 }}>
          Database Error
        </Text>
        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 20 }}>
          {dbError}
        </Text>
        <Text style={{ textAlign: 'center', color: '#666', fontSize: 12 }}>
          Please restart the app. If the problem persists, contact support.
        </Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}