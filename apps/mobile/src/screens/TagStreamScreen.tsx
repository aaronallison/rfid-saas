import React, { useState, useEffect, useRef } from 'react';
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

export default function TagStreamScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [uniqueTags, setUniqueTags] = useState<Map<string, TagWithCount>>(new Map());
  const [readerStatus, setReaderStatus] = useState<ReaderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const rfidService = RfidService.getInstance();
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Get initial status
    const status = rfidService.getStatus();
    setReaderStatus(status);

    // Add listeners
    rfidService.addStatusListener(handleStatusChange);
    rfidService.addTagListener(handleTagRead);

    return () => {
      rfidService.removeStatusListener(handleStatusChange);
      rfidService.removeTagListener(handleTagRead);
    };
  }, []);

  const handleStatusChange = (status: ReaderStatus) => {
    setReaderStatus(status);
    setIsScanning(status.isScanning || false);
  };

  const handleTagRead = (tag: RfidTag) => {
    const now = new Date();
    
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

    // Add to stream (keep last 1000 reads)
    setTags(prev => {
      const newTags = [{
        ...tag,
        totalReadCount: 1,
        lastSeen: now,
        timestamp: now,
      }, ...prev];
      return newTags.slice(0, 1000);
    });

    // Scroll to top when new tag is read
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    }, 100);
  };

  const handleStartScanning = async () => {
    if (!readerStatus?.isConnected) {
      Alert.alert('Error', 'Reader is not connected. Please connect first.');
      return;
    }

    setLoading(true);
    try {
      await rfidService.startInventory();
      setSessionStartTime(new Date());
      setIsScanning(true);
    } catch (error) {
      console.error('Start inventory failed:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start scanning');
    } finally {
      setLoading(false);
    }
  };

  const handleStopScanning = async () => {
    setLoading(true);
    try {
      await rfidService.stopInventory();
      setIsScanning(false);
    } catch (error) {
      console.error('Stop inventory failed:', error);
      Alert.alert('Error', 'Failed to stop scanning');
    } finally {
      setLoading(false);
    }
  };

  const handleClearTags = () => {
    Alert.alert(
      'Clear Tags',
      'This will clear all tag reads from the current session. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            setTags([]);
            setUniqueTags(new Map());
            setSessionStartTime(isScanning ? new Date() : null);
          }
        },
      ]
    );
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  const formatRssi = (rssi?: number) => {
    if (rssi === undefined) return '';
    return `${rssi} dBm`;
  };

  const getReadCountColor = (count: number) => {
    if (count === 1) return '#666';
    if (count < 5) return '#007AFF';
    if (count < 10) return '#FF9500';
    return '#FF3B30';
  };

  const renderTagItem = ({ item }: { item: TagWithCount }) => (
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
  );

  const renderUniqueTagItem = ({ item }: { item: [string, TagWithCount] }) => {
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
  };

  const TabButton = ({ title, active, onPress }: { 
    title: string; 
    active: boolean; 
    onPress: () => void; 
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const [activeTab, setActiveTab] = useState<'stream' | 'unique'>('unique');

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
              {Math.round((Date.now() - sessionStartTime.getTime()) / 1000 / 60)}m
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
            data={Array.from(uniqueTags.entries())}
            keyExtractor={([epc]) => epc}
            renderItem={renderUniqueTagItem}
            style={styles.list}
            contentContainerStyle={uniqueTags.size === 0 ? styles.emptyList : undefined}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No tags scanned yet</Text>
                <Text style={styles.emptySubtext}>
                  {readerStatus?.isConnected 
                    ? 'Start scanning to see RFID tags' 
                    : 'Connect reader first'
                  }
                </Text>
              </View>
            )}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={tags}
            keyExtractor={(item, index) => `${item.epc}-${index}-${item.timestamp.getTime()}`}
            renderItem={renderTagItem}
            style={styles.list}
            contentContainerStyle={tags.length === 0 ? styles.emptyList : undefined}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No tag reads yet</Text>
                <Text style={styles.emptySubtext}>
                  {readerStatus?.isConnected 
                    ? 'Start scanning to see live tag stream' 
                    : 'Connect reader first'
                  }
                </Text>
              </View>
            )}
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