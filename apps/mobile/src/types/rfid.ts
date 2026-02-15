export interface IRfidReader {
  /**
   * Connect to the RFID reader
   * @returns Promise that resolves when connected
   * @throws Error if connection fails
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the RFID reader
   * @returns Promise that resolves when disconnected
   * @throws Error if disconnection fails
   */
  disconnect(): Promise<void>;

  /**
   * Start inventory/scanning for RFID tags
   * @returns Promise that resolves when inventory starts
   * @throws Error if reader is not connected or start fails
   */
  startInventory(): Promise<void>;

  /**
   * Stop inventory/scanning for RFID tags
   * @returns Promise that resolves when inventory stops
   * @throws Error if stop operation fails
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
   * Check if the reader is currently scanning/inventorying
   * @returns true if scanning, false otherwise
   */
  isScanning(): boolean;

  /**
   * Get the reader type/name
   * @returns string identifier for the reader type
   */
  getReaderType(): string;

  /**
   * Get reader capabilities and information
   * @returns Reader information object
   */
  getReaderInfo(): ReaderInfo;
}

export interface RfidTag {
  /** Electronic Product Code (EPC) - the tag identifier */
  epc: string;
  
  /** Received Signal Strength Indicator in dBm */
  rssi?: number;
  
  /** Timestamp when the tag was read */
  timestamp: Date;
  
  /** Phase information if available (in radians) */
  phase?: number;
  
  /** Frequency at which the tag was read (in kHz) */
  frequency?: number;
  
  /** Number of times this tag was seen in the current inventory */
  readCount?: number;

  /** Antenna port that detected the tag (if multi-antenna reader) */
  antennaPort?: number;

  /** Tag Identifier (TID) if available */
  tid?: string;

  /** User memory data if available */
  userData?: string;

  /** PC (Protocol Control) word */
  pc?: number;

  /** CRC (Cyclic Redundancy Check) */
  crc?: number;
}

export type ReaderType = 'mock' | 'ble' | 'vendor';

export interface ReaderInfo {
  /** Reader model name */
  model: string;

  /** Reader firmware version */
  firmwareVersion?: string;

  /** Reader hardware version */
  hardwareVersion?: string;

  /** Serial number */
  serialNumber?: string;

  /** Supported frequency bands (in kHz) */
  supportedFrequencies?: number[];

  /** Maximum transmit power (in dBm) */
  maxTxPower?: number;

  /** Minimum transmit power (in dBm) */
  minTxPower?: number;

  /** Number of antenna ports */
  antennaCount?: number;

  /** Supported tag protocols */
  supportedProtocols?: string[];

  /** Reader capabilities */
  capabilities?: {
    supportsPhase?: boolean;
    supportsRssi?: boolean;
    supportsTemperature?: boolean;
    supportsBattery?: boolean;
    supportsWriteTag?: boolean;
    supportsLockTag?: boolean;
    supportsKillTag?: boolean;
  };
}

export interface ReaderSettings {
  /** Selected reader type */
  readerType: ReaderType;
  
  /** Auto-connect on app start */
  autoConnect: boolean;
  
  /** Auto-start inventory when connected */
  autoStartInventory: boolean;
  
  /** Minimum RSSI threshold for tags (in dBm) */
  rssiThreshold?: number;

  /** Transmit power setting (in dBm) */
  txPower?: number;

  /** Inventory session (0-3, EPC Gen2 standard) */
  session?: 0 | 1 | 2 | 3;

  /** Selected target flag (A or B) */
  target?: 'A' | 'B';

  /** Q value for inventory algorithm */
  qValue?: number;

  /** Connection timeout in milliseconds */
  connectionTimeout?: number;

  /** Inventory duration in milliseconds (0 = continuous) */
  inventoryDuration?: number;
  
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
  
  /** Battery level if available (0-100) */
  batteryLevel?: number;
  
  /** Temperature if available (in Celsius) */
  temperature?: number;

  /** Signal strength for wireless readers (in dBm) */
  signalStrength?: number;

  /** Current transmit power (in dBm) */
  currentTxPower?: number;

  /** Last activity timestamp */
  lastActivity?: Date;

  /** Connection quality indicator */
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';

  /** Number of tags read in current session */
  tagCount?: number;

  /** Tags per second rate */
  readRate?: number;
}

/**
 * Enumeration of possible connection states
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  ERROR = 'error'
}

/**
 * Enumeration of possible inventory states
 */
export enum InventoryState {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  ERROR = 'error'
}

/**
 * Extended reader status with state enums
 */
export interface ExtendedReaderStatus extends ReaderStatus {
  connectionState: ConnectionState;
  inventoryState: InventoryState;
}

/**
 * Event types for reader notifications
 */
export type ReaderEventType = 
  | 'connected'
  | 'disconnected'
  | 'inventoryStarted' 
  | 'inventoryStopped'
  | 'tagRead'
  | 'error'
  | 'batteryLow'
  | 'temperatureAlert';

/**
 * Generic reader event interface
 */
export interface ReaderEvent {
  type: ReaderEventType;
  timestamp: Date;
  data?: any;
  error?: Error;
}