import React, { useState, useEffect } from 'react';
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
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseService } from '../services/database';
import { Schema, SchemaField } from '../types';
import { BatchesStackParamList } from '../navigation/AppNavigator';

type CreateBatchScreenNavigationProp = StackNavigationProp<BatchesStackParamList, 'CreateBatch'>;

interface Props {
  navigation: CreateBatchScreenNavigationProp;
}

export default function CreateBatchScreen({ navigation }: Props) {
  const [batchName, setBatchName] = useState('');
  const [schemas, setSchemas] = useState<Schema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSchemas, setLoadingSchemas] = useState(true);
  
  // New schema creation
  const [showCreateSchema, setShowCreateSchema] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [newSchemaFields, setNewSchemaFields] = useState<SchemaField[]>([
    { name: 'notes', type: 'text', required: false, label: 'Notes' }
  ]);

  const { selectedOrganization } = useAuth();

  useEffect(() => {
    loadSchemas();
  }, []);

  const loadSchemas = async () => {
    if (!selectedOrganization) return;

    try {
      const schemaList = await DatabaseService.getSchemas(selectedOrganization.id);
      setSchemas(schemaList);
    } catch (error) {
      console.error('Error loading schemas:', error);
      Alert.alert('Error', 'Failed to load schemas');
    } finally {
      setLoadingSchemas(false);
    }
  };

  const handleCreateBatch = async () => {
    if (!batchName.trim()) {
      Alert.alert('Error', 'Please enter a batch name');
      return;
    }

    if (!selectedSchema) {
      Alert.alert('Error', 'Please select a schema');
      return;
    }

    if (!selectedOrganization) {
      Alert.alert('Error', 'No organization selected');
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      await DatabaseService.createBatch({
        name: batchName.trim(),
        organization_id: selectedOrganization.id,
        schema_id: selectedSchema.id!,
        created_at: now,
        updated_at: now,
        synced: false,
      });

      Alert.alert('Success', 'Batch created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error('Error creating batch:', error);
      Alert.alert('Error', 'Failed to create batch');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchema = async () => {
    if (!newSchemaName.trim()) {
      Alert.alert('Error', 'Please enter a schema name');
      return;
    }

    if (newSchemaFields.length === 0) {
      Alert.alert('Error', 'Please add at least one field');
      return;
    }

    if (!selectedOrganization) {
      Alert.alert('Error', 'No organization selected');
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      const schemaId = await DatabaseService.createSchema({
        name: newSchemaName.trim(),
        organization_id: selectedOrganization.id,
        fields: newSchemaFields,
        created_at: now,
        updated_at: now,
        synced: false,
      });

      // Create the new schema object and select it
      const newSchema: Schema = {
        id: schemaId,
        name: newSchemaName.trim(),
        organization_id: selectedOrganization.id,
        fields: newSchemaFields,
        created_at: now,
        updated_at: now,
        synced: false,
      };

      setSchemas([newSchema, ...schemas]);
      setSelectedSchema(newSchema);
      setShowCreateSchema(false);
      setNewSchemaName('');
      setNewSchemaFields([{ name: 'notes', type: 'text', required: false, label: 'Notes' }]);
    } catch (error) {
      console.error('Error creating schema:', error);
      Alert.alert('Error', 'Failed to create schema');
    } finally {
      setLoading(false);
    }
  };

  const addSchemaField = () => {
    setNewSchemaFields([
      ...newSchemaFields,
      { name: '', type: 'text', required: false, label: '' },
    ]);
  };

  const updateSchemaField = (index: number, field: Partial<SchemaField>) => {
    const updatedFields = [...newSchemaFields];
    updatedFields[index] = { ...updatedFields[index], ...field };
    setNewSchemaFields(updatedFields);
  };

  const removeSchemaField = (index: number) => {
    if (newSchemaFields.length > 1) {
      setNewSchemaFields(newSchemaFields.filter((_, i) => i !== index));
    }
  };

  const renderSchemaField = (field: SchemaField, index: number) => (
    <View key={index} style={styles.fieldContainer}>
      <TextInput
        style={styles.fieldInput}
        placeholder="Field Label"
        value={field.label}
        onChangeText={(text) => updateSchemaField(index, { label: text, name: text.toLowerCase().replace(/\s+/g, '_') })}
      />
      <TouchableOpacity
        style={styles.removeFieldButton}
        onPress={() => removeSchemaField(index)}
        disabled={newSchemaFields.length === 1}
      >
        <Text style={[styles.removeFieldButtonText, newSchemaFields.length === 1 && styles.disabled]}>
          Remove
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (loadingSchemas) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading schemas...</Text>
      </View>
    );
  }

  if (showCreateSchema) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Create Schema</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Schema Name</Text>
            <TextInput
              style={styles.input}
              value={newSchemaName}
              onChangeText={setNewSchemaName}
              placeholder="Enter schema name"
            />

            <Text style={styles.label}>Fields</Text>
            {newSchemaFields.map((field, index) => renderSchemaField(field, index))}

            <TouchableOpacity style={styles.addFieldButton} onPress={addSchemaField}>
              <Text style={styles.addFieldButtonText}>+ Add Field</Text>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={() => setShowCreateSchema(false)}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleCreateSchema}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Create Schema</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Create New Batch</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Batch Name</Text>
          <TextInput
            style={styles.input}
            value={batchName}
            onChangeText={setBatchName}
            placeholder="Enter batch name"
          />

          <Text style={styles.label}>Schema</Text>
          {schemas.length === 0 ? (
            <View style={styles.emptySchemas}>
              <Text style={styles.emptySchemasText}>No schemas available</Text>
              <TouchableOpacity
                style={styles.createSchemaButton}
                onPress={() => setShowCreateSchema(true)}
              >
                <Text style={styles.createSchemaButtonText}>Create Schema</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView style={styles.schemaList} horizontal showsHorizontalScrollIndicator={false}>
                {schemas.map((schema) => (
                  <TouchableOpacity
                    key={schema.id}
                    style={[
                      styles.schemaItem,
                      selectedSchema?.id === schema.id && styles.schemaItemSelected,
                    ]}
                    onPress={() => setSelectedSchema(schema)}
                  >
                    <Text style={[
                      styles.schemaItemText,
                      selectedSchema?.id === schema.id && styles.schemaItemTextSelected,
                    ]}>
                      {schema.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.createSchemaButton}
                onPress={() => setShowCreateSchema(true)}
              >
                <Text style={styles.createSchemaButtonText}>+ Create New Schema</Text>
              </TouchableOpacity>
            </>
          )}

          {selectedSchema && (
            <View style={styles.schemaPreview}>
              <Text style={styles.schemaPreviewTitle}>Schema Fields:</Text>
              {selectedSchema.fields.map((field, index) => (
                <Text key={index} style={styles.schemaField}>
                  • {field.label} ({field.type})
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreateBatch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Create Batch</Text>
            )}
          </TouchableOpacity>
        </View>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  schemaList: {
    maxHeight: 60,
    marginBottom: 16,
  },
  schemaItem: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  schemaItemSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  schemaItemText: {
    fontSize: 16,
    color: '#333',
  },
  schemaItemTextSelected: {
    color: 'white',
  },
  createSchemaButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  createSchemaButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptySchemas: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emptySchemasText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  schemaPreview: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  schemaPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  schemaField: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  fieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldInput: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 12,
  },
  removeFieldButton: {
    padding: 8,
  },
  removeFieldButtonText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  addFieldButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  addFieldButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    backgroundColor: '#007AFF',
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabled: {
    color: '#ccc',
  },
});