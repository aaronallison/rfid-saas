# RFID Field Capture + Sync SaaS

A comprehensive SaaS solution for field-based RFID data capture and synchronization, featuring mobile data collection capabilities and a web-based management dashboard.

## Overview

This application enables organizations to capture RFID tag data in the field using mobile devices and synchronize it with a centralized web platform. It's designed for use cases such as asset tracking, inventory management, and field data collection where offline capability and reliable sync are essential.

## Architecture

This is a monorepo containing:

- **Mobile App** (`apps/mobile`): React Native/Expo app for field data capture
- **Web Dashboard** (`apps/web`): Next.js web application for data management
- **Shared Packages** (`packages/shared`): Common utilities and types
- **Database** (`supabase/`): PostgreSQL database with Supabase

## Features

### Mobile App
- RFID tag scanning and data capture
- Offline-first data storage with SQLite
- Batch management for organizing captures
- Location-aware data collection
- Background synchronization
- Multiple RFID reader support (BLE, vendor-specific)
- Organization-based user management

### Web Dashboard
- Real-time data visualization
- Batch and capture management
- Team and organization administration
- Billing and subscription management (Stripe integration)
- Data export and reporting

## Prerequisites

Before getting started, ensure you have:

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Expo CLI** (for mobile development)
- **Supabase CLI** (for database management)
- **Git** for version control

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd rfid-field-capture-saas
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Copy example environment files
   cp apps/web/.env.example apps/web/.env.local
   
   # Configure your Supabase and Stripe keys
   ```

4. **Start development servers:**
   ```bash
   # Start all apps in development mode
   npm run dev
   
   # Or start individual apps:
   cd apps/mobile && npm run start
   cd apps/web && npm run dev
   ```

## Development Setup

### Database Setup

1. **Initialize Supabase:**
   ```bash
   npx supabase init
   npx supabase start
   ```

2. **Run migrations:**
   ```bash
   npx supabase db push
   ```

3. **Seed the database (optional):**
   ```bash
   npx supabase db reset --seed
   ```

### Mobile App Setup

1. **Navigate to mobile directory:**
   ```bash
   cd apps/mobile
   ```

2. **Start Expo development server:**
   ```bash
   npm run start
   ```

3. **Run on device:**
   - Install Expo Go app on your mobile device
   - Scan the QR code from the terminal
   - Or use iOS Simulator / Android Emulator

### Web App Setup

1. **Navigate to web directory:**
   ```bash
   cd apps/web
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Web dashboard: http://localhost:3000

## Environment Variables

### Web App (`apps/web/.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### Mobile App
The mobile app uses the same Supabase configuration, typically configured through the app settings or environment.

## Scripts

- `npm run dev` - Start all development servers
- `npm run build` - Build all applications
- `npm run lint` - Run linting across all packages
- `npm run type-check` - Run TypeScript type checking
- `npm run clean` - Clean all build artifacts

## Project Structure

```
├── apps/
│   ├── mobile/          # React Native/Expo mobile app
│   │   ├── src/
│   │   │   ├── screens/     # App screens/pages
│   │   │   ├── services/    # Business logic & API calls
│   │   │   ├── contexts/    # React contexts
│   │   │   └── types/       # TypeScript definitions
│   │   └── assets/      # Images, icons, etc.
│   └── web/             # Next.js web dashboard
│       ├── src/
│       │   ├── app/         # App router pages
│       │   ├── components/  # Reusable components
│       │   ├── contexts/    # React contexts
│       │   └── lib/         # Utility functions
├── packages/
│   └── shared/          # Shared utilities and types
├── supabase/
│   ├── migrations/      # Database migrations
│   └── seed.sql         # Database seed data
└── docs/                # Documentation
```

## Technology Stack

- **Frontend**: React, React Native, Next.js, TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Mobile**: Expo, React Navigation
- **Styling**: Tailwind CSS
- **Payments**: Stripe
- **Database**: PostgreSQL with Row Level Security
- **Development**: Turbo (monorepo), ESLint, TypeScript

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and add tests if applicable
4. Ensure all tests pass: `npm run test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature/new-feature`
7. Create a Pull Request

## Deployment

### Web App
The web app can be deployed to Vercel, Netlify, or any Node.js hosting platform.

### Mobile App
The mobile app can be built and deployed through Expo Application Services (EAS) or built locally.

```bash
# Build for production
cd apps/mobile
npx eas build --platform all
```

## Support

For questions, issues, or contributions, please:
- Open an issue in the GitHub repository
- Consult the documentation in the `docs/` directory
- Check the project wiki for additional resources

## License

[Add your license information here]

---

**Note**: This project is under active development. Please check the issues and project board for current development status and upcoming features.