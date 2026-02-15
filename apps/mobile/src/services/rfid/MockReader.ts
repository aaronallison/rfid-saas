import { RfidTag } from '../../types/rfid';
import { BaseRfidReader } from './BaseRfidReader';

export class MockReader extends BaseRfidReader {
  
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
    await this.connectWithRetry(async () => {
      // Simulate connection delay
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.1) { // 90% success rate
            console.log('MockReader: Connected');
            resolve();
          } else {
            reject(new Error('Mock connection failed'));
          }
        }, 1000 + Math.random() * 2000); // 1-3 second delay
      });
    });
  }

  async disconnect(): Promise<void> {
    await super.disconnect();
    console.log('MockReader: Disconnected');
    // Small delay to simulate disconnect
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  async startInventory(): Promise<void> {
    if (!this.connected) {
      throw new Error('Reader not connected');
    }

    if (this.scanning) {
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
  }

  async stopInventory(): Promise<void> {
    await super.stopInventory();
    console.log('MockReader: Stopped inventory');
    // Small delay to simulate stop
    await new Promise(resolve => setTimeout(resolve, 200));
  }



  getReaderType(): string {
    return 'Mock Reader (Development)';
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
      epc: this.normalizeEpc(randomTag),
      rssi: Math.round(rssi * 10) / 10, // Round to 1 decimal place
      timestamp: new Date(),
      phase: Math.round(phase * 100) / 100, // Round to 2 decimal places
      frequency: Math.round(frequency),
      readCount: this.tagReadCounts.get(randomTag)!,
    };

    // Use the base class method for handling tag reads
    this.handleTagRead(tag);
  }
}