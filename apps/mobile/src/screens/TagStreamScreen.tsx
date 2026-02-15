import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { RfidService } from '../services/rfid';
import { RfidTag, ReaderStatus } from '../types/rfid';

interface TagWithCount extends RfidTag {
  totalReadCount: number;
  lastSeen: Date;
}

type TabType = 'stream' | 'unique';

export default function TagStreamScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [uniqueTags, setUniqueTags] = useState<Map<string, TagWithCount>>(new Map());
  const [readerStatus, setReaderStatus] = useState<ReaderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('unique');

  const rfidService = RfidService.getInstance();
  const flatListRef = useRef<FlatList>(null);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;
    
    // Get initial status
    const status = rfidService.getStatus();
    if (isComponentMounted.current) {
      setReaderStatus(status);
    }

    // Add listeners
    rfidService.addStatusListener(handleStatusChange);
    rfidService.addTagListener(handleTagRead);

    return () => {
      isComponentMounted.current = false;
      rfidService.removeStatusListener(handleStatusChange);
      rfidService.removeTagListener(handleTagRead);
    };
  }, []);

  const handleStatusChange = useCallback((status: ReaderStatus) => {
    if (!isComponentMounted.current) return;
    
    setReaderStatus(status);
    setIsScanning(status.isScanning || false);
  }, []);

  const handleTagRead = useCallback((tag: RfidTag) => {
    if (!isComponentMounted.current) return;
    
    const now = new Date();
    
    // Update unique tags
    setUniqueTags(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(tag.epc);
      
      const tagWithCount: TagWithCount = {
        ...tag,
        totalReadCount: existing ? existing.totalReadCount + 1 : 1,
        lastSeen: now,
        timestamp: now, // Update timestamp to current time
      };
      
      newMap.set(tag.epc, tagWithCount);
      return newMap;
    });

    // Add to stream (keep last 1000 reads for performance)
    setTags(prev => {
      const newTags = [{
        ...tag,
        totalReadCount: 1,
        lastSeen: now,
        timestamp: now,
      }, ...prev];
      return newTags.slice(0, 1000);
    });

    // Scroll to top when new tag is read (only if on stream tab)
    if (activeTab === 'stream') {
      setTimeout(() => {
        if (flatListRef.current && isComponentMounted.current) {
          flatListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
      }, 100);
    }
  }, [activeTab]);

  const handleStartScanning = useCallback(async () => {
    if (!readerStatus?.isConnected) {
      Alert.alert(
        'Reader Not Connected', 
        'Please connect to the RFID reader first using the Settings tab.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isComponentMounted.current) return;

    setLoading(true);
    try {
      await rfidService.startInventory();
      if (isComponentMounted.current) {
        setSessionStartTime(new Date());
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Start inventory failed:', error);
      if (isComponentMounted.current) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start scanning';
        Alert.alert('Scanning Error', errorMessage, [{ text: 'OK' }]);
      }
    } finally {
      if (isComponentMounted.current) {
        setLoading(false);
      }
    }
  }, [readerStatus?.isConnected]);

  const handleStopScanning = useCallback(async () => {
    if (!isComponentMounted.current) return;

    setLoading(true);
    try {
      await rfidService.stopInventory();
      if (isComponentMounted.current) {
        setIsScanning(false);
      }
    } catch (error) {
      console.error('Stop inventory failed:', error);
      if (isComponentMounted.current) {
        Alert.alert('Error', 'Failed to stop scanning', [{ text: 'OK' }]);
      }
    } finally {
      if (isComponentMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  const handleClearTags = useCallback(() => {
    Alert.alert(
      'Clear Tag Data',
      'This will clear all tag reads from the current session. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => {
            setTags([]);
            setUniqueTags(new Map());
            setSessionStartTime(isScanning ? new Date() : null);
          }
        },
      ]
    );
  }, [isScanning]);

  // Memoized utility functions
  const formatTimestamp = useCallback((timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  }, []);

  const formatRssi = useCallback((rssi?: number) => {
    if (rssi === undefined) return '';
    return `${rssi} dBm`;
  }, []);

  const getReadCountColor = useCallback((count: number) => {
    if (count === 1) return '#666';
    if (count < 5) return '#007AFF';
    if (count < 10) return '#FF9500';
    return '#FF3B30';
  }, []);

  const renderTagItem = useCallback(({ item }: { item: TagWithCount }) => (
    <View style={styles.tagItem}>
      <View style={styles.tagHeader}>
        <Text style={styles.tagEpc} numberOfLines={1}>
          {item.epc}
        </Text>
        <Text style={[
          styles.readCount,
          { color: getReadCountColor(item.totalReadCount) }
        ]}>
          {item.totalReadCount}x
        </Text>
      </View>
      
      <View style={styles.tagDetails}>
        <Text style={styles.tagDetail}>
          {formatTimestamp(item.timestamp)}
        </Text>
        {item.rssi !== undefined && (
          <Text style={styles.tagDetail}>
            {formatRssi(item.rssi)}
          </Text>
        )}
        {item.readCount !== undefined && (
          <Text style={styles.tagDetail}>
            Read #{item.readCount}
          </Text>
        )}
      </View>
    </View>
  ), [getReadCountColor, formatTimestamp, formatRssi]);

  const renderUniqueTagItem = useCallback(({ item }: { item: [string, TagWithCount] }) => {
    const [epc, tag] = item;
    const timeSinceLastSeen = (Date.now() - tag.lastSeen.getTime()) / 1000;
    
    return (
      <View style={styles.uniqueTagItem}>
        <View style={styles.tagHeader}>
          <Text style={styles.tagEpc} numberOfLines={1}>
            {epc}
          </Text>
          <Text style={[
            styles.readCount,
            { color: getReadCountColor(tag.totalReadCount) }
          ]}>
            {tag.totalReadCount}x
          </Text>
        </View>
        
        <View style={styles.tagDetails}>
          <Text style={styles.tagDetail}>
            Last: {formatTimestamp(tag.lastSeen)}
          </Text>
          <Text style={[
            styles.tagDetail,
            timeSinceLastSeen > 5 && styles.tagDetailOld
          ]}>
            {timeSinceLastSeen < 1 ? 'Just now' : `${Math.round(timeSinceLastSeen)}s ago`}
          </Text>
          {tag.rssi !== undefined && (
            <Text style={styles.tagDetail}>
              {formatRssi(tag.rssi)}
            </Text>
          )}
        </View>
      </View>
    );
  }, [getReadCountColor, formatTimestamp, formatRssi]);

  const TabButton = useCallback(({ title, active, onPress }: { 
    title: string; 
    active: boolean; 
    onPress: () => void; 
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={title}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  ), []);

  // Memoized computed values
  const sessionDuration = useMemo(() => {
    if (!sessionStartTime) return 0;
    return Math.round((Date.now() - sessionStartTime.getTime()) / 1000 / 60);
  }, [sessionStartTime]);

  const uniqueTagsArray = useMemo(() => {
    return Array.from(uniqueTags.entries());
  }, [uniqueTags]);

  const emptyListComponent = useMemo(() => {
    const isUniqueTab = activeTab === 'unique';
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {isUniqueTab ? 'No tags scanned yet' : 'No tag reads yet'}
        </Text>
        <Text style={styles.emptySubtext}>
          {readerStatus?.isConnected 
            ? isUniqueTab 
              ? 'Start scanning to see unique RFID tags' 
              : 'Start scanning to see live tag stream'
            : 'Connect reader first in the Settings tab'
          }
        </Text>
      </View>
    );
  }, [activeTab, readerStatus?.isConnected]);

  return (
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{tags.length}</Text>
          <Text style={styles.statLabel}>Total Reads</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{uniqueTags.size}</Text>
          <Text style={styles.statLabel}>Unique Tags</Text>
        </View>
        
        {sessionStartTime && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {sessionDuration}m
            </Text>
            <Text style={styles.statLabel}>Session</Text>
          </View>
        )}
      </View>

      {/* Status and Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Reader:</Text>
          <Text style={[
            styles.statusValue,
            readerStatus?.isConnected ? styles.statusConnected : styles.statusDisconnected
          ]}>
            {readerStatus?.isConnected ? 'Connected' : 'Disconnected'}
          </Text>
          
          <View style={[
            styles.scanningIndicator,
            isScanning && styles.scanningIndicatorActive
          ]}>
            <Text style={[
              styles.scanningIndicatorText,
              isScanning && styles.scanningIndicatorTextActive
            ]}>
              {isScanning ? 'SCANNING' : 'STOPPED'}
            </Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          {!isScanning ? (
            <TouchableOpacity
              style={[
                styles.controlButton,
                styles.startButton,
                (!readerStatus?.isConnected || loading) && styles.buttonDisabled
              ]}
              onPress={handleStartScanning}
              disabled={!readerStatus?.isConnected || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.controlButtonText}>Start Scanning</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={handleStopScanning}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.controlButtonText}>Stop Scanning</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlButton, styles.clearButton]}
            onPress={handleClearTags}
          >
            <Text style={styles.controlButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TabButton
          title={`Unique (${uniqueTags.size})`}
          active={activeTab === 'unique'}
          onPress={() => setActiveTab('unique')}
        />
        <TabButton
          title={`Stream (${tags.length})`}
          active={activeTab === 'stream'}
          onPress={() => setActiveTab('stream')}
        />
      </View>

      {/* Tag List */}
      <View style={styles.listContainer}>
        {activeTab === 'unique' ? (
          <FlatList
            data={uniqueTagsArray}
            keyExtractor={([epc]) => epc}
            renderItem={renderUniqueTagItem}
            style={styles.list}
            contentContainerStyle={uniqueTags.size === 0 ? styles.emptyList : undefined}
            ListEmptyComponent={emptyListComponent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={20}
            windowSize={10}
            getItemLayout={(data, index) => ({
              length: 88, // Approximate height of uniqueTagItem
              offset: 88 * index,
              index,
            })}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={tags}
            keyExtractor={(item, index) => `${item.epc}-${index}-${item.timestamp.getTime()}`}
            renderItem={renderTagItem}
            style={styles.list}
            contentContainerStyle={tags.length === 0 ? styles.emptyList : undefined}
            ListEmptyComponent={emptyListComponent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={30}
            windowSize={15}
            getItemLayout={(data, index) => ({
              length: 80, // Approximate height of tagItem
              offset: 80 * index,
              index,
            })}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  controlsContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  statusValue: {
    fontSize: 16,
    marginRight: 16,
  },
  statusConnected: {
    color: '#34C759',
    fontWeight: '600',
  },
  statusDisconnected: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  scanningIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  scanningIndicatorActive: {
    backgroundColor: '#34C759',
  },
  scanningIndicatorText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  scanningIndicatorTextActive: {
    color: 'white',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  clearButton: {
    backgroundColor: '#666',
    flex: 0.5,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  tabButtonActive: {
    backgroundColor: '#007AFF',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  tabButtonTextActive: {
    color: 'white',
  },
  listContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  list: {
    flex: 1,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  tagItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  uniqueTagItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  tagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagEpc: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
    fontFamily: 'monospace',
  },
  readCount: {
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 40,
    textAlign: 'right',
  },
  tagDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  tagDetail: {
    fontSize: 12,
    color: '#666',
  },
  tagDetailOld: {
    color: '#999',
  },
});