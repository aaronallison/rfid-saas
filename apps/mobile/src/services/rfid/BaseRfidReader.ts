import { IRfidReader, RfidTag, RfidReaderStatus } from '@/types/rfid';

export abstract class BaseRfidReader implements IRfidReader {
  protected status: RfidReaderStatus = RfidReaderStatus.DISCONNECTED;
  protected tagReadCallbacks: Set<(tag: RfidTag) => void> = new Set();
  protected statusChangeCallbacks: Set<(status: RfidReaderStatus) => void> = new Set();

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract startInventory(): Promise<void>;
  abstract stopInventory(): Promise<void>;

  isConnected(): boolean {
    return this.status === RfidReaderStatus.CONNECTED || this.status === RfidReaderStatus.READING;
  }

  getStatus(): RfidReaderStatus {
    return this.status;
  }

  onTagRead(callback: (tag: RfidTag) => void): void {
    this.tagReadCallbacks.add(callback);
  }

  removeTagReadListener(callback: (tag: RfidTag) => void): void {
    this.tagReadCallbacks.delete(callback);
  }

  onStatusChange(callback: (status: RfidReaderStatus) => void): void {
    this.statusChangeCallbacks.add(callback);
  }

  removeStatusChangeListener(callback: (status: RfidReaderStatus) => void): void {
    this.statusChangeCallbacks.delete(callback);
  }

  protected emitTagRead(tag: RfidTag): void {
    this.tagReadCallbacks.forEach(callback => {
      try {
        callback(tag);
      } catch (error) {
        console.error('Error in tag read callback:', error);
      }
    });
  }

  protected setStatus(status: RfidReaderStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.statusChangeCallbacks.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error('Error in status change callback:', error);
        }
      });
    }
  }
}