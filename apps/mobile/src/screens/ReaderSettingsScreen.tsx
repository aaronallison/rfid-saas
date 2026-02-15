import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { RfidService } from '@/services/rfid';
import { RfidReaderConfig, RfidReaderStatus } from '@/types/rfid';

export const ReaderSettingsScreen: React.FC = () => {
  const [rfidService] = useState(() => RfidService.getInstance());
  const [config, setConfig] = useState<RfidReaderConfig | null>(null);
  const [status, setStatus] = useState<RfidReaderStatus>(RfidReaderStatus.DISCONNECTED);
  const [isLoading, setIsLoading] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [connectionParams, setConnectionParams] = useState('{}');

  useEffect(() => {
    loadConfig();
    updateStatus();

    const statusCallback = (newStatus: RfidReaderStatus) => {
      setStatus(newStatus);
    };

    rfidService.onStatusChange(statusCallback);

    return () => {
      rfidService.removeStatusChangeListener(statusCallback);
    };
  }, []);

  const loadConfig = async () => {
    const savedConfig = await rfidService.loadConfig();
    setConfig(savedConfig);
    if (savedConfig?.connectionParams?.deviceId) {
      setDeviceId(savedConfig.connectionParams.deviceId);
    }
    if (savedConfig?.connectionParams) {
      setConnectionParams(JSON.stringify(savedConfig.connectionParams, null, 2));
    }
  };

  const updateStatus = () => {
    setStatus(rfidService.getStatus());
  };

  const handleReaderTypeSelect = async (type: 'mock' | 'ble' | 'vendor') => {
    try {
      setIsLoading(true);
      
      let newConfig: RfidReaderConfig = { type };
      
      if (type === 'ble') {
        newConfig.connectionParams = { deviceId: deviceId || undefined };
      } else if (type === 'vendor') {
        try {
          newConfig.connectionParams = JSON.parse(connectionParams);
        } catch (e) {
          Alert.alert('Error', 'Invalid connection parameters JSON');
          return;
        }
      }

      await rfidService.setReader(newConfig);
      setConfig(newConfig);
      
      Alert.alert('Success', `${type.toUpperCase()} reader configured successfully`);
    } catch (error) {
      Alert.alert('Error', `Failed to configure reader: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      await rfidService.connect();
      Alert.alert('Success', 'Reader connected successfully');
    } catch (error) {
      Alert.alert('Connection Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsLoading(true);
      await rfidService.disconnect();
      Alert.alert('Success', 'Reader disconnected');
    } catch (error) {
      Alert.alert('Disconnection Error', error.message);
    } finally {
      setIsLoading(false);
    }
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
      <View style={styles.header}>
        <Text style={styles.title}>RFID Reader Settings</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{status.toUpperCase()}</Text>
        </View>
      </View>

      {/* Reader Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reader Type</Text>
        
        <TouchableOpacity
          style={[
            styles.readerTypeButton,
            config?.type === 'mock' && styles.selectedReaderType
          ]}
          onPress={() => handleReaderTypeSelect('mock')}
          disabled={isLoading}
        >
          <Text style={styles.readerTypeText}>Mock Reader</Text>
          <Text style={styles.readerTypeDescription}>Fake reads for testing</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.readerTypeButton,
            config?.type === 'ble' && styles.selectedReaderType
          ]}
          onPress={() => handleReaderTypeSelect('ble')}
          disabled={isLoading}
        >
          <Text style={styles.readerTypeText}>BLE Reader</Text>
          <Text style={styles.readerTypeDescription}>Bluetooth Low Energy (Not implemented)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.readerTypeButton,
            config?.type === 'vendor' && styles.selectedReaderType
          ]}
          onPress={() => handleReaderTypeSelect('vendor')}
          disabled={isLoading}
        >
          <Text style={styles.readerTypeText}>Vendor Reader</Text>
          <Text style={styles.readerTypeDescription}>Proprietary protocol (Not implemented)</Text>
        </TouchableOpacity>
      </View>

      {/* BLE Configuration */}
      {config?.type === 'ble' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BLE Configuration</Text>
          <TextInput
            style={styles.input}
            placeholder="Device ID"
            value={deviceId}
            onChangeText={setDeviceId}
            editable={!rfidService.isConnected()}
          />
        </View>
      )}

      {/* Vendor Configuration */}
      {config?.type === 'vendor' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendor Configuration</Text>
          <Text style={styles.inputLabel}>Connection Parameters (JSON):</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder='{"address": "192.168.1.100", "port": 8080}'
            value={connectionParams}
            onChangeText={setConnectionParams}
            multiline
            numberOfLines={4}
            editable={!rfidService.isConnected()}
          />
        </View>
      )}

      {/* Connection Controls */}
      {config && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection</Text>
          
          {status === RfidReaderStatus.DISCONNECTED ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.connectButton]}
              onPress={handleConnect}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.actionButtonText}>Connect</Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.disconnectButton]}
              onPress={handleDisconnect}
              disabled={isLoading || status === RfidReaderStatus.CONNECTING}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.actionButtonText}>Disconnect</Text>
              )}
            </TouchableOpacity>
          )}
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
  readerTypeButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  selectedReaderType: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  readerTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  readerTypeDescription: {
    fontSize: 14,
    color: '#666',
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
    height: 100,
    textAlignVertical: 'top',
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  actionButton: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});