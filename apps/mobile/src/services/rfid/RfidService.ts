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
    
    // Disconnect if reader type is changing
    if (newSettings.readerType && newSettings.readerType !== this.settings.readerType && wasConnected) {
      await this.disconnect();
    }

    this.settings = { ...this.settings, ...newSettings };
    await this.saveSettings();
    
    // Create new reader instance if type changed
    if (newSettings.readerType && newSettings.readerType !== this.reader?.getReaderType()) {
      this.createReader();
    }
    
    // Auto-reconnect if it was connected before
    if (wasConnected && this.settings.autoConnect) {
      try {
        await this.connect();
      } catch (error) {
        console.error('Failed to auto-reconnect after settings change:', error);
      }
    }

    this.notifyStatusListeners();
  }

  /**
   * Get current reader status
   */
  getStatus(): ReaderStatus {
    return {
      isConnected: this.reader?.isConnected() || false,
      isScanning: false, // We'll track this separately if needed
      readerType: this.settings.readerType,
      error: undefined, // We'll track errors if needed
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
      throw new Error('No reader available');
    }

    try {
      await this.reader.connect();
      this.notifyStatusListeners();
      
      if (this.settings.autoStartInventory) {
        await this.startInventory();
      }
    } catch (error) {
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
      await this.reader.disconnect();
    } finally {
      this.notifyStatusListeners();
    }
  }

  /**
   * Start inventory/scanning
   */
  async startInventory(): Promise<void> {
    if (!this.reader || !this.reader.isConnected()) {
      throw new Error('Reader not connected');
    }

    await this.reader.startInventory();
    this.notifyStatusListeners();
  }

  /**
   * Stop inventory/scanning
   */
  async stopInventory(): Promise<void> {
    if (!this.reader) return;

    await this.reader.stopInventory();
    this.notifyStatusListeners();
  }

  /**
   * Check if reader is connected
   */
  isConnected(): boolean {
    return this.reader?.isConnected() || false;
  }

  /**
   * Add a status change listener
   */
  addStatusListener(listener: (status: ReaderStatus) => void): void {
    this.statusListeners.push(listener);
  }

  /**
   * Remove a status change listener
   */
  removeStatusListener(listener: (status: ReaderStatus) => void): void {
    const index = this.statusListeners.indexOf(listener);
    if (index > -1) {
      this.statusListeners.splice(index, 1);
    }
  }

  /**
   * Add a tag read listener
   */
  addTagListener(listener: (tag: RfidTag) => void): void {
    this.tagListeners.push(listener);
    
    // If this is the first listener and we have a reader, set up the callback
    if (this.tagListeners.length === 1 && this.reader) {
      this.reader.onTagRead(this.handleTagRead);
    }
  }

  /**
   * Remove a tag read listener
   */
  removeTagListener(listener: (tag: RfidTag) => void): void {
    const index = this.tagListeners.indexOf(listener);
    if (index > -1) {
      this.tagListeners.splice(index, 1);
    }

    // If no listeners remain, remove the reader callback
    if (this.tagListeners.length === 0 && this.reader) {
      this.reader.removeTagListener();
    }
  }

  /**
   * Initialize the service (call this on app start)
   */
  async initialize(): Promise<void> {
    await this.loadSettings();
    this.createReader();
    
    if (this.settings.autoConnect) {
      try {
        await this.connect();
      } catch (error) {
        console.error('Auto-connect failed:', error);
      }
    }
  }

  /**
   * Create reader instance based on current settings
   */
  private createReader(): void {
    // Clean up existing reader
    if (this.reader) {
      this.reader.removeTagListener();
    }

    // Create new reader based on type
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
    }

    // Set up tag callback if we have listeners
    if (this.tagListeners.length > 0) {
      this.reader.onTagRead(this.handleTagRead);
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