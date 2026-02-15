export interface RfidTag {
  epc: string;
  rssi?: number;
  timestamp: Date;
  count?: number;
}

export interface RfidReaderConfig {
  type: 'mock' | 'ble' | 'vendor';
  connectionParams?: {
    deviceId?: string;
    address?: string;
    [key: string]: any;
  };
}

export enum RfidReaderStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  READING = 'reading',
  ERROR = 'error'
}

export interface IRfidReader {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startInventory(): Promise<void>;
  stopInventory(): Promise<void>;
  isConnected(): boolean;
  getStatus(): RfidReaderStatus;
  onTagRead(callback: (tag: RfidTag) => void): void;
  removeTagReadListener(callback: (tag: RfidTag) => void): void;
  onStatusChange(callback: (status: RfidReaderStatus) => void): void;
  removeStatusChangeListener(callback: (status: RfidReaderStatus) => void): void;
}

export interface Capture {
  id: string;
  rfid_tag?: string;
  latitude?: number;
  longitude?: number;
  timestamp: Date;
  data?: any;
  synced: boolean;
}