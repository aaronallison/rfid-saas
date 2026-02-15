import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { DatabaseService } from '../services/database';
import { SyncService, SyncProgress } from '../services/syncService';

interface SyncStats {
  unsyncedBatches: number;
  unsyncedSchemas: number;
  unsyncedCaptures: number;
}

export function useSyncData(organizationId?: string) {
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [stats, setStats] = useState<SyncStats>({
    unsyncedBatches: 0,
    unsyncedSchemas: 0,
    unsyncedCaptures: 0,
  });
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback(<T>(setter: React.Dispatch<React.SetStateAction<T>>, value: T | ((prev: T) => T)) => {
    if (isMountedRef.current) {
      setter(value);
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!organizationId) {
      console.warn('No organization selected');
      return;
    }

    safeSetState(setIsLoadingStats, true);
    try {
      const [batches, schemas, captures] = await Promise.all([
        DatabaseService.getUnsyncedBatches(),
        DatabaseService.getUnsyncedSchemas(),
        DatabaseService.getUnsyncedCaptures(),
      ]);

      safeSetState(setStats, {
        unsyncedBatches: batches.length,
        unsyncedSchemas: schemas.length,
        unsyncedCaptures: captures.length,
      });
    } catch (error) {
      console.error('Error loading sync stats:', error);
      Alert.alert(
        'Error',
        'Failed to load sync statistics. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      safeSetState(setIsLoadingStats, false);
    }
  }, [organizationId, safeSetState]);

  const checkOnlineStatus = useCallback(async () => {
    try {
      const online = await SyncService.isOnline();
      safeSetState(setIsOnline, online);
    } catch (error) {
      console.error('Error checking online status:', error);
      safeSetState(setIsOnline, false);
    }
  }, [safeSetState]);

  const syncToCloud = useCallback(async () => {
    if (!organizationId) {
      Alert.alert('Error', 'Please select an organization first.');
      return false;
    }

    if (!isOnline) {
      Alert.alert(
        'Offline',
        'You need an internet connection to sync data. Please check your connection and try again.',
        [
          { text: 'Cancel' },
          { text: 'Check Connection', onPress: checkOnlineStatus }
        ]
      );
      return false;
    }

    const totalItems = stats.unsyncedBatches + stats.unsyncedSchemas + stats.unsyncedCaptures;
    if (totalItems === 0) {
      Alert.alert('No Data', 'All data is already synced');
      return false;
    }

    safeSetState(setIsSyncing, true);
    safeSetState(setSyncProgress, {
      totalItems: 0,
      syncedItems: 0,
      currentOperation: 'Starting sync...',
      isComplete: false,
      errors: [],
    });

    try {
      await SyncService.syncToCloud((progress) => {
        safeSetState(setSyncProgress, progress);
      });

      Alert.alert('Success', 'Data synced successfully');
      await loadStats();
      return true;
    } catch (error) {
      console.error('Sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Sync Failed',
        `Failed to sync data: ${errorMessage}`,
        [
          { text: 'OK' },
          { text: 'Retry', onPress: () => syncToCloud() }
        ]
      );
      return false;
    } finally {
      safeSetState(setIsSyncing, false);
      safeSetState(setSyncProgress, null);
    }
  }, [organizationId, isOnline, stats, safeSetState, loadStats, checkOnlineStatus]);

  const manualResync = useCallback(async () => {
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
              console.error('Manual resync error:', error);
              const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
              Alert.alert('Error', `Failed to reset sync status: ${errorMessage}`);
            }
          },
        },
      ]
    );
  }, [loadStats]);

  const getTotalUnsyncedItems = useCallback((): number => {
    return stats.unsyncedBatches + stats.unsyncedSchemas + stats.unsyncedCaptures;
  }, [stats]);

  const getProgressPercentage = useCallback((): number => {
    if (!syncProgress || syncProgress.totalItems === 0) return 0;
    return Math.round((syncProgress.syncedItems / syncProgress.totalItems) * 100);
  }, [syncProgress]);

  return {
    // State
    syncProgress,
    isSyncing,
    isLoadingStats,
    stats,
    isOnline,
    // Actions
    loadStats,
    checkOnlineStatus,
    syncToCloud,
    manualResync,
    // Computed values
    getTotalUnsyncedItems,
    getProgressPercentage,
  };
}