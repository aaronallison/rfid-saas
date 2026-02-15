export interface IRfidReader {
  /**
   * Connect to the RFID reader
   * @returns Promise that resolves when connected
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the RFID reader
   * @returns Promise that resolves when disconnected
   */
  disconnect(): Promise<void>;

  /**
   * Start inventory/scanning for RFID tags
   * @returns Promise that resolves when inventory starts
   */
  startInventory(): Promise<void>;

  /**
   * Stop inventory/scanning for RFID tags
   * @returns Promise that resolves when inventory stops
   */
  stopInventory(): Promise<void>;

  /**
   * Register a callback for when tags are read
   * @param callback Function to call when a tag is read
   */
  onTagRead(callback: (tag: RfidTag) => void): void;

  /**
   * Remove tag read listener
   */
  removeTagListener(): void;

  /**
   * Check if the reader is currently connected
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean;

  /**
   * Get the reader type/name
   * @returns string identifier for the reader type
   */
  getReaderType(): string;
}

export interface RfidTag {
  /** Electronic Product Code (EPC) - the tag identifier */
  epc: string;
  
  /** Received Signal Strength Indicator in dBm */
  rssi?: number;
  
  /** Timestamp when the tag was read */
  timestamp: Date;
  
  /** Phase information if available */
  phase?: number;
  
  /** Frequency at which the tag was read */
  frequency?: number;
  
  /** Number of times this tag was seen in the current inventory */
  readCount?: number;
}

export type ReaderType = 'mock' | 'ble' | 'vendor';

export interface ReaderSettings {
  /** Selected reader type */
  readerType: ReaderType;
  
  /** Auto-connect on app start */
  autoConnect: boolean;
  
  /** Auto-start inventory when connected */
  autoStartInventory: boolean;
  
  /** Minimum RSSI threshold for tags */
  rssiThreshold?: number;
  
  /** Reader-specific configuration */
  config?: Record<string, any>;
}

export interface ReaderStatus {
  /** Connection state */
  isConnected: boolean;
  
  /** Inventory state */
  isScanning: boolean;
  
  /** Reader type */
  readerType: ReaderType;
  
  /** Connection error if any */
  error?: string;
  
  /** Battery level if available */
  batteryLevel?: number;
  
  /** Temperature if available */
  temperature?: number;
}