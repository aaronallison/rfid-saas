import { DatabaseService } from './database';
import { LocationService } from './locationService';
import { RfidService } from './rfid';
import { Capture, Schema, SchemaField } from '../types';
import { RfidTag } from '../types/rfid';

export interface CaptureValidationError {
  field: string;
  message: string;
}

export interface CaptureCreationOptions {
  rfidTag: string;
  batchId: number;
  formData: Record<string, any>;
  location?: { latitude: number; longitude: number };
  timestamp?: string;
}

export interface AutoCaptureConfig {
  enabled: boolean;
  requireLocation: boolean;
  requireAllFields: boolean;
  onAutoCapture?: (capture: Capture) => void;
}

export class CaptureService {
  private static instance: CaptureService;
  private rfidService: RfidService;
  private autoCaptureConfig: AutoCaptureConfig = {
    enabled: false,
    requireLocation: false,
    requireAllFields: false,
  };

  private constructor() {
    this.rfidService = RfidService.getInstance();
  }

  static getInstance(): CaptureService {
    if (!CaptureService.instance) {
      CaptureService.instance = new CaptureService();
    }
    return CaptureService.instance;
  }

  /**
   * Create a new capture with validation
   */
  async createCapture(options: CaptureCreationOptions): Promise<Capture> {
    const { rfidTag, batchId, formData, location, timestamp } = options;

    // Basic validation
    if (!rfidTag?.trim()) {
      throw new Error('RFID tag is required');
    }

    if (!batchId) {
      throw new Error('Batch ID is required');
    }

    // Get current location if not provided
    let captureLocation = location;
    if (!captureLocation) {
      try {
        captureLocation = await LocationService.getCurrentLocation();
      } catch (error) {
        console.warn('Could not get location for capture:', error);
      }
    }

    const capture: Omit<Capture, 'id'> = {
      batch_id: batchId,
      rfid_tag: rfidTag.trim(),
      latitude: captureLocation?.latitude,
      longitude: captureLocation?.longitude,
      timestamp: timestamp || new Date().toISOString(),
      data: { ...formData },
      synced: false,
    };

    try {
      const captureId = await DatabaseService.createCapture(capture);
      const createdCapture = { ...capture, id: captureId };
      
      console.log('Capture created successfully:', {
        id: captureId,
        rfid_tag: rfidTag,
        batch_id: batchId,
        hasLocation: !!captureLocation,
        dataFields: Object.keys(formData).length
      });

      return createdCapture;
    } catch (error) {
      console.error('Failed to create capture:', error);
      throw new Error(`Failed to create capture: ${error}`);
    }
  }

  /**
   * Validate capture data against schema
   */
  validateCaptureData(
    formData: Record<string, any>,
    schema: Schema,
    rfidTag?: string
  ): CaptureValidationError[] {
    const errors: CaptureValidationError[] = [];

    // Validate RFID tag
    if (!rfidTag?.trim()) {
      errors.push({
        field: 'rfid_tag',
        message: 'RFID tag is required'
      });
    } else if (rfidTag.length < 4) {
      errors.push({
        field: 'rfid_tag',
        message: 'RFID tag must be at least 4 characters'
      });
    }

    // Validate schema fields
    for (const field of schema.fields) {
      const value = formData[field.name];
      
      if (field.required && this.isFieldEmpty(value)) {
        errors.push({
          field: field.name,
          message: `${field.label} is required`
        });
        continue;
      }

      if (!this.isFieldEmpty(value)) {
        const fieldError = this.validateFieldValue(field, value);
        if (fieldError) {
          errors.push({
            field: field.name,
            message: fieldError
          });
        }
      }
    }

    return errors;
  }

  /**
   * Get captures for a specific batch with optional filtering
   */
  async getCapturesForBatch(
    batchId: number,
    options: {
      limit?: number;
      onlySynced?: boolean;
      onlyUnsynced?: boolean;
    } = {}
  ): Promise<Capture[]> {
    try {
      const captures = await DatabaseService.getCapturesByBatch(batchId);
      
      let filtered = captures;
      
      if (options.onlySynced) {
        filtered = filtered.filter(c => c.synced);
      } else if (options.onlyUnsynced) {
        filtered = filtered.filter(c => !c.synced);
      }

      if (options.limit && options.limit > 0) {
        filtered = filtered.slice(0, options.limit);
      }

      return filtered;
    } catch (error) {
      console.error('Failed to get captures for batch:', error);
      throw new Error(`Failed to get captures: ${error}`);
    }
  }

  /**
   * Configure auto-capture behavior
   */
  setAutoCaptureConfig(config: Partial<AutoCaptureConfig>): void {
    this.autoCaptureConfig = { ...this.autoCaptureConfig, ...config };
  }

  /**
   * Get current auto-capture configuration
   */
  getAutoCaptureConfig(): AutoCaptureConfig {
    return { ...this.autoCaptureConfig };
  }

  /**
   * Handle automatic capture creation when RFID tag is read
   */
  async handleAutomaticCapture(
    tag: RfidTag,
    batchId: number,
    formData: Record<string, any>,
    schema: Schema
  ): Promise<Capture | null> {
    if (!this.autoCaptureConfig.enabled) {
      return null;
    }

    try {
      // Check if location is required and available
      if (this.autoCaptureConfig.requireLocation) {
        const hasLocationPermission = await LocationService.requestPermissions();
        if (!hasLocationPermission) {
          console.warn('Auto-capture skipped: Location permission denied');
          return null;
        }
      }

      // Check if all required fields are filled
      if (this.autoCaptureConfig.requireAllFields) {
        const requiredFields = schema.fields.filter(f => f.required);
        const missingFields = requiredFields.filter(f => this.isFieldEmpty(formData[f.name]));
        
        if (missingFields.length > 0) {
          console.warn('Auto-capture skipped: Missing required fields:', 
            missingFields.map(f => f.label));
          return null;
        }
      }

      // Create the capture
      const capture = await this.createCapture({
        rfidTag: tag.epc,
        batchId,
        formData,
        timestamp: new Date().toISOString()
      });

      // Call the callback if provided
      if (this.autoCaptureConfig.onAutoCapture) {
        this.autoCaptureConfig.onAutoCapture(capture);
      }

      console.log('Auto-capture created:', {
        rfid_tag: tag.epc.substring(0, 12) + '...',
        batch_id: batchId,
        auto: true
      });

      return capture;
    } catch (error) {
      console.error('Failed to create auto-capture:', error);
      return null;
    }
  }

  /**
   * Get capture statistics for a batch
   */
  async getCaptureStats(batchId: number): Promise<{
    total: number;
    synced: number;
    unsynced: number;
    uniqueTags: number;
    dateRange: { earliest: string; latest: string } | null;
  }> {
    try {
      const captures = await DatabaseService.getCapturesByBatch(batchId);
      
      const stats = {
        total: captures.length,
        synced: captures.filter(c => c.synced).length,
        unsynced: captures.filter(c => !c.synced).length,
        uniqueTags: new Set(captures.map(c => c.rfid_tag)).size,
        dateRange: null as { earliest: string; latest: string } | null
      };

      if (captures.length > 0) {
        const timestamps = captures.map(c => c.timestamp).sort();
        stats.dateRange = {
          earliest: timestamps[0],
          latest: timestamps[timestamps.length - 1]
        };
      }

      return stats;
    } catch (error) {
      console.error('Failed to get capture stats:', error);
      throw new Error(`Failed to get capture statistics: ${error}`);
    }
  }

  /**
   * Check if a field value is considered empty
   */
  private isFieldEmpty(value: any): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    if (typeof value === 'number') {
      return isNaN(value);
    }
    if (typeof value === 'boolean') {
      return false; // Booleans are never empty, even false is a valid value
    }
    return !value;
  }

  /**
   * Validate a specific field value against its schema definition
   */
  private validateFieldValue(field: SchemaField, value: any): string | null {
    switch (field.type) {
      case 'text':
        if (typeof value !== 'string') {
          return `${field.label} must be text`;
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return `${field.label} must be a valid number`;
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return `${field.label} must be true or false`;
        }
        break;

      case 'date':
        if (typeof value === 'string') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return `${field.label} must be a valid date`;
          }
        } else if (!(value instanceof Date)) {
          return `${field.label} must be a valid date`;
        }
        break;

      default:
        // Unknown field type, no validation
        break;
    }

    return null;
  }

  /**
   * Format capture data for display
   */
  formatCaptureForDisplay(capture: Capture): {
    id: string;
    rfidTag: string;
    timestamp: string;
    location: string | null;
    syncStatus: 'synced' | 'pending';
    dataFields: { label: string; value: string }[];
  } {
    return {
      id: capture.id?.toString() || 'unknown',
      rfidTag: capture.rfid_tag,
      timestamp: new Date(capture.timestamp).toLocaleString(),
      location: capture.latitude && capture.longitude
        ? `${capture.latitude.toFixed(6)}, ${capture.longitude.toFixed(6)}`
        : null,
      syncStatus: capture.synced ? 'synced' : 'pending',
      dataFields: Object.entries(capture.data).map(([key, value]) => ({
        label: key,
        value: String(value)
      }))
    };
  }

  /**
   * Duplicate detection - check if similar capture exists
   */
  async checkForDuplicate(
    rfidTag: string,
    batchId: number,
    withinMinutes: number = 5
  ): Promise<Capture | null> {
    try {
      const captures = await DatabaseService.getCapturesByBatch(batchId);
      const cutoffTime = new Date(Date.now() - withinMinutes * 60 * 1000);

      const duplicate = captures.find(capture => 
        capture.rfid_tag === rfidTag &&
        new Date(capture.timestamp) > cutoffTime
      );

      return duplicate || null;
    } catch (error) {
      console.error('Failed to check for duplicates:', error);
      return null;
    }
  }
}

export default CaptureService;