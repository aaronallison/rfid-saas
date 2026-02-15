import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RfidService } from '@/services/rfid';
import { CaptureService } from '@/services/CaptureService';
import { RfidTag, RfidReaderStatus, Capture } from '@/types/rfid';

export const CaptureScreen: React.FC = () => {
  const navigation = useNavigation();
  const [rfidService] = useState(() => RfidService.getInstance());
  const [captureService] = useState(() => CaptureService.getInstance());
  
  const [status, setStatus] = useState<RfidReaderStatus>(RfidReaderStatus.DISCONNECTED);
  const [currentTag, setCurrentTag] = useState<string>('');
  const [manualTag, setManualTag] = useState<string>('');
  const [additionalData, setAdditionalData] = useState<string>('');
  const [autoCapture, setAutoCapture] = useState<boolean>(true);
  const [isInventoryRunning, setIsInventoryRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastCapture, setLastCapture] = useState<Capture | null>(null);
  const [recentCaptures, setRecentCaptures] = useState<Capture[]>([]);

  useEffect(() => {
    updateStatus();
    loadRecentCaptures();
    
    const tagReadCallback = (tag: RfidTag) => {
      setCurrentTag(tag.epc);
      
      if (autoCapture) {
        handleAutoCapture(tag.epc);
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
  }, [autoCapture]);

  const updateStatus = () => {
    const currentStatus = rfidService.getStatus();
    setStatus(currentStatus);
    setIsInventoryRunning(currentStatus === RfidReaderStatus.READING);
  };

  const loadRecentCaptures = async () => {
    try {
      const captures = await captureService.getAllCaptures();
      const recent = captures
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5);
      setRecentCaptures(recent);
    } catch (error) {
      console.error('Failed to load recent captures:', error);
    }
  };

  const handleAutoCapture = async (rfidTag: string) => {
    try {
      let additionalDataObj = {};
      if (additionalData.trim()) {
        try {
          additionalDataObj = JSON.parse(additionalData);
        } catch {
          additionalDataObj = { notes: additionalData };
        }
      }

      const capture = await captureService.createCapture(rfidTag, additionalDataObj);
      setLastCapture(capture);
      await loadRecentCaptures();
      
      // Visual feedback for auto capture
      Alert.alert(
        'Auto Capture',
        `Tag ${rfidTag.substring(0, 8)}... captured automatically`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Auto capture failed:', error);
      Alert.alert('Error', 'Failed to create auto capture');
    }
  };

  const handleManualCapture = async () => {
    const tagToCapture = currentTag || manualTag;
    
    if (!tagToCapture.trim()) {
      Alert.alert('Error', 'Please scan a tag or enter a tag manually');
      return;
    }

    try {
      setIsLoading(true);
      
      let additionalDataObj = {};
      if (additionalData.trim()) {
        try {
          additionalDataObj = JSON.parse(additionalData);
        } catch {
          additionalDataObj = { notes: additionalData };
        }
      }

      const capture = await captureService.createCapture(tagToCapture, additionalDataObj);
      setLastCapture(capture);
      await loadRecentCaptures();
      
      // Clear form
      setCurrentTag('');
      setManualTag('');
      setAdditionalData('');
      
      Alert.alert('Success', 'Capture created successfully');
    } catch (error) {
      Alert.alert('Error', `Failed to create capture: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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

  const formatDateTime = (date: Date) => {
    return date.toLocaleString();
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

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Capture</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('ReaderSettings')}
          >
            <Text style={styles.headerButtonText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.navigate('TagStream')}
          >
            <Text style={styles.headerButtonText}>Stream</Text>
          </TouchableOpacity>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{status.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* RFID Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>RFID Reader</Text>
        
        {rfidService.isConnected() ? (
          <View style={styles.rfidControls}>
            <TouchableOpacity
              style={[
                styles.inventoryButton,
                isInventoryRunning ? styles.stopButton : styles.startButton
              ]}
              onPress={isInventoryRunning ? handleStopInventory : handleStartInventory}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.inventoryButtonText}>
                  {isInventoryRunning ? 'Stop Scanning' : 'Start Scanning'}
                </Text>
              )}
            </TouchableOpacity>
            
            <View style={styles.autoCaptureSetting}>
              <Text style={styles.autoCaptureLabel}>Auto Capture</Text>
              <Switch
                value={autoCapture}
                onValueChange={setAutoCapture}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={autoCapture ? '#ffffff' : '#f4f3f4'}
              />
            </View>
          </View>
        ) : (
          <Text style={styles.noReaderText}>
            No reader connected. Go to Settings to configure a reader.
          </Text>
        )}
      </View>

      {/* Current/Last Scanned Tag */}
      {currentTag && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Tag</Text>
          <View style={styles.tagDisplay}>
            <Text style={styles.tagText}>{currentTag}</Text>
            {isInventoryRunning && (
              <View style={styles.scanningIndicator}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.scanningText}>Scanning...</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Manual Capture Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manual Capture</Text>
        
        <Text style={styles.inputLabel}>RFID Tag (optional if scanned):</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter tag EPC manually or scan with reader"
          value={manualTag}
          onChangeText={setManualTag}
          autoCapitalize="characters"
        />

        <Text style={styles.inputLabel}>Additional Data (JSON or text):</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder='{"field1": "value1"} or simple notes'
          value={additionalData}
          onChangeText={setAdditionalData}
          multiline
          numberOfLines={3}
        />

        <TouchableOpacity
          style={[styles.captureButton]}
          onPress={handleManualCapture}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.captureButtonText}>Create Capture</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Last Capture */}
      {lastCapture && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Capture</Text>
          <View style={styles.captureItem}>
            <Text style={styles.captureId}>ID: {lastCapture.id}</Text>
            {lastCapture.rfid_tag && (
              <Text style={styles.captureTag}>Tag: {lastCapture.rfid_tag}</Text>
            )}
            <Text style={styles.captureTime}>
              {formatDateTime(lastCapture.timestamp)}
            </Text>
            {lastCapture.latitude && lastCapture.longitude && (
              <Text style={styles.captureLocation}>
                Location: {lastCapture.latitude.toFixed(6)}, {lastCapture.longitude.toFixed(6)}
              </Text>
            )}
            <Text style={styles.captureStatus}>
              Status: {lastCapture.synced ? 'Synced' : 'Pending Sync'}
            </Text>
          </View>
        </View>
      )}

      {/* Recent Captures */}
      {recentCaptures.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Captures ({recentCaptures.length})</Text>
          {recentCaptures.map((capture) => (
            <View key={capture.id} style={styles.recentCaptureItem}>
              <View style={styles.recentCaptureHeader}>
                <Text style={styles.recentCaptureTag}>
                  {capture.rfid_tag ? capture.rfid_tag.substring(0, 12) + '...' : 'No Tag'}
                </Text>
                <Text style={styles.recentCaptureTime}>
                  {capture.timestamp.toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.recentCaptureStatus}>
                {capture.synced ? '✓ Synced' : '⏳ Pending'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButton: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerButtonText: {
    color: '#1976d2',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  rfidControls: {
    gap: 12,
  },
  inventoryButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  inventoryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  autoCaptureSetting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  autoCaptureLabel: {
    fontSize: 16,
    color: '#333',
  },
  noReaderText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  tagDisplay: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace',
    flex: 1,
  },
  scanningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanningText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  captureButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginTop: 8,
  },
  captureButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  captureItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  captureId: {
    fontSize: 14,
    color: '#666',
  },
  captureTag: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace',
  },
  captureTime: {
    fontSize: 14,
    color: '#666',
  },
  captureLocation: {
    fontSize: 14,
    color: '#666',
  },
  captureStatus: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  recentCaptureItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 12,
    gap: 4,
  },
  recentCaptureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recentCaptureTag: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'monospace',
  },
  recentCaptureTime: {
    fontSize: 12,
    color: '#666',
  },
  recentCaptureStatus: {
    fontSize: 12,
    color: '#666',
  },
});