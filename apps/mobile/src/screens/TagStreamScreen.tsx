import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { RfidService } from '@/services/rfid';
import { RfidTag, RfidReaderStatus } from '@/types/rfid';

interface TagStreamItem extends RfidTag {
  id: string;
}

export const TagStreamScreen: React.FC = () => {
  const [rfidService] = useState(() => RfidService.getInstance());
  const [tags, setTags] = useState<TagStreamItem[]>([]);
  const [status, setStatus] = useState<RfidReaderStatus>(RfidReaderStatus.DISCONNECTED);
  const [isInventoryRunning, setIsInventoryRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tagCounts, setTagCounts] = useState<Map<string, number>>(new Map());
  
  const flatListRef = useRef<FlatList>(null);
  const maxTags = 100; // Limit displayed tags for performance

  useEffect(() => {
    updateStatus();
    
    const tagReadCallback = (tag: RfidTag) => {
      const tagWithId: TagStreamItem = {
        ...tag,
        id: `${tag.epc}-${Date.now()}-${Math.random()}`,
      };
      
      setTags(prevTags => {
        const newTags = [tagWithId, ...prevTags];
        return newTags.slice(0, maxTags);
      });

      // Update tag counts
      setTagCounts(prevCounts => {
        const newCounts = new Map(prevCounts);
        newCounts.set(tag.epc, (newCounts.get(tag.epc) || 0) + 1);
        return newCounts;
      });

      // Auto-scroll to top
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({ offset: 0, animated: true });
      }
    };

    const statusCallback = (newStatus: RfidReaderStatus) => {
      setStatus(newStatus);
      setIsInventoryRunning(newStatus === RfidReaderStatus.READING);
    };

    rfidService.onTagRead(tagReadCallback);
    rfidService.onStatusChange(statusCallback);

    return () => {
      rfidService.removeTagReadListener(tagReadCallback);
      rfidService.removeStatusChangeListener(statusCallback);
    };
  }, []);

  const updateStatus = () => {
    const currentStatus = rfidService.getStatus();
    setStatus(currentStatus);
    setIsInventoryRunning(currentStatus === RfidReaderStatus.READING);
  };

  const handleStartInventory = async () => {
    try {
      setIsLoading(true);
      await rfidService.startInventory();
    } catch (error) {
      Alert.alert('Error', `Failed to start inventory: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopInventory = async () => {
    try {
      setIsLoading(true);
      await rfidService.stopInventory();
    } catch (error) {
      Alert.alert('Error', `Failed to stop inventory: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearTags = () => {
    setTags([]);
    setTagCounts(new Map());
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString();
  };

  const getStatusColor = () => {
    switch (status) {
      case RfidReaderStatus.CONNECTED:
        return '#4CAF50';
      case RfidReaderStatus.READING:
        return '#2196F3';
      case RfidReaderStatus.CONNECTING:
        return '#FF9800';
      case RfidReaderStatus.ERROR:
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const renderTag = ({ item }: { item: TagStreamItem }) => (
    <View style={styles.tagItem}>
      <View style={styles.tagHeader}>
        <Text style={styles.tagEpc}>{item.epc}</Text>
        <Text style={styles.tagTime}>{formatTime(item.timestamp)}</Text>
      </View>
      <View style={styles.tagDetails}>
        {item.rssi !== undefined && (
          <Text style={styles.tagDetail}>RSSI: {item.rssi} dBm</Text>
        )}
        <Text style={styles.tagDetail}>
          Count: {tagCounts.get(item.epc) || 1}
        </Text>
      </View>
    </View>
  );

  const uniqueTagsCount = tagCounts.size;
  const totalReads = Array.from(tagCounts.values()).reduce((sum, count) => sum + count, 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tag Stream</Text>
          <View style={styles.stats}>
            <Text style={styles.statText}>
              Unique Tags: {uniqueTagsCount} | Total Reads: {totalReads}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isInventoryRunning ? (
          <TouchableOpacity
            style={[styles.controlButton, styles.startButton]}
            onPress={handleStartInventory}
            disabled={!rfidService.isConnected() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.controlButtonText}>Start Reading</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.controlButton, styles.stopButton]}
            onPress={handleStopInventory}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.controlButtonText}>Stop Reading</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.controlButton, styles.clearButton]}
          onPress={handleClearTags}
          disabled={isLoading}
        >
          <Text style={styles.controlButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Tag List */}
      {!rfidService.isConnected() ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            No reader connected. Go to Settings to configure a reader.
          </Text>
        </View>
      ) : tags.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {isInventoryRunning 
              ? 'Listening for tags...' 
              : 'Press "Start Reading" to begin scanning for tags'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={tags}
          renderItem={renderTag}
          keyExtractor={(item) => item.id}
          style={styles.tagList}
          showsVerticalScrollIndicator={true}
          getItemLayout={(data, index) => ({
            length: 80,
            offset: 80 * index,
            index,
          })}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  stats: {
    marginTop: 4,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  controls: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  controlButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    minHeight: 44,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  clearButton: {
    backgroundColor: '#757575',
    flex: 0.5,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tagList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tagItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    fontFamily: 'monospace',
  },
  tagTime: {
    fontSize: 14,
    color: '#666',
  },
  tagDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tagDetail: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});