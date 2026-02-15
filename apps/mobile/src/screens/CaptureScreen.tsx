import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { DatabaseService } from '../services/database';
import { LocationService } from '../services/locationService';
import { RfidService } from '../services/rfid';
import { Schema, SchemaField, Capture } from '../types';
import { RfidTag, ReaderStatus } from '../types/rfid';
import { RootStackParamList } from '../navigation/AppNavigator';

type CaptureScreenRouteProp = RouteProp<RootStackParamList, 'Capture'>;

interface Props {
  route: CaptureScreenRouteProp;
}

export default function CaptureScreen({ route }: Props) {
  const { batchId, batchName } = route.params;
  
  const [schema, setSchema] = useState<Schema | null>(null);
  const [rfidTag, setRfidTag] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [recentCaptures, setRecentCaptures] = useState<Capture[]>([]);
  const [readerStatus, setReaderStatus] = useState<ReaderStatus | null>(null);
  const [autoCreateCapture, setAutoCreateCapture] = useState(false);
  const [processingTag, setProcessingTag] = useState(false);
  const [duplicateTagsSet] = useState(() => new Set<string>());

  const rfidService = RfidService.getInstance();
  const rfidServiceRef = useRef(rfidService);

  useEffect(() => {
    loadBatchSchema();
    requestLocationPermission();
    loadRecentCaptures();
    
    // Initialize RFID reader status and listeners
    const status = rfidServiceRef.current.getStatus();
    setReaderStatus(status);
    
    rfidServiceRef.current.addStatusListener(handleReaderStatusChange);
    rfidServiceRef.current.addTagListener(handleTagRead);

    return () => {
      rfidServiceRef.current.removeStatusListener(handleReaderStatusChange);
      rfidServiceRef.current.removeTagListener(handleTagRead);
    };
  }, [handleReaderStatusChange, handleTagRead, loadRecentCaptures]);

  const loadBatchSchema = async () => {
    try {
      // Use DatabaseService to get batch details
      const batches = await DatabaseService.getBatches(''); // This would need organization context
      const batch = batches.find(b => b.id === batchId);
      
      if (!batch) {
        throw new Error('Batch not found');
      }

      const schemaData = await DatabaseService.getSchemaById(batch.schema_id);
      if (!schemaData) {
        throw new Error('Schema not found');
      }
      
      setSchema(schemaData);
    } catch (error) {
      console.error('Error loading schema:', error);
      Alert.alert('Error', 'Failed to load batch schema');
    } finally {
      setLoadingSchema(false);
    }
  };

  const requestLocationPermission = async () => {
    const hasPermission = await LocationService.requestPermissions();
    setLocationPermission(hasPermission);
    
    if (hasPermission) {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = useCallback(async () => {
    try {
      const locationData = await LocationService.getCurrentLocation();
      setLocation(locationData);
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  }, []);

  const loadRecentCaptures = useCallback(async () => {
    try {
      const captures = await DatabaseService.getCapturesByBatch(batchId);
      const recentCaps = captures.slice(0, 5); // Show only last 5
      setRecentCaptures(recentCaps);
      
      // Update duplicate tags set with recent captures
      duplicateTagsSet.clear();
      recentCaps.forEach(capture => duplicateTagsSet.add(capture.rfid_tag));
    } catch (error) {
      console.error('Error loading recent captures:', error);
    }
  }, [batchId, duplicateTagsSet]);

  const handleReaderStatusChange = useCallback((status: ReaderStatus) => {
    setReaderStatus(status);
  }, []);

  const handleTagRead = useCallback((tag: RfidTag) => {
    // Prevent processing if already processing a tag
    if (processingTag) {
      return;
    }

    // Check for duplicate tags
    if (duplicateTagsSet.has(tag.epc)) {
      Alert.alert(
        'Duplicate Tag', 
        `Tag ${tag.epc.substring(0, 12)}... has already been captured in this batch.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Capture Anyway', onPress: () => processCapturedTag(tag) }
        ]
      );
      return;
    }

    processCapturedTag(tag);
  }, [processingTag, duplicateTagsSet, autoCreateCapture, schema, location, formData]);

  const processCapturedTag = useCallback((tag: RfidTag) => {
    // Auto-populate RFID tag field
    setRfidTag(tag.epc);
    
    // If auto-create is enabled and we have required data, create capture automatically
    if (autoCreateCapture && schema && location && !processingTag) {
      // Check if all required fields are filled (excluding RFID tag)
      const allRequiredFieldsFilled = schema.fields.every(field => 
        !field.required || formData[field.name]
      );
      
      if (allRequiredFieldsFilled) {
        createAutomaticCapture(tag);
      }
    }
  }, [autoCreateCapture, schema, location, formData, processingTag]);

  const createAutomaticCapture = useCallback(async (tag: RfidTag) => {
    if (!schema || !location || processingTag) return;

    setProcessingTag(true);
    try {
      const capture: Omit<Capture, 'id'> = {
        batch_id: batchId,
        rfid_tag: tag.epc,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: new Date().toISOString(),
        data: { ...formData },
        synced: false,
      };

      await DatabaseService.createCapture(capture);
      
      // Add to duplicates set
      duplicateTagsSet.add(tag.epc);
      
      // Clear form for next capture
      setRfidTag('');
      setFormData({});
      
      // Refresh recent captures
      await loadRecentCaptures();
      
      // Show brief success feedback
      Alert.alert('Auto Capture', `Created capture for tag ${tag.epc.substring(0, 12)}...`, 
        [{ text: 'OK' }], { cancelable: true });
    } catch (error) {
      console.error('Error creating automatic capture:', error);
      Alert.alert('Error', 'Failed to create automatic capture');
    } finally {
      setProcessingTag(false);
    }
  }, [schema, location, formData, batchId, processingTag, duplicateTagsSet, loadRecentCaptures]);

  const handleSaveCapture = useCallback(async () => {
    const trimmedTag = rfidTag.trim();
    
    if (!trimmedTag) {
      Alert.alert('Error', 'Please enter an RFID tag');
      return;
    }

    if (!schema) {
      Alert.alert('Error', 'Schema not loaded');
      return;
    }

    // Validate required fields
    for (const field of schema.fields) {
      if (field.required && (!formData[field.name] && formData[field.name] !== 0 && formData[field.name] !== false)) {
        Alert.alert('Error', `${field.label} is required`);
        return;
      }
    }

    // Check for duplicates
    if (duplicateTagsSet.has(trimmedTag)) {
      Alert.alert(
        'Duplicate Tag', 
        `Tag ${trimmedTag.substring(0, 12)}... has already been captured in this batch.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Anyway', onPress: () => performSaveCapture(trimmedTag) }
        ]
      );
      return;
    }

    performSaveCapture(trimmedTag);
  }, [rfidTag, schema, formData, duplicateTagsSet]);

  const performSaveCapture = useCallback(async (trimmedTag: string) => {
    setLoading(true);
    try {
      const capture: Omit<Capture, 'id'> = {
        batch_id: batchId,
        rfid_tag: trimmedTag,
        latitude: location?.latitude,
        longitude: location?.longitude,
        timestamp: new Date().toISOString(),
        data: formData,
        synced: false,
      };

      await DatabaseService.createCapture(capture);

      // Add to duplicates set
      duplicateTagsSet.add(trimmedTag);

      // Clear form
      setRfidTag('');
      setFormData({});
      
      // Refresh location and recent captures
      getCurrentLocation();
      await loadRecentCaptures();

      Alert.alert('Success', 'Capture saved successfully');
    } catch (error) {
      console.error('Error saving capture:', error);
      Alert.alert('Error', 'Failed to save capture');
    } finally {
      setLoading(false);
    }
  }, [batchId, location, formData, duplicateTagsSet, loadRecentCaptures, getCurrentLocation]);

  const updateFormData = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  }, []);

  const renderFormField = (field: SchemaField) => {
    const value = formData[field.name] || '';
    
    switch (field.type) {
      case 'text':
        return (
          <TextInput
            key={field.name}
            style={styles.input}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={value}
            onChangeText={(text) => updateFormData(field.name, text)}
            multiline={field.name === 'notes'}
            numberOfLines={field.name === 'notes' ? 3 : 1}
          />
        );
      
      case 'number':
        return (
          <TextInput
            key={field.name}
            style={styles.input}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={value?.toString() || ''}
            onChangeText={(text) => {
              const numValue = text === '' ? undefined : parseFloat(text);
              updateFormData(field.name, isNaN(numValue!) ? undefined : numValue);
            }}
            keyboardType="numeric"
          />
        );

      case 'boolean':
        return (
          <View key={field.name} style={styles.booleanContainer}>
            <TouchableOpacity
              style={[styles.booleanButton, value === true && styles.booleanButtonActive]}
              onPress={() => updateFormData(field.name, true)}
              accessibilityLabel={`Set ${field.label} to Yes`}
              accessibilityRole="button"
            >
              <Text style={[styles.booleanButtonText, value === true && styles.booleanButtonTextActive]}>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.booleanButton, value === false && styles.booleanButtonActive]}
              onPress={() => updateFormData(field.name, false)}
              accessibilityLabel={`Set ${field.label} to No`}
              accessibilityRole="button"
            >
              <Text style={[styles.booleanButtonText, value === false && styles.booleanButtonTextActive]}>
                No
              </Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <TextInput
            key={field.name}
            style={styles.input}
            placeholder={`Enter ${field.label.toLowerCase()}`}
            value={value}
            onChangeText={(text) => updateFormData(field.name, text)}
          />
        );
    }
  };

  if (loadingSchema) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading schema...</Text>
      </View>
    );
  }

  if (!schema) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load batch schema</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Status Container */}
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Location:</Text>
            <Text style={[
              styles.statusValue,
              location ? styles.statusValueActive : styles.statusValueInactive
            ]}>
              {location 
                ? `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                : locationPermission === false
                  ? 'Permission denied'
                  : 'Getting location...'
              }
            </Text>
          </View>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>RFID Reader:</Text>
            <Text style={[
              styles.statusValue,
              readerStatus?.isConnected ? styles.statusValueActive : styles.statusValueInactive
            ]}>
              {readerStatus?.isConnected ? 'Connected' : 'Disconnected'}
            </Text>
          </View>
          
          {!locationPermission && (
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestLocationPermission}
            >
              <Text style={styles.permissionButtonText}>Enable Location</Text>
            </TouchableOpacity>
          )}

          {/* Auto-create toggle */}
          <View style={styles.autoCreateContainer}>
            <TouchableOpacity
              style={[
                styles.autoCreateToggle,
                autoCreateCapture && styles.autoCreateToggleActive
              ]}
              onPress={() => setAutoCreateCapture(!autoCreateCapture)}
            >
              <View style={[
                styles.toggleSwitch,
                autoCreateCapture && styles.toggleSwitchActive
              ]}>
                <View style={[
                  styles.toggleKnob,
                  autoCreateCapture && styles.toggleKnobActive
                ]} />
              </View>
              <Text style={[
                styles.autoCreateLabel,
                autoCreateCapture && styles.autoCreateLabelActive
              ]}>
                Auto-create captures
              </Text>
            </TouchableOpacity>
            <Text style={styles.autoCreateDescription}>
              Automatically create captures when RFID tags are read
            </Text>
          </View>
        </View>

        {/* RFID Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RFID Tag</Text>
          <TextInput
            style={[styles.input, styles.rfidInput]}
            placeholder="Scan or enter RFID tag"
            value={rfidTag}
            onChangeText={setRfidTag}
            autoCapitalize="characters"
            autoFocus
          />
        </View>

        {/* Dynamic Form Fields */}
        {schema.fields.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data Fields</Text>
            {schema.fields.map((field) => (
              <View key={field.name} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  {field.label}
                  {field.required && <Text style={styles.required}> *</Text>}
                </Text>
                {renderFormField(field)}
              </View>
            ))}
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSaveCapture}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save Capture</Text>
          )}
        </TouchableOpacity>

        {/* Recent Captures */}
        {recentCaptures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Captures</Text>
            {recentCaptures.map((capture, index) => (
              <View key={capture.id} style={styles.captureItem}>
                <Text style={styles.captureTag}>{capture.rfid_tag}</Text>
                <Text style={styles.captureTime}>
                  {new Date(capture.timestamp).toLocaleTimeString()}
                </Text>
                <View style={[styles.syncIndicator, capture.synced && styles.syncIndicatorSynced]}>
                  <Text style={[styles.syncIndicatorText, capture.synced && styles.syncIndicatorTextSynced]}>
                    {capture.synced ? '✓' : '○'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusItem: {
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusValueActive: {
    color: '#34C759',
  },
  statusValueInactive: {
    color: '#FF9500',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  rfidInput: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  booleanContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  booleanButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  booleanButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  booleanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  booleanButtonTextActive: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#34C759',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  captureItem: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  captureTag: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  captureTime: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 16,
  },
  syncIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF9500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncIndicatorSynced: {
    backgroundColor: '#34C759',
  },
  syncIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncIndicatorTextSynced: {
    color: 'white',
  },
  autoCreateContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  autoCreateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    backgroundColor: '#ddd',
    borderRadius: 14,
    marginRight: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#34C759',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: 'flex-start',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  autoCreateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  autoCreateLabelActive: {
    color: '#34C759',
  },
  autoCreateDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});