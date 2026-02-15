import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/database';
import { Batch } from '../types';
import { BatchesStackParamList } from '../navigation/AppNavigator';

type BatchesListScreenNavigationProp = StackNavigationProp<BatchesStackParamList, 'BatchesList'>;

interface Props {
  navigation: BatchesListScreenNavigationProp;
}

export default function BatchesListScreen({ navigation }: Props) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { selectedOrganization, signOut } = useAuth();

  const loadBatches = async () => {
    if (!selectedOrganization) return;

    try {
      const batchList = await DatabaseService.getBatches(selectedOrganization.id);
      setBatches(batchList);
    } catch (error) {
      console.error('Error loading batches:', error);
      Alert.alert('Error', 'Failed to load batches');
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBatches();
    }, [selectedOrganization])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBatches();
    setRefreshing(false);
  };

  const handleCreateBatch = () => {
    navigation.navigate('CreateBatch');
  };

  const handleBatchPress = (batch: Batch) => {
    Alert.alert(
      batch.name,
      'What would you like to do?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Start Capture',
          onPress: () => navigation.navigate('Capture', { 
            batchId: batch.id!, 
            batchName: batch.name 
          }),
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          onPress: signOut,
        },
      ]
    );
  };

  const renderBatch = ({ item }: { item: Batch }) => (
    <TouchableOpacity
      style={styles.batchItem}
      onPress={() => handleBatchPress(item)}
    >
      <View style={styles.batchHeader}>
        <Text style={styles.batchName}>{item.name}</Text>
        <View style={[styles.syncStatus, item.synced && styles.syncStatusSynced]}>
          <Text style={[styles.syncStatusText, item.synced && styles.syncStatusTextSynced]}>
            {item.synced ? 'Synced' : 'Pending'}
          </Text>
        </View>
      </View>
      <Text style={styles.batchDate}>
        Created: {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Batches</Text>
          <Text style={styles.subtitle}>{selectedOrganization?.name}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {batches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Batches Yet</Text>
          <Text style={styles.emptyMessage}>
            Create your first batch to start capturing RFID data
          </Text>
        </View>
      ) : (
        <FlatList
          data={batches}
          renderItem={renderBatch}
          keyExtractor={(item) => item.id!.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <TouchableOpacity style={styles.createButton} onPress={handleCreateBatch}>
        <Text style={styles.createButtonText}>+ Create Batch</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  signOutText: {
    color: '#007AFF',
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  batchItem: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  batchName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  syncStatus: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  syncStatusSynced: {
    backgroundColor: '#34C759',
  },
  syncStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  syncStatusTextSynced: {
    color: 'white',
  },
  batchDate: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  createButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});