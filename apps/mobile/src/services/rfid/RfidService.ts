import AsyncStorage from '@react-native-async-storage/async-storage';
import { IRfidReader, ReaderType, ReaderSettings, ReaderStatus, RfidTag } from '../../types/rfid';
import { MockReader } from './MockReader';
import { BleReader } from './BleReader';
import { VendorReader } from './VendorReader';

const SETTINGS_KEY = 'rfid_settings';

/**
 * Singleton service to manage RFID readers
 */
export class RfidService {
  private static instance: RfidService;
  private reader: IRfidReader | null = null;
  private settings: ReaderSettings = {
    readerType: 'mock',
    autoConnect: false,
    autoStartInventory: false,
  };
  
  private statusListeners: ((status: ReaderStatus) => void)[] = [];
  private tagListeners: ((tag: RfidTag) => void)[] = [];
  private isScanning = false;
  private lastError: string | undefined;

  private constructor() {
    this.loadSettings();
  }

  static getInstance(): RfidService {
    if (!RfidService.instance) {
      RfidService.instance = new RfidService();
    }
    return RfidService.instance;
  }

  /**
   * Get current reader settings
   */
  getSettings(): ReaderSettings {
    return { ...this.settings };
  }

  /**
   * Update reader settings
   */
  async updateSettings(newSettings: Partial<ReaderSettings>): Promise<void> {
    const wasConnected = this.reader?.isConnected() || false;
    const wasScanning = this.isScanning;
    const previousReaderType = this.settings.readerType;
    
    try {
      // Stop scanning if active before making changes
      if (wasScanning) {
        await this.stopInventory();
      }
      
      // Disconnect if reader type is changing
      if (newSettings.readerType && newSettings.readerType !== this.settings.readerType && wasConnected) {
        await this.disconnect();
      }

      // Update settings
      this.settings = { ...this.settings, ...newSettings };
      await this.saveSettings();
      
      // Create new reader instance if type changed
      if (newSettings.readerType && newSettings.readerType !== previousReaderType) {
        this.createReader();
      }
      
      // Auto-reconnect if it was connected before and autoConnect is enabled
      if (wasConnected) {
        try {
          await this.connect();
          
          // Resume scanning if it was active before
          if (wasScanning || this.settings.autoStartInventory) {
            await this.startInventory();
          }
        } catch (error) {
          console.error('Failed to reconnect after settings change:', error);
          this.lastError = error instanceof Error ? error.message : 'Failed to reconnect';
        }
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      this.lastError = error instanceof Error ? error.message : 'Settings update failed';
      throw error;
    } finally {
      this.notifyStatusListeners();
    }
  }

  /**
   * Get current reader status
   */
  getStatus(): ReaderStatus {
    return {
      isConnected: this.reader?.isConnected() || false,
      isScanning: this.isScanning,
      readerType: this.settings.readerType,
      error: this.lastError,
    };
  }

  /**
   * Connect to the current reader
   */
  async connect(): Promise<void> {
    if (!this.reader) {
      this.createReader();
    }

    if (!this.reader) {
      const error = 'No reader available';
      this.lastError = error;
      this.notifyStatusListeners();
      throw new Error(error);
    }

    try {
      this.lastError = undefined;
      await this.reader.connect();
      this.notifyStatusListeners();
      
      if (this.settings.autoStartInventory) {
        await this.startInventory();
      }
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Connection failed';
      this.notifyStatusListeners();
      throw error;
    }
  }

  /**
   * Disconnect from the current reader
   */
  async disconnect(): Promise<void> {
    if (!this.reader) return;

    try {
      this.lastError = undefined;
      this.isScanning = false;
      await this.reader.disconnect();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Disconnect failed';
      console.error('Error disconnecting from reader:', error);
    } finally {
      this.notifyStatusListeners();
    }
  }

  /**
   * Start inventory/scanning
   */
  async startInventory(): Promise<void> {
    if (!this.reader || !this.reader.isConnected()) {
      const error = 'Reader not connected';
      this.lastError = error;
      this.notifyStatusListeners();
      throw new Error(error);
    }

    try {
      this.lastError = undefined;
      await this.reader.startInventory();
      this.isScanning = true;
      this.notifyStatusListeners();
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Failed to start inventory';
      this.notifyStatusListeners();
      throw error;
    }
  }

  /**
   * Stop inventory/scanning
   */
  async stopInventory(): Promise<void> {
    if (!this.reader) return;

    try {
      await this.reader.stopInventory();
      this.isScanning = false;
      this.lastError = undefined;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Failed to stop inventory';
      this.isScanning = false; // Still mark as stopped even if error
      console.error('Error stopping inventory:', error);
    } finally {
      this.notifyStatusListeners();
    }
  }

  /**
   * Check if reader is connected
   */
  isConnected(): boolean {
    return this.reader?.isConnected() || false;
  }

  /**
   * Check if inventory/scanning is currently active
   */
  isScanning(): boolean {
    return this.isScanning;
  }

  /**
   * Get the current reader instance (for advanced usage)
   * @returns The current reader instance or null if none exists
   */
  getCurrentReader(): IRfidReader | null {
    return this.reader;
  }

  /**
   * Get the number of active status listeners
   */
  getStatusListenerCount(): number {
    return this.statusListeners.length;
  }

  /**
   * Get the number of active tag listeners
   */
  getTagListenerCount(): number {
    return this.tagListeners.length;
  }

  /**
   * Add a status change listener
   * @param listener Callback function that will be called when reader status changes
   */
  addStatusListener(listener: (status: ReaderStatus) => void): void {
    if (!this.statusListeners.includes(listener)) {
      this.statusListeners.push(listener);
    }
  }

  /**
   * Remove a status change listener
   * @param listener The listener function to remove
   * @returns true if the listener was found and removed, false otherwise
   */
  removeStatusListener(listener: (status: ReaderStatus) => void): boolean {
    const index = this.statusListeners.indexOf(listener);
    if (index > -1) {
      this.statusListeners.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Add a tag read listener
   * @param listener Callback function that will be called when a tag is read
   */
  addTagListener(listener: (tag: RfidTag) => void): void {
    if (!this.tagListeners.includes(listener)) {
      this.tagListeners.push(listener);
      
      // If this is the first listener and we have a reader, set up the callback
      if (this.tagListeners.length === 1 && this.reader) {
        this.reader.onTagRead(this.handleTagRead);
      }
    }
  }

  /**
   * Remove a tag read listener
   * @param listener The listener function to remove
   * @returns true if the listener was found and removed, false otherwise
   */
  removeTagListener(listener: (tag: RfidTag) => void): boolean {
    const index = this.tagListeners.indexOf(listener);
    if (index > -1) {
      this.tagListeners.splice(index, 1);

      // If no listeners remain, remove the reader callback
      if (this.tagListeners.length === 0 && this.reader) {
        try {
          this.reader.removeTagListener();
        } catch (error) {
          console.warn('Error removing tag listener from reader:', error);
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Initialize the service (call this on app start)
   */
  async initialize(): Promise<void> {
    try {
      await this.loadSettings();
      this.createReader();
      
      if (this.settings.autoConnect) {
        try {
          await this.connect();
        } catch (error) {
          console.error('Auto-connect failed:', error);
          // Don't throw here - initialization should continue even if auto-connect fails
        }
      }
    } catch (error) {
      console.error('Failed to initialize RFID service:', error);
      this.lastError = error instanceof Error ? error.message : 'Initialization failed';
      // Create a fallback mock reader if initialization completely fails
      this.reader = new MockReader();
      this.notifyStatusListeners();
    }
  }

  /**
   * Clean up resources and disconnect from reader
   * Call this when the app is closing or the service is no longer needed
   */
  async cleanup(): Promise<void> {
    try {
      // Stop inventory if running
      if (this.isScanning) {
        await this.stopInventory();
      }
      
      // Disconnect if connected
      if (this.reader?.isConnected()) {
        await this.disconnect();
      }
      
      // Remove all listeners
      if (this.reader) {
        this.reader.removeTagListener();
      }
      
      // Clear listener arrays
      this.statusListeners = [];
      this.tagListeners = [];
      
      // Reset state
      this.reader = null;
      this.isScanning = false;
      this.lastError = undefined;
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Create reader instance based on current settings
   */
  private createReader(): void {
    // Clean up existing reader
    if (this.reader) {
      try {
        this.reader.removeTagListener();
      } catch (error) {
        console.warn('Error removing tag listener from old reader:', error);
      }
    }

    // Reset state when creating new reader
    this.isScanning = false;
    this.lastError = undefined;

    // Create new reader based on type
    try {
      switch (this.settings.readerType) {
        case 'mock':
          this.reader = new MockReader();
          break;
        case 'ble':
          this.reader = new BleReader();
          break;
        case 'vendor':
          this.reader = new VendorReader();
          break;
        default:
          console.error('Unknown reader type:', this.settings.readerType);
          this.reader = new MockReader(); // Fallback to mock
          this.lastError = `Unknown reader type: ${this.settings.readerType}. Using mock reader.`;
      }

      // Set up tag callback if we have listeners
      if (this.tagListeners.length > 0 && this.reader) {
        this.reader.onTagRead(this.handleTagRead);
      }
    } catch (error) {
      console.error('Error creating reader:', error);
      this.lastError = error instanceof Error ? error.message : 'Failed to create reader';
      this.reader = new MockReader(); // Fallback to mock reader
      if (this.tagListeners.length > 0) {
        this.reader.onTagRead(this.handleTagRead);
      }
    }
  }

  /**
   * Handle tag reads from the reader and notify all listeners
   */
  private handleTagRead = (tag: RfidTag): void => {
    // Apply RSSI filtering if configured
    if (this.settings.rssiThreshold && tag.rssi && tag.rssi < this.settings.rssiThreshold) {
      return;
    }

    // Notify all tag listeners
    this.tagListeners.forEach(listener => {
      try {
        listener(tag);
      } catch (error) {
        console.error('Error in tag listener:', error);
      }
    });
  };

  /**
   * Notify all status listeners
   */
  private notifyStatusListeners(): void {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('Error in status listener:', error);
      }
    });
  }

  /**
   * Load settings from storage
   */
  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this.settings = { ...this.settings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load RFID settings:', error);
    }
  }

  /**
   * Save settings to storage
   */
  private async saveSettings(): Promise<void> {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('Failed to save RFID settings:', error);
    }
  }
}