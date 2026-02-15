import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { RfidService } from '../services/rfid';
import { ReaderType, ReaderSettings, ReaderStatus } from '../types/rfid';

export default function ReaderSettingsScreen() {
  const [settings, setSettings] = useState<ReaderSettings | null>(null);
  const [status, setStatus] = useState<ReaderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const rfidService = RfidService.getInstance();

  useEffect(() => {
    loadCurrentSettings();
    updateStatus();
    
    // Listen for status changes
    rfidService.addStatusListener(handleStatusChange);
    
    return () => {
      rfidService.removeStatusListener(handleStatusChange);
    };
  }, []);

  const loadCurrentSettings = () => {
    const currentSettings = rfidService.getSettings();
    setSettings(currentSettings);
  };

  const updateStatus = () => {
    const currentStatus = rfidService.getStatus();
    setStatus(currentStatus);
  };

  const handleStatusChange = (newStatus: ReaderStatus) => {
    setStatus(newStatus);
    setConnecting(false);
  };

  const handleReaderTypeChange = async (readerType: ReaderType) => {
    if (!settings || settings.readerType === readerType) return;

    setLoading(true);
    try {
      await rfidService.updateSettings({ ...settings, readerType });
      loadCurrentSettings();
      updateStatus();
      Alert.alert('Success', `Switched to ${readerType} reader`);
    } catch (error) {
      console.error('Failed to update reader type:', error);
      Alert.alert('Error', 'Failed to update reader type. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = async (key: keyof ReaderSettings, value: any) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      await rfidService.updateSettings(newSettings);
    } catch (error) {
      console.error('Failed to update setting:', error);
      Alert.alert('Error', 'Failed to update setting. Your change has been reverted.');
      // Revert the change on failure
      setSettings(settings);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await rfidService.connect();
      Alert.alert('Success', 'Connected to RFID reader');
    } catch (error) {
      console.error('Connection failed:', error);
      Alert.alert('Connection Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await rfidService.disconnect();
      Alert.alert('Success', 'Disconnected from RFID reader');
    } catch (error) {
      console.error('Disconnect failed:', error);
      Alert.alert('Error', 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInventory = async () => {
    try {
      await rfidService.startInventory();
      Alert.alert('Success', 'Started tag scanning');
    } catch (error) {
      console.error('Start inventory failed:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start scanning');
    }
  };

  const handleStopInventory = async () => {
    try {
      await rfidService.stopInventory();
      Alert.alert('Success', 'Stopped tag scanning');
    } catch (error) {
      console.error('Stop inventory failed:', error);
      Alert.alert('Error', 'Failed to stop scanning');
    }
  };

  const renderReaderTypeOption = (type: ReaderType, title: string, description: string) => (
    <TouchableOpacity
      key={type}
      style={[
        styles.readerTypeOption,
        settings?.readerType === type && styles.readerTypeOptionSelected
      ]}
      onPress={() => handleReaderTypeChange(type)}
      disabled={loading}
    >
      <View style={styles.readerTypeContent}>
        <Text style={[
          styles.readerTypeTitle,
          settings?.readerType === type && styles.readerTypeSelectedText
        ]}>
          {title}
        </Text>
        <Text style={[
          styles.readerTypeDescription,
          settings?.readerType === type && styles.readerTypeSelectedText
        ]}>
          {description}
        </Text>
      </View>
      <View style={[
        styles.radioButton,
        settings?.readerType === type && styles.radioButtonSelected
      ]}>
        {settings?.readerType === type && <View style={styles.radioButtonInner} />}
      </View>
    </TouchableOpacity>
  );

  if (!settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Reader Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reader Status</Text>
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Connection:</Text>
            <Text style={[
              styles.statusValue,
              status?.isConnected ? styles.statusConnected : styles.statusDisconnected
            ]}>
              {connecting ? 'Connecting...' : status?.isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Reader Type:</Text>
            <Text style={styles.statusValue}>{status?.readerType.toUpperCase()}</Text>
          </View>
          {status?.isScanning && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Scanning:</Text>
              <Text style={[styles.statusValue, styles.statusScanning]}>Active</Text>
            </View>
          )}
          {status?.error && (
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Error:</Text>
              <Text style={[styles.statusValue, styles.statusError]}>{status.error}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Connection Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Connection Controls</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.connectButton,
              (connecting || status?.isConnected) && styles.buttonDisabled
            ]}
            onPress={handleConnect}
            disabled={connecting || status?.isConnected || loading}
          >
            {connecting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.controlButtonText}>Connect</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.controlButton,
              styles.disconnectButton,
              !status?.isConnected && styles.buttonDisabled
            ]}
            onPress={handleDisconnect}
            disabled={!status?.isConnected || loading}
          >
            <Text style={styles.controlButtonText}>Disconnect</Text>
          </TouchableOpacity>
        </View>

        {status?.isConnected && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.controlButton, styles.startButton]}
              onPress={handleStartInventory}
            >
              <Text style={styles.controlButtonText}>Start Scanning</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton]}
              onPress={handleStopInventory}
            >
              <Text style={styles.controlButtonText}>Stop Scanning</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Reader Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reader Type</Text>
        <View style={styles.readerTypeContainer}>
          {renderReaderTypeOption(
            'mock',
            'Mock Reader',
            'For development and testing - generates fake tag reads'
          )}
          {renderReaderTypeOption(
            'ble',
            'Bluetooth LE Reader',
            'Generic Bluetooth Low Energy RFID reader'
          )}
          {renderReaderTypeOption(
            'vendor',
            'Vendor SDK Reader',
            'Hardware-specific reader with vendor SDK'
          )}
        </View>
      </View>

      {/* Auto Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Automatic Settings</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto Connect</Text>
            <Text style={styles.settingDescription}>
              Automatically connect to reader when app starts
            </Text>
          </View>
          <Switch
            value={settings.autoConnect}
            onValueChange={(value) => handleSettingChange('autoConnect', value)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings.autoConnect ? '#007AFF' : '#f4f3f4'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Auto Start Inventory</Text>
            <Text style={styles.settingDescription}>
              Automatically start scanning when connected
            </Text>
          </View>
          <Switch
            value={settings.autoStartInventory}
            onValueChange={(value) => handleSettingChange('autoStartInventory', value)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={settings.autoStartInventory ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Help Text */}
      <View style={styles.section}>
        <Text style={styles.helpTitle}>Reader Information</Text>
        <Text style={styles.helpText}>
          • <Text style={styles.helpBold}>Mock Reader:</Text> Use for testing without physical hardware. 
          Generates random EPC tags every few seconds.{'\n\n'}
          • <Text style={styles.helpBold}>Bluetooth LE:</Text> For generic BLE RFID readers. 
          Requires implementation of specific BLE protocol.{'\n\n'}
          • <Text style={styles.helpBold}>Vendor SDK:</Text> For readers with specific SDKs 
          (Zebra, Impinj, TSL, etc.). Requires vendor SDK integration.
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusValue: {
    fontSize: 16,
    color: '#666',
  },
  statusConnected: {
    color: '#34C759',
    fontWeight: '600',
  },
  statusDisconnected: {
    color: '#FF9500',
    fontWeight: '600',
  },
  statusError: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  statusScanning: {
    color: '#007AFF',
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  controlButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  connectButton: {
    backgroundColor: '#34C759',
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
  },
  startButton: {
    backgroundColor: '#007AFF',
  },
  stopButton: {
    backgroundColor: '#FF9500',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  readerTypeContainer: {
    gap: 12,
  },
  readerTypeOption: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  readerTypeOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  readerTypeContent: {
    flex: 1,
    marginRight: 16,
  },
  readerTypeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  readerTypeDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  readerTypeSelectedText: {
    color: '#007AFF',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  settingRow: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  helpBold: {
    fontWeight: '600',
    color: '#333',
  },
});