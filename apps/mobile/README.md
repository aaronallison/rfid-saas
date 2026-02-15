# RFID Field Capture Mobile App

A React Native Expo application for field data collection using RFID technology with offline capabilities and cloud synchronization.

## Features

- **RFID Tag Reading**: Support for multiple RFID reader types (BLE, vendor-specific, mock for development)
- **GPS Location Capture**: Automatic GPS tagging for field data collection
- **Offline Operation**: Works without internet connectivity, data syncs when connection is available
- **Multi-tenant Support**: Organization-based data isolation
- **Flexible Data Schema**: Configurable data capture forms for different field requirements
- **Batch Management**: Organize captures into batches for better data management
- **Real-time Sync**: Background synchronization with cloud database

## Architecture

### Tech Stack
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and build tools
- **TypeScript**: Type-safe development
- **React Navigation**: Navigation system
- **Supabase**: Backend-as-a-Service for authentication and data storage
- **SQLite**: Local database for offline storage
- **Async Storage**: Secure local storage for settings

### Key Components
- **AuthContext**: Authentication state management
- **RFID Service**: Abstraction layer for different RFID readers
- **Database Service**: Local SQLite database management
- **Sync Service**: Cloud synchronization logic
- **Location Service**: GPS location capture

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (for iOS development) or Android emulator/device
- Physical device recommended for RFID functionality

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Run on specific platforms:
   ```bash
   npm run ios     # iOS simulator
   npm run android # Android emulator/device
   npm run web     # Web browser (limited functionality)
   ```

### Environment Setup

The app connects to a Supabase backend. Ensure the following environment variables are configured in your Supabase project:

- Database tables: organizations, batches, schemas, captures
- Row Level Security (RLS) policies for multi-tenant access
- Authentication providers configured

## App Structure

```
src/
├── contexts/           # React contexts for state management
│   └── AuthContext.tsx # Authentication context
├── navigation/         # Navigation configuration
│   └── AppNavigator.tsx
├── screens/           # Screen components
│   ├── LoginScreen.tsx
│   ├── OrganizationSelectScreen.tsx
│   ├── BatchesListScreen.tsx
│   ├── CreateBatchScreen.tsx
│   ├── CaptureScreen.tsx
│   ├── TagStreamScreen.tsx
│   ├── ReaderSettingsScreen.tsx
│   └── SyncScreen.tsx
├── services/          # Business logic and external integrations
│   ├── database.ts    # Local SQLite operations
│   ├── supabase.ts    # Cloud database client
│   ├── syncService.ts # Offline/online synchronization
│   ├── locationService.ts # GPS location services
│   └── rfid/          # RFID reader implementations
│       ├── RfidService.ts    # Main RFID service
│       ├── BleReader.ts      # Bluetooth RFID readers
│       ├── VendorReader.ts   # Vendor-specific readers
│       └── MockReader.ts     # Development mock reader
└── types/             # TypeScript type definitions
    ├── index.ts       # Core data types
    └── rfid.ts        # RFID-specific types
```

## Key Screens

### Authentication Flow
- **LoginScreen**: User authentication via Supabase Auth
- **OrganizationSelectScreen**: Multi-tenant organization selection

### Data Collection Flow
- **BatchesListScreen**: View and manage data collection batches
- **CreateBatchScreen**: Create new batches with schema selection
- **CaptureScreen**: Main data collection interface with RFID reading
- **TagStreamScreen**: Real-time view of RFID tag reads

### Configuration
- **ReaderSettingsScreen**: Configure RFID reader type and settings
- **SyncScreen**: Monitor and control data synchronization

## RFID Reader Support

The app supports multiple RFID reader types through a plugin architecture:

### Mock Reader (`MockReader.ts`)
- Simulated RFID tags for development and testing
- No hardware required
- Configurable tag generation patterns

### BLE Reader (`BleReader.ts`)
- Bluetooth Low Energy RFID readers
- Generic BLE RFID protocol support
- Device discovery and pairing

### Vendor Reader (`VendorReader.ts`)
- Vendor-specific RFID reader implementations
- SDK integration for proprietary protocols
- Advanced reader features and settings

### Adding New Readers

To add support for a new RFID reader:

1. Create a new class implementing the `IRfidReader` interface
2. Register it in `RfidService.ts`
3. Add configuration options in `ReaderSettingsScreen.tsx`

## Data Flow

### Offline-First Architecture

1. **Data Capture**: All captures are stored locally in SQLite
2. **Background Sync**: Automatic synchronization when network is available
3. **Conflict Resolution**: Server-side timestamps determine data precedence
4. **Status Tracking**: Visual indicators for sync status

### Database Schema

#### Local SQLite Tables
- `batches`: Data collection batches
- `schemas`: Field definitions for data capture
- `captures`: Individual RFID tag captures with GPS and custom data
- `sync_status`: Track synchronization state

#### Cloud Tables (Supabase)
- Multi-tenant with organization-based RLS
- Same schema as local with additional metadata
- Audit trails and user activity tracking

## Permissions

### iOS
- **Location**: Required for GPS tagging of captures
- **Camera**: Optional for QR code scanning (future feature)

### Android
- **ACCESS_FINE_LOCATION**: GPS location access
- **ACCESS_COARSE_LOCATION**: Network-based location
- **INTERNET**: Cloud synchronization
- **ACCESS_NETWORK_STATE**: Network status monitoring

## Development

### Running Tests
```bash
# Run type checking
npx tsc --noEmit

# Lint code
npx eslint src/
```

### Debugging
- Use React Native Debugger or Expo dev tools
- Enable debug mode in `RfidService.ts` for detailed RFID logs
- Monitor SQLite database with local debugging tools

### Building for Production

#### iOS
```bash
npx expo build:ios
```

#### Android
```bash
npx expo build:android
```

## Troubleshooting

### Common Issues

1. **RFID Reader Not Connecting**
   - Check reader type configuration
   - Verify Bluetooth permissions (for BLE readers)
   - Ensure reader is in pairing mode

2. **GPS Location Not Working**
   - Verify location permissions are granted
   - Check device location services are enabled
   - Use physical device (simulator has limited GPS)

3. **Sync Issues**
   - Check internet connectivity
   - Verify Supabase configuration
   - Check authentication token validity

4. **Database Issues**
   - Clear app data to reset local database
   - Check for schema migration errors
   - Verify foreign key constraints

### Performance Optimization

- RFID reading can be CPU intensive - limit inventory frequency
- GPS polling affects battery life - configure appropriately
- Large batch sizes may impact sync performance

## Contributing

1. Follow the existing TypeScript and React Native patterns
2. Add types for new data structures in `src/types/`
3. Test with multiple RFID reader types when possible
4. Ensure offline functionality works correctly
5. Add appropriate error handling and user feedback

## License

This project is part of the RFID Field Capture + Sync SaaS platform.