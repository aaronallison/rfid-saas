# RFID Mobile App

A React Native mobile application for RFID tag capture with GPS location and offline capabilities.

## Features

### RFID Reader Abstraction
- **IRfidReader Interface**: Common interface for all RFID readers
- **Multiple Reader Types**:
  - **MockReader**: Simulated RFID readings for testing and development
  - **BleReader**: Bluetooth Low Energy reader integration (stub implementation)
  - **VendorReader**: Proprietary/vendor-specific reader support (stub implementation)

### Screens

#### 1. Reader Settings Screen
- Choose reader type (Mock/BLE/Vendor)
- Configure connection parameters
- Connect/disconnect controls
- Real-time connection status display

#### 2. Tag Stream Screen
- Live tag reading feed with real-time updates
- Start/stop inventory controls
- Tag statistics (unique tags, total reads, RSSI values)
- Clear feed functionality
- Auto-scroll to newest tags

#### 3. Capture Screen
- Auto-populate RFID tag from reader
- Manual tag entry option
- Auto-capture mode (automatically create capture on tag read)
- GPS location integration
- Timestamp recording
- Additional data fields (JSON or text)
- Recent captures history

### Services

#### RfidService
- Singleton service managing RFID reader instances
- Persistent configuration storage
- Reader lifecycle management
- Event handling (tag reads, status changes)

#### CaptureService
- GPS location acquisition
- Capture creation with timestamp and location
- Offline storage using AsyncStorage
- Sync status tracking

## Architecture

### RFID Reader Interface
```typescript
interface IRfidReader {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startInventory(): Promise<void>;
  stopInventory(): Promise<void>;
  isConnected(): boolean;
  getStatus(): RfidReaderStatus;
  onTagRead(callback: (tag: RfidTag) => void): void;
  onStatusChange(callback: (status: RfidReaderStatus) => void): void;
}
```

### Reader Implementations

#### MockReader
- Simulates tag reads with configurable intervals
- Generates realistic EPC codes
- Random RSSI values
- Perfect for testing and demonstrations

#### BleReader (Stub)
- Prepared for Bluetooth Low Energy integration
- Device ID configuration
- Connection management framework
- Ready for actual BLE implementation

#### VendorReader (Stub)  
- Flexible configuration system
- Supports arbitrary connection parameters
- Extensible for different vendor protocols
- USB, Serial, or network connectivity ready

## Data Types

### RfidTag
```typescript
interface RfidTag {
  epc: string;
  rssi?: number;
  timestamp: Date;
  count?: number;
}
```

### Capture
```typescript
interface Capture {
  id: string;
  rfid_tag?: string;
  latitude?: number;
  longitude?: number;
  timestamp: Date;
  data?: any;
  synced: boolean;
}
```

## Offline Capabilities

- **AsyncStorage**: All data persisted locally for offline operation
- **Configuration Persistence**: Reader settings saved between app sessions
- **Capture Storage**: All captures stored locally with sync status
- **GPS Fallback**: Graceful handling when location services unavailable

## Installation

```bash
cd apps/mobile
npm install

# iOS
npx react-native run-ios

# Android
npx react-native run-android
```

## Usage

### Setting up a Reader

1. Go to **Reader Settings**
2. Select reader type:
   - **Mock Reader**: For testing (no additional setup)
   - **BLE Reader**: Enter device ID (implementation required)
   - **Vendor Reader**: Configure connection parameters (implementation required)
3. Tap **Connect**

### Capturing Tags

1. In **Capture** screen, ensure reader is connected
2. Enable **Auto Capture** for automatic capture on tag read
3. Or use **Manual Capture** to enter tags manually
4. Start scanning to begin reading tags
5. View recent captures at the bottom of the screen

### Monitoring Tag Stream

1. Go to **Tag Stream** screen
2. Start reading to see live tag feed
3. Monitor statistics and RSSI values
4. Use Clear button to reset the feed

## Development

### Adding New Reader Types

1. Extend `BaseRfidReader` class
2. Implement required abstract methods
3. Add to `RfidService.createReader()` switch statement
4. Update configuration UI in `ReaderSettingsScreen`

### Extending Capture Data

1. Modify `Capture` interface in `types/rfid.ts`
2. Update `CaptureService.createCapture()` method
3. Extend UI in `CaptureScreen` as needed

## TypeScript Support

Full TypeScript implementation with:
- Strong typing for all RFID operations
- Interface-based architecture
- Comprehensive type safety
- IntelliSense support

## Testing

The MockReader provides realistic simulation for development and testing:
- Random tag generation
- Configurable read intervals
- RSSI simulation
- Connection state management

This allows full app testing without physical RFID hardware.

## Future Enhancements

- Sync service for cloud integration
- Advanced filtering and search
- Export capabilities
- Custom tag formats
- Reader-specific settings UI
- Background processing
- Push notifications
- Data analytics