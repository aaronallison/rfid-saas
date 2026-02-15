import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DatabaseService } from '../services/database';
import { SyncService, SyncProgress } from '../services/syncService';
import { useAuth } from '../contexts/AuthContext';

export default function SyncScreen() {
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [stats, setStats] = useState({
    unsyncedBatches: 0,
    unsyncedSchemas: 0,
    unsyncedCaptures: 0,
  });
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const { selectedOrganization } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
      checkOnlineStatus();
    }, [])
  );

  const loadStats = async () => {
    try {
      const [batches, schemas, captures] = await Promise.all([
        DatabaseService.getUnsyncedBatches(),
        DatabaseService.getUnsyncedSchemas(),
        DatabaseService.getUnsyncedCaptures(),
      ]);

      setStats({
        unsyncedBatches: batches.length,
        unsyncedSchemas: schemas.length,
        unsyncedCaptures: captures.length,
      });
    } catch (error) {
      console.error('Error loading sync stats:', error);
    }
  };

  const checkOnlineStatus = async () => {
    const online = await SyncService.isOnline();
    setIsOnline(online);
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'You need an internet connection to sync data');
      return;
    }

    const totalItems = stats.unsyncedBatches + stats.unsyncedSchemas + stats.unsyncedCaptures;
    if (totalItems === 0) {
      Alert.alert('No Data', 'All data is already synced');
      return;
    }

    setIsSyncing(true);
    setSyncProgress({
      totalItems: 0,
      syncedItems: 0,
      currentOperation: 'Starting sync...',
      isComplete: false,
      errors: [],
    });

    try {
      await SyncService.syncToCloud((progress) => {
        setSyncProgress(progress);
      });

      Alert.alert('Success', 'Data synced successfully');
      await loadStats(); // Refresh stats
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Failed', `Error: ${error}`);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleManualResync = () => {
    Alert.alert(
      'Manual Resync',
      'This will mark all data as unsynced and attempt to sync everything again. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Resync All',
          onPress: async () => {
            try {
              await SyncService.manualResync();
              await loadStats();
              Alert.alert('Success', 'All data marked for resync');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset sync status');
            }
          },
        },
      ]
    );
  };

  const getProgressPercentage = () => {
    if (!syncProgress || syncProgress.totalItems === 0) return 0;
    return Math.round((syncProgress.syncedItems / syncProgress.totalItems) * 100);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Data Sync</Text>
        <Text style={styles.subtitle}>{selectedOrganization?.name}</Text>
      </View>

      {/* Online Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Connection Status:</Text>
          <View style={[
            styles.statusIndicator,
            isOnline === true ? styles.statusOnline : 
            isOnline === false ? styles.statusOffline : styles.statusChecking
          ]}>
            <Text style={styles.statusText}>
              {isOnline === true ? 'Online' : 
               isOnline === false ? 'Offline' : 'Checking...'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.refreshButton} onPress={checkOnlineStatus}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Stats */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Items Pending Sync</Text>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Schemas:</Text>
          <Text style={styles.statValue}>{stats.unsyncedSchemas}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Batches:</Text>
          <Text style={styles.statValue}>{stats.unsyncedBatches}</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Captures:</Text>
          <Text style={styles.statValue}>{stats.unsyncedCaptures}</Text>
        </View>
        
        <View style={[styles.statItem, styles.statTotal]}>
          <Text style={styles.statTotalLabel}>Total:</Text>
          <Text style={styles.statTotalValue}>
            {stats.unsyncedSchemas + stats.unsyncedBatches + stats.unsyncedCaptures}
          </Text>
        </View>
      </View>

      {/* Sync Progress */}
      {isSyncing && syncProgress && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressTitle}>Syncing...</Text>
          <Text style={styles.progressOperation}>{syncProgress.currentOperation}</Text>
          
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${getProgressPercentage()}%` }
              ]}
            />
          </View>
          
          <Text style={styles.progressText}>
            {syncProgress.syncedItems} / {syncProgress.totalItems} items ({getProgressPercentage()}%)
          </Text>

          {syncProgress.errors.length > 0 && (
            <View style={styles.errorsContainer}>
              <Text style={styles.errorsTitle}>Errors:</Text>
              {syncProgress.errors.map((error, index) => (
                <Text key={index} style={styles.errorText}>{error}</Text>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[
            styles.syncButton,
            isSyncing && styles.buttonDisabled,
            !isOnline && styles.buttonDisabled,
          ]}
          onPress={handleSync}
          disabled={isSyncing || !isOnline}
        >
          {isSyncing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.syncButtonText}>
              {stats.unsyncedBatches + stats.unsyncedSchemas + stats.unsyncedCaptures > 0
                ? 'Sync to Cloud'
                : 'All Synced ✓'
              }
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resyncButton, isSyncing && styles.buttonDisabled]}
          onPress={handleManualResync}
          disabled={isSyncing}
        >
          <Text style={styles.resyncButtonText}>Force Resync All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refreshStatsButton}
          onPress={loadStats}
        >
          <Text style={styles.refreshStatsButtonText}>Refresh Stats</Text>
        </TouchableOpacity>
      </View>

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Text style={styles.helpTitle}>How Sync Works</Text>
        <Text style={styles.helpText}>
          • Data is stored locally first (offline-first)
        </Text>
        <Text style={styles.helpText}>
          • Sync uploads data to cloud in chunks of 200 items
        </Text>
        <Text style={styles.helpText}>
          • Failed uploads are retried with exponential backoff
        </Text>
        <Text style={styles.helpText}>
          • Use "Force Resync All" if you encounter sync issues
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
    paddingTop: 40,
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
  statusContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusItem: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusOnline: {
    backgroundColor: '#34C759',
  },
  statusOffline: {
    backgroundColor: '#FF3B30',
  },
  statusChecking: {
    backgroundColor: '#FF9500',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statTotal: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
    paddingTop: 16,
  },
  statTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  progressOperation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  errorsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF2F2',
    borderRadius: 8,
  },
  errorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginBottom: 4,
  },
  buttonsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  syncButton: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  syncButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resyncButton: {
    backgroundColor: '#FF9500',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  resyncButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshStatsButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  refreshStatsButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});