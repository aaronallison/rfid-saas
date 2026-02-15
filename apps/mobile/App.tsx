import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { DatabaseService } from './src/services/database';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      await DatabaseService.initDatabase();
      setIsDbReady(true);
    } catch (error) {
      console.error('Database initialization failed:', error);
      setDbError(error instanceof Error ? error.message : 'Unknown database error');
      
      // Show user-friendly error alert
      Alert.alert(
        'Database Error',
        'Failed to initialize the local database. Some features may not work properly.',
        [
          {
            text: 'Retry',
            onPress: () => {
              setDbError(null);
              initializeDatabase();
            },
          },
          {
            text: 'Continue Anyway',
            onPress: () => setIsDbReady(true),
            style: 'cancel',
          },
        ]
      );
    }
  };

  // Show loading screen while database initializes
  if (!isDbReady && !dbError) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Initializing database...</Text>
        </View>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});