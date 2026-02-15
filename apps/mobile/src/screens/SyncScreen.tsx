import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useSyncData } from '../hooks/useSyncData';

export default function SyncScreen() {
  const { selectedOrganization } = useAuth();
  const {
    syncProgress,
    isSyncing,
    isLoadingStats,
    stats,
    isOnline,
    loadStats,
    checkOnlineStatus,
    syncToCloud,
    manualResync,
    getTotalUnsyncedItems,
    getProgressPercentage,
  } = useSyncData(selectedOrganization?.id);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      checkOnlineStatus();
    }, [loadStats, checkOnlineStatus])
  );

  // Pre-calculated style objects to avoid inline object creation
  const statusIndicatorStyle = [
    styles.statusIndicator,
    isOnline === true ? styles.statusOnline : 
    isOnline === false ? styles.statusOffline : styles.statusChecking
  ];

  const syncButtonStyle = [
    styles.syncButton,
    (isSyncing || !isOnline || !selectedOrganization) && styles.buttonDisabled,
  ];

  const resyncButtonStyle = [
    styles.resyncButton,
    isSyncing && styles.buttonDisabled,
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Data Sync</Text>
        <Text style={styles.subtitle}>
          {selectedOrganization?.name || 'No organization selected'}
        </Text>
      </View>

      {/* Online Status */}
      <View style={styles.statusContainer}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Connection Status:</Text>
          <View style={statusIndicatorStyle}>
            <Text style={styles.statusText}>
              {isOnline === true ? 'Online' : 
               isOnline === false ? 'Offline' : 'Checking...'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.refreshButton} 
          onPress={checkOnlineStatus}
          accessibilityRole="button"
          accessibilityLabel="Refresh connection status"
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Sync Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Items Pending Sync</Text>
          {isLoadingStats && <ActivityIndicator size="small" color="#007AFF" />}
        </View>
        
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
            {getTotalUnsyncedItems()}
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
          style={syncButtonStyle}
          onPress={syncToCloud}
          disabled={isSyncing || !isOnline || !selectedOrganization}
          accessibilityRole="button"
          accessibilityLabel={
            getTotalUnsyncedItems() > 0 ? 'Sync data to cloud' : 'All data synced'
          }
        >
          {isSyncing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.syncButtonText}>
              {getTotalUnsyncedItems() > 0 ? 'Sync to Cloud' : 'All Synced ✓'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={resyncButtonStyle}
          onPress={manualResync}
          disabled={isSyncing}
          accessibilityRole="button"
          accessibilityLabel="Force resync all data"
        >
          <Text style={styles.resyncButtonText}>Force Resync All</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refreshStatsButton}
          onPress={loadStats}
          disabled={isLoadingStats}
          accessibilityRole="button"
          accessibilityLabel="Refresh sync statistics"
        >
          {isLoadingStats ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Text style={styles.refreshStatsButtonText}>Refresh Stats</Text>
          )}
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
    // Add shadow for better visual separation
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    // Add shadow for better visual separation
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    // Add shadow for better visual separation
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
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
    lineHeight: 16,
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
    // Add shadow for better visual feedback
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
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
    // Add shadow for better visual separation
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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