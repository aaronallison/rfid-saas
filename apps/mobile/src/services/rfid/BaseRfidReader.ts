import { IRfidReader, RfidTag } from '../../types/rfid';

/**
 * Abstract base class for RFID readers
 * Provides common functionality and enforces the IRfidReader interface
 */
export abstract class BaseRfidReader implements IRfidReader {
  protected connected: boolean = false;
  protected scanning: boolean = false;
  protected tagCallback?: (tag: RfidTag) => void;
  protected connectionTimeout: number = 10000; // 10 seconds default
  protected inventoryInterval?: NodeJS.Timeout;
  
  // Statistics tracking
  protected totalTagsRead: number = 0;
  protected lastReadTime?: Date;
  protected connectionTime?: Date;

  /**
   * Connect to the RFID reader
   * Subclasses must implement the actual connection logic
   */
  abstract connect(): Promise<void>;

  /**
   * Disconnect from the RFID reader
   * Provides common cleanup, subclasses can override for specific cleanup
   */
  async disconnect(): Promise<void> {
    await this.stopInventory();
    this.connected = false;
    this.connectionTime = undefined;
    this.resetStatistics();
  }

  /**
   * Start inventory/scanning for RFID tags
   * Subclasses must implement the actual inventory start logic
   */
  abstract startInventory(): Promise<void>;

  /**
   * Stop inventory/scanning for RFID tags
   * Provides common cleanup, subclasses can override for specific cleanup
   */
  async stopInventory(): Promise<void> {
    if (this.inventoryInterval) {
      clearInterval(this.inventoryInterval);
      this.inventoryInterval = undefined;
    }
    this.scanning = false;
  }

  /**
   * Register a callback for when tags are read
   */
  onTagRead(callback: (tag: RfidTag) => void): void {
    this.tagCallback = callback;
  }

  /**
   * Remove tag read listener
   */
  removeTagListener(): void {
    this.tagCallback = undefined;
  }

  /**
   * Check if the reader is currently connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if the reader is currently scanning
   */
  isScanning(): boolean {
    return this.scanning;
  }

  /**
   * Get the reader type/name
   * Subclasses must implement this to return their specific type
   */
  abstract getReaderType(): string;

  /**
   * Get connection statistics
   */
  getStatistics(): {
    totalTagsRead: number;
    lastReadTime?: Date;
    connectionTime?: Date;
    isConnected: boolean;
    isScanning: boolean;
  } {
    return {
      totalTagsRead: this.totalTagsRead,
      lastReadTime: this.lastReadTime,
      connectionTime: this.connectionTime,
      isConnected: this.connected,
      isScanning: this.scanning,
    };
  }

  /**
   * Set connection timeout in milliseconds
   */
  setConnectionTimeout(timeout: number): void {
    this.connectionTimeout = timeout;
  }

  /**
   * Get connection timeout in milliseconds
   */
  getConnectionTimeout(): number {
    return this.connectionTimeout;
  }

  /**
   * Protected method to handle tag reads with common processing
   * Subclasses should call this when they receive a tag read
   */
  protected handleTagRead(tag: RfidTag): void {
    // Validate tag data
    if (!this.isValidTag(tag)) {
      console.warn('Invalid tag data received:', tag);
      return;
    }

    // Update statistics
    this.totalTagsRead++;
    this.lastReadTime = new Date();

    // Ensure timestamp is set
    if (!tag.timestamp) {
      tag.timestamp = new Date();
    }

    // Call the registered callback
    if (this.tagCallback) {
      try {
        this.tagCallback(tag);
      } catch (error) {
        console.error('Error in tag callback:', error);
      }
    }
  }

  /**
   * Protected method to validate tag data
   */
  protected isValidTag(tag: RfidTag): boolean {
    // Check if EPC is valid (not empty and reasonable length)
    if (!tag.epc || tag.epc.length < 4) {
      return false;
    }

    // Check if EPC contains only valid hex characters
    if (!/^[0-9A-Fa-f]+$/.test(tag.epc)) {
      return false;
    }

    // Check RSSI range if provided (typical range is -100 to 0 dBm)
    if (tag.rssi !== undefined && (tag.rssi < -100 || tag.rssi > 0)) {
      console.warn('RSSI value outside typical range:', tag.rssi);
    }

    return true;
  }

  /**
   * Protected method to set connected state and track connection time
   */
  protected setConnected(connected: boolean): void {
    const wasConnected = this.connected;
    this.connected = connected;
    
    if (connected && !wasConnected) {
      this.connectionTime = new Date();
    } else if (!connected && wasConnected) {
      this.connectionTime = undefined;
      this.resetStatistics();
    }
  }

  /**
   * Protected method to reset statistics
   */
  protected resetStatistics(): void {
    this.totalTagsRead = 0;
    this.lastReadTime = undefined;
  }

  /**
   * Protected helper method to create a promise with timeout
   */
  protected withTimeout<T>(promise: Promise<T>, timeout: number = this.connectionTimeout): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }

  /**
   * Protected helper method to normalize EPC to uppercase hex
   */
  protected normalizeEpc(epc: string): string {
    return epc.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
  }

  /**
   * Protected method to handle connection errors with retry logic
   */
  protected async connectWithRetry(
    connectFn: () => Promise<void>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.withTimeout(connectFn());
        this.setConnected(true);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`Connection attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          retryDelay *= 1.5; // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Connection failed after retries');
  }

  /**
   * Cleanup method to be called when the reader is no longer needed
   */
  async cleanup(): Promise<void> {
    await this.disconnect();
    this.removeTagListener();
  }
}