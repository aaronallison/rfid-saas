import AsyncStorage from '@react-native-async-storage/async-storage';
import { IRfidReader, RfidReaderConfig, RfidTag, RfidReaderStatus } from '@/types/rfid';
import { MockReader } from './MockReader';
import { BleReader } from './BleReader';
import { VendorReader } from './VendorReader';

const STORAGE_KEY_RFID_CONFIG = '@rfid_config';

export class RfidService {
  private static instance: RfidService;
  private currentReader: IRfidReader | null = null;
  private config: RfidReaderConfig | null = null;

  private constructor() {}

  static getInstance(): RfidService {
    if (!RfidService.instance) {
      RfidService.instance = new RfidService();
    }
    return RfidService.instance;
  }

  async loadConfig(): Promise<RfidReaderConfig | null> {
    try {
      const configJson = await AsyncStorage.getItem(STORAGE_KEY_RFID_CONFIG);
      if (configJson) {
        this.config = JSON.parse(configJson);
      }
      return this.config;
    } catch (error) {
      console.error('Failed to load RFID config:', error);
      return null;
    }
  }

  async saveConfig(config: RfidReaderConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_RFID_CONFIG, JSON.stringify(config));
      this.config = config;
    } catch (error) {
      console.error('Failed to save RFID config:', error);
      throw error;
    }
  }

  getConfig(): RfidReaderConfig | null {
    return this.config;
  }

  createReader(config: RfidReaderConfig): IRfidReader {
    switch (config.type) {
      case 'mock':
        return new MockReader();
      case 'ble':
        return new BleReader(config.connectionParams?.deviceId);
      case 'vendor':
        return new VendorReader(config.connectionParams);
      default:
        throw new Error(`Unsupported reader type: ${config.type}`);
    }
  }

  async setReader(config: RfidReaderConfig): Promise<void> {
    // Disconnect current reader if exists
    if (this.currentReader && this.currentReader.isConnected()) {
      await this.currentReader.disconnect();
    }

    // Create new reader
    this.currentReader = this.createReader(config);
    await this.saveConfig(config);
  }

  getCurrentReader(): IRfidReader | null {
    return this.currentReader;
  }

  async initializeWithSavedConfig(): Promise<void> {
    const config = await this.loadConfig();
    if (config) {
      this.currentReader = this.createReader(config);
    }
  }

  async connect(): Promise<void> {
    if (!this.currentReader) {
      throw new Error('No reader configured');
    }
    await this.currentReader.connect();
  }

  async disconnect(): Promise<void> {
    if (this.currentReader) {
      await this.currentReader.disconnect();
    }
  }

  async startInventory(): Promise<void> {
    if (!this.currentReader) {
      throw new Error('No reader configured');
    }
    await this.currentReader.startInventory();
  }

  async stopInventory(): Promise<void> {
    if (this.currentReader) {
      await this.currentReader.stopInventory();
    }
  }

  isConnected(): boolean {
    return this.currentReader ? this.currentReader.isConnected() : false;
  }

  getStatus(): RfidReaderStatus {
    return this.currentReader ? this.currentReader.getStatus() : RfidReaderStatus.DISCONNECTED;
  }

  onTagRead(callback: (tag: RfidTag) => void): void {
    if (this.currentReader) {
      this.currentReader.onTagRead(callback);
    }
  }

  removeTagReadListener(callback: (tag: RfidTag) => void): void {
    if (this.currentReader) {
      this.currentReader.removeTagReadListener(callback);
    }
  }

  onStatusChange(callback: (status: RfidReaderStatus) => void): void {
    if (this.currentReader) {
      this.currentReader.onStatusChange(callback);
    }
  }

  removeStatusChangeListener(callback: (status: RfidReaderStatus) => void): void {
    if (this.currentReader) {
      this.currentReader.removeStatusChangeListener(callback);
    }
  }
}