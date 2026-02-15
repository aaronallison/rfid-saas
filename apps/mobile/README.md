# RFID Field Capture - Mobile App

React Native mobile application for capturing RFID field data with offline capabilities and sync functionality.

## Features

- 📱 Cross-platform (iOS & Android) support via Expo
- 📍 GPS location tagging for captures
- 💾 Offline SQLite database storage
- 🔄 Background sync with Supabase backend
- 🏢 Multi-organization support
- 🔐 Secure authentication with Supabase Auth

## Tech Stack

- **React Native** - Mobile framework
- **Expo** - Development platform and SDK
- **TypeScript** - Type safety
- **SQLite** - Local database for offline storage
- **Supabase** - Backend as a Service
- **React Navigation** - Navigation library

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Supabase:
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and anon key

3. Start the development server:
   ```bash
   npm start
   ```

4. Open the app:
   - iOS: Press `i` or scan QR code with Camera app
   - Android: Press `a` or scan QR code with Expo Go app

## Scripts

- `npm start` - Start Expo development server
- `npm run android` - Start on Android device/emulator
- `npm run ios` - Start on iOS device/simulator
- `npm run web` - Start web version
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - Run TypeScript compiler check
- `npm test` - Run Jest tests
- `npm run clean` - Clear Expo cache

## Project Structure

```
src/
├── components/        # Reusable UI components
├── contexts/         # React contexts (Auth, etc.)
├── navigation/       # Navigation configuration
├── screens/          # Screen components
├── services/         # Business logic and API calls
│   ├── database.ts   # SQLite operations
│   ├── supabase.ts   # Supabase client
│   ├── sync.ts       # Data synchronization
│   └── location.ts   # GPS location services
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Database Schema

The app uses SQLite for offline storage with the following tables:

- `batches` - RFID capture batches
- `schemas` - Dynamic field schemas
- `captures` - Individual RFID tag captures

## Permissions

The app requires the following permissions:

- **Location** - For GPS tagging of captures
- **Network** - For syncing with backend
- **Storage** - For local database

## Building for Production

1. Build the app:
   ```bash
   expo build:android  # for Android
   expo build:ios      # for iOS
   ```

2. Follow Expo's deployment guides for app stores

## Environment Variables

Required environment variables:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Contributing

1. Follow the existing code style
2. Run tests before submitting PR
3. Update documentation as needed
4. Ensure TypeScript strict mode compliance