// Main service export
export { RfidService } from './RfidService';

// Reader implementations
export { MockReader } from './MockReader';
export { BleReader } from './BleReader';
export { VendorReader } from './VendorReader';

// Type exports from the types module
export type { 
  IRfidReader, 
  RfidTag, 
  ReaderType, 
  ReaderSettings, 
  ReaderStatus 
} from '../../types/rfid';

// Re-export commonly used constants if needed
export const READER_TYPES: ReaderType[] = ['mock', 'ble', 'vendor'];

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  readerType: 'mock',
  autoConnect: false,
  autoStartInventory: false,
};

/**
 * Get a singleton instance of the RFID service
 * This is a convenience function for easy access
 */
export const getRfidService = () => RfidService.getInstance();