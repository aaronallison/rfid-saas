import { IRfidReader, RfidTag } from '../../types/rfid';

export class MockReader implements IRfidReader {
  private connected: boolean = false;
  private scanning: boolean = false;
  private inventoryInterval?: NodeJS.Timeout;
  private tagCallback?: (tag: RfidTag) => void;
  
  // Mock tag EPCs for testing
  private mockTags = [
    '300833B2DDD906C000000001',
    '300833B2DDD906C000000002',
    '300833B2DDD906C000000003',
    '300833B2DDD906C000000004',
    '300833B2DDD906C000000005',
    'E2003412006181A000000010',
    'E2003412006181A000000011',
    'E2003412006181A000000012',
  ];
  
  private tagReadCounts = new Map<string, number>();

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Simulate connection delay
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90% success rate
          this.connected = true;
          console.log('MockReader: Connected');
          resolve();
        } else {
          reject(new Error('Mock connection failed'));
        }
      }, 1000 + Math.random() * 2000); // 1-3 second delay
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.stopInventory();
      this.connected = false;
      console.log('MockReader: Disconnected');
      setTimeout(resolve, 500); // Small delay to simulate disconnect
    });
  }

  async startInventory(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('Reader not connected'));
        return;
      }

      if (this.scanning) {
        resolve();
        return;
      }

      this.scanning = true;
      this.tagReadCounts.clear();
      console.log('MockReader: Starting inventory');

      // Generate tag reads at random intervals
      this.inventoryInterval = setInterval(() => {
        if (this.tagCallback && this.scanning) {
          this.generateRandomTagRead();
        }
      }, 500 + Math.random() * 2000); // Random interval between 0.5-2.5 seconds

      resolve();
    });
  }

  async stopInventory(): Promise<void> {
    return new Promise((resolve) => {
      if (this.inventoryInterval) {
        clearInterval(this.inventoryInterval);
        this.inventoryInterval = undefined;
      }
      
      this.scanning = false;
      console.log('MockReader: Stopped inventory');
      setTimeout(resolve, 200);
    });
  }

  onTagRead(callback: (tag: RfidTag) => void): void {
    this.tagCallback = callback;
  }

  removeTagListener(): void {
    this.tagCallback = undefined;
  }

  isConnected(): boolean {
    return this.connected;
  }

  isScanning(): boolean {
    return this.scanning;
  }

  getReaderType(): string {
    return 'Mock Reader (Development)';
  }

  getReaderInfo(): import('../../types/rfid').ReaderInfo {
    return {
      model: 'Mock Reader v1.0',
      firmwareVersion: '1.0.0',
      hardwareVersion: '1.0.0',
      serialNumber: 'MOCK001',
      supportedFrequencies: [902000, 904000, 906000, 908000, 910000, 912000, 914000, 916000, 918000, 920000, 922000, 924000, 926000, 928000],
      maxTxPower: 30,
      minTxPower: 0,
      antennaCount: 1,
      supportedProtocols: ['EPC Gen2'],
      capabilities: {
        supportsPhase: true,
        supportsRssi: true,
        supportsTemperature: false,
        supportsBattery: false,
        supportsWriteTag: false,
        supportsLockTag: false,
        supportsKillTag: false,
      },
    };
  }

  private generateRandomTagRead(): void {
    // Select a random tag
    const randomTag = this.mockTags[Math.floor(Math.random() * this.mockTags.length)];
    
    // Update read count
    const currentCount = this.tagReadCounts.get(randomTag) || 0;
    this.tagReadCounts.set(randomTag, currentCount + 1);
    
    // Generate realistic RSSI (signal strength) between -80 and -20 dBm
    const rssi = -80 + Math.random() * 60;
    
    // Generate phase (0-360 degrees converted to radians)
    const phase = Math.random() * 2 * Math.PI;
    
    // Mock frequency (902-928 MHz UHF band)
    const frequency = 902000 + Math.random() * 26000; // In kHz
    
    const tag: RfidTag = {
      epc: randomTag,
      rssi: Math.round(rssi * 10) / 10, // Round to 1 decimal place
      timestamp: new Date(),
      phase: Math.round(phase * 100) / 100, // Round to 2 decimal places
      frequency: Math.round(frequency),
      readCount: this.tagReadCounts.get(randomTag)!,
    };

    if (this.tagCallback) {
      this.tagCallback(tag);
    }
  }
}