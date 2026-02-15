import { IRfidReader, RfidTag } from '../../types/rfid';

export class MockReader implements IRfidReader {
  private connected: boolean = false;
  private scanning: boolean = false;
  private inventoryInterval?: NodeJS.Timeout;
  private tagCallback?: (tag: RfidTag) => void;
  
  // Configuration options for more realistic simulation
  private readonly config = {
    connectionSuccessRate: 0.95, // 95% success rate
    connectionDelayMs: { min: 500, max: 2500 },
    tagReadIntervalMs: { min: 300, max: 1500 },
    rssiRange: { min: -80, max: -20 },
    disconnectChance: 0.001, // 0.1% chance per read
  };
  
  // Mock tag EPCs for testing - using realistic EPC patterns
  private readonly mockTags = [
    '300833B2DDD906C000000001', // TID-based EPC
    '300833B2DDD906C000000002',
    '300833B2DDD906C000000003', 
    '300833B2DDD906C000000004',
    '300833B2DDD906C000000005',
    'E2003412006181A000000010', // GS1 EPC pattern
    'E2003412006181A000000011',
    'E2003412006181A000000012',
    'E200341200618200ABCD1234', // Another GS1 pattern
    'E280116060000020A0B0C0D', // ISO/IEC 18000-63 Type C
  ];
  
  private tagReadCounts = new Map<string, number>();
  private sessionStartTime?: number;

  async connect(): Promise<void> {
    if (this.connected) {
      console.log('MockReader: Already connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const { min, max } = this.config.connectionDelayMs;
      const delay = min + Math.random() * (max - min);
      
      setTimeout(() => {
        if (Math.random() < this.config.connectionSuccessRate) {
          this.connected = true;
          this.sessionStartTime = Date.now();
          console.log('MockReader: Connected successfully');
          resolve();
        } else {
          const errorMessages = [
            'Failed to establish connection to mock reader',
            'Reader not found or busy',
            'Connection timeout',
            'Authentication failed',
          ];
          const errorMsg = errorMessages[Math.floor(Math.random() * errorMessages.length)];
          console.error(`MockReader: Connection failed - ${errorMsg}`);
          reject(new Error(errorMsg));
        }
      }, delay);
    });
  }

  async disconnect(): Promise<void> {
    if (!this.connected) {
      console.log('MockReader: Already disconnected');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.stopInventory();
      this.connected = false;
      this.sessionStartTime = undefined;
      this.tagReadCounts.clear();
      
      console.log('MockReader: Disconnected successfully');
      setTimeout(resolve, 200); // Small delay to simulate disconnect
    });
  }

  async startInventory(): Promise<void> {
    if (!this.connected) {
      throw new Error('Reader not connected. Please connect first.');
    }

    if (this.scanning) {
      console.log('MockReader: Inventory already running');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.scanning = true;
        this.tagReadCounts.clear();
        this.sessionStartTime = Date.now();
        console.log('MockReader: Starting inventory');

        // Generate tag reads at random intervals
        const scheduleNextRead = () => {
          if (!this.scanning) return;
          
          const { min, max } = this.config.tagReadIntervalMs;
          const delay = min + Math.random() * (max - min);
          
          this.inventoryInterval = setTimeout(() => {
            if (this.tagCallback && this.scanning && this.connected) {
              this.generateRandomTagRead();
              scheduleNextRead(); // Schedule the next read
            }
          }, delay);
        };

        scheduleNextRead();
        resolve();
      } catch (error) {
        this.scanning = false;
        reject(error);
      }
    });
  }

  async stopInventory(): Promise<void> {
    if (!this.scanning) {
      console.log('MockReader: Inventory already stopped');
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.scanning = false;
      
      if (this.inventoryInterval) {
        clearTimeout(this.inventoryInterval);
        this.inventoryInterval = undefined;
      }
      
      const tagCount = this.tagReadCounts.size;
      const totalReads = Array.from(this.tagReadCounts.values()).reduce((sum, count) => sum + count, 0);
      
      console.log(`MockReader: Inventory stopped. Found ${tagCount} unique tags with ${totalReads} total reads`);
      setTimeout(resolve, 100);
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

  getReaderType(): string {
    return 'Mock Reader v2.0 (Development)';
  }

  /**
   * Clean up resources - useful for testing or when destroying the instance
   */
  async cleanup(): Promise<void> {
    await this.disconnect();
    this.tagCallback = undefined;
    this.tagReadCounts.clear();
  }

  /**
   * Get mock reader statistics (useful for debugging)
   */
  getStatistics() {
    const uniqueTagCount = this.tagReadCounts.size;
    const totalReads = Array.from(this.tagReadCounts.values()).reduce((sum, count) => sum + count, 0);
    const sessionDuration = this.sessionStartTime ? Date.now() - this.sessionStartTime : 0;
    
    return {
      isConnected: this.connected,
      isScanning: this.scanning,
      uniqueTagCount,
      totalReads,
      sessionDurationMs: sessionDuration,
      availableTags: this.mockTags.length,
      readRate: sessionDuration > 0 ? (totalReads / sessionDuration) * 1000 : 0, // reads per second
    };
  }

  private generateRandomTagRead(): void {
    // Simulate occasional connection issues
    if (Math.random() < this.config.disconnectChance) {
      console.warn('MockReader: Simulated connection issue detected');
      this.connected = false;
      this.scanning = false;
      return;
    }

    // Select a random tag with weighted probability (some tags are more likely to be read)
    const tagWeights = this.mockTags.map((_, index) => {
      // Create some tags that are more likely to be read (simulate proximity/orientation)
      return index < 5 ? 2 : 1;
    });
    
    const totalWeight = tagWeights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;
    
    for (let i = 0; i < tagWeights.length; i++) {
      random -= tagWeights[i];
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }
    
    const selectedTag = this.mockTags[selectedIndex];
    
    // Update read count
    const currentCount = this.tagReadCounts.get(selectedTag) || 0;
    this.tagReadCounts.set(selectedTag, currentCount + 1);
    
    // Generate realistic RSSI with some consistency per tag
    const baseRssi = this.getBaseRssiForTag(selectedTag);
    const rssiVariation = (Math.random() - 0.5) * 10; // ±5 dBm variation
    const rssi = Math.max(this.config.rssiRange.min, 
                         Math.min(this.config.rssiRange.max, baseRssi + rssiVariation));
    
    // Generate phase (0-360 degrees converted to radians) with some drift
    const basePhase = this.getBasePhaseForTag(selectedTag);
    const phaseDrift = (Math.random() - 0.5) * 0.2; // Small phase drift
    const phase = (basePhase + phaseDrift) % (2 * Math.PI);
    
    // Mock frequency (902-928 MHz UHF band) - simulate frequency hopping
    const channelFrequencies = [902750, 903250, 903750, 904250, 904750, 905250, 905750, 906250];
    const frequency = channelFrequencies[Math.floor(Math.random() * channelFrequencies.length)];
    
    const readCount = this.tagReadCounts.get(selectedTag) || 1;
    
    const tag: RfidTag = {
      epc: selectedTag,
      rssi: Math.round(rssi * 10) / 10, // Round to 1 decimal place
      timestamp: new Date(),
      phase: Math.round(phase * 1000) / 1000, // Round to 3 decimal places for more precision
      frequency,
      readCount,
    };

    if (this.tagCallback) {
      try {
        this.tagCallback(tag);
      } catch (error) {
        console.error('MockReader: Error in tag callback:', error);
      }
    }
  }

  /**
   * Get a consistent base RSSI for a tag (simulate consistent distance/position)
   */
  private getBaseRssiForTag(epc: string): number {
    // Use simple hash of EPC to generate consistent base RSSI
    let hash = 0;
    for (let i = 0; i < epc.length; i++) {
      hash = ((hash << 5) - hash + epc.charCodeAt(i)) & 0xffffffff;
    }
    const normalizedHash = Math.abs(hash) / 0xffffffff;
    const { min, max } = this.config.rssiRange;
    return min + normalizedHash * (max - min);
  }

  /**
   * Get a consistent base phase for a tag
   */
  private getBasePhaseForTag(epc: string): number {
    let hash = 0;
    for (let i = 0; i < epc.length; i++) {
      hash = ((hash << 3) - hash + epc.charCodeAt(i)) & 0xffffffff;
    }
    const normalizedHash = Math.abs(hash) / 0xffffffff;
    return normalizedHash * 2 * Math.PI;
  }
}