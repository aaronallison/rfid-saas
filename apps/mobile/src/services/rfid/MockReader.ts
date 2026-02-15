import { BaseRfidReader } from './BaseRfidReader';
import { RfidTag, RfidReaderStatus } from '@/types/rfid';

export class MockReader extends BaseRfidReader {
  private inventoryInterval?: NodeJS.Timeout;
  private mockTags: string[] = [
    'E20000166016003519911234',
    'E20000166016003519915678',
    'E20000166016003519919ABC',
    'E20000166016003519921234',
    'E20000166016003519925678'
  ];

  async connect(): Promise<void> {
    this.setStatus(RfidReaderStatus.CONNECTING);
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.setStatus(RfidReaderStatus.CONNECTED);
  }

  async disconnect(): Promise<void> {
    await this.stopInventory();
    this.setStatus(RfidReaderStatus.DISCONNECTED);
  }

  async startInventory(): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('Reader not connected');
    }

    this.setStatus(RfidReaderStatus.READING);
    
    // Simulate reading tags at random intervals
    this.inventoryInterval = setInterval(() => {
      const randomTag = this.mockTags[Math.floor(Math.random() * this.mockTags.length)];
      const tag: RfidTag = {
        epc: randomTag,
        rssi: Math.floor(Math.random() * 50) - 80, // Random RSSI between -80 and -30
        timestamp: new Date(),
        count: 1
      };
      
      this.emitTagRead(tag);
    }, 500 + Math.random() * 2000); // Random interval between 0.5-2.5 seconds
  }

  async stopInventory(): Promise<void> {
    if (this.inventoryInterval) {
      clearInterval(this.inventoryInterval);
      this.inventoryInterval = undefined;
    }
    
    if (this.status === RfidReaderStatus.READING) {
      this.setStatus(RfidReaderStatus.CONNECTED);
    }
  }
}