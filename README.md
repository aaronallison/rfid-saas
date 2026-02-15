# RFID Field Capture + Sync SaaS

A comprehensive Software-as-a-Service (SaaS) platform for field-based RFID data collection and synchronization. This platform enables organizations to capture RFID tag data in the field through mobile applications and manage it through a web dashboard with real-time synchronization capabilities.

## 🏗️ Architecture

This is a **monorepo** built with Turborepo containing:

- **Mobile App** (`apps/mobile/`) - React Native/Expo mobile application for field data capture
- **Web Dashboard** (`apps/web/`) - Next.js web application for data management and analytics
- **Shared Packages** (`packages/shared/`) - Common utilities and types
- **Database** (`supabase/`) - PostgreSQL database with Supabase for real-time sync

## 🚀 Features

### Mobile App (Field Capture)
- **RFID Tag Reading** - Support for multiple RFID reader types via abstraction layer
- **Batch Management** - Organize captures into batches with custom schemas
- **Offline Support** - Local SQLite storage with automatic sync when online
- **GPS Integration** - Automatic location capture with each RFID read
- **Multi-Organization** - Support for multiple organizations per user
- **Reader Settings** - Configure different RFID reader types and connection settings

### Web Dashboard
- **Batch Management** - View and manage all field capture batches
- **Team Management** - Invite and manage team members
- **Organization Management** - Multi-tenant organization support
- **Billing Integration** - Stripe-powered subscription management
- **Real-time Sync** - Live updates from mobile field captures

### Backend Services
- **Supabase Integration** - Real-time database with RLS (Row Level Security)
- **Stripe Billing** - Subscription management and webhook handling
- **Multi-tenant Architecture** - Organization-based data isolation

## 🛠️ Tech Stack

### Mobile App
- **React Native** with Expo
- **TypeScript** for type safety
- **SQLite** for offline storage
- **Supabase** for real-time synchronization
- **React Navigation** for app navigation
- **Expo Location** for GPS functionality

### Web App
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Supabase** for backend services
- **Stripe** for payment processing
- **Lucide React** for icons

### Database & Backend
- **Supabase** (PostgreSQL)
- **Row Level Security (RLS)** for data protection
- **Real-time subscriptions** for live updates
- **Database migrations** for version control

## 📋 Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Expo CLI** (for mobile development)
- **Supabase CLI** (for database management)
- **Git** for version control

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd rfid-field-capture-saas
npm install
```

### 2. Environment Setup

#### Web App Environment
```bash
cd apps/web
cp .env.example .env.local
# Edit .env.local with your configuration
```

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Database Setup

```bash
# Install Supabase CLI
npm install -g @supabase/cli

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push

# Optional: Load seed data
supabase db seed
```

### 4. Development

Start all applications in development mode:

```bash
npm run dev
```

Or start individual applications:

```bash
# Web dashboard
cd apps/web && npm run dev

# Mobile app
cd apps/mobile && npm start
```

## 📱 Mobile Development

### Prerequisites for Mobile
- **Expo CLI**: `npm install -g @expo/cli`
- **iOS Simulator** (macOS) or **Android Studio** (for Android development)

### Running on Device/Simulator

```bash
cd apps/mobile

# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android
npm run android

# Run in web browser (for testing)
npm run web
```

### RFID Reader Integration

The mobile app supports multiple RFID reader types through an abstraction layer:

- **Mock Reader** - For development and testing
- **BLE Readers** - Bluetooth Low Energy RFID readers
- **Vendor-specific Readers** - Extensible for specific hardware

Configure reader settings in the mobile app's Settings screen.

## 🌐 Web Development

### Development Server

```bash
cd apps/web
npm run dev
```

The web dashboard will be available at `http://localhost:3000`

### Building for Production

```bash
cd apps/web
npm run build
npm start
```

## 🗄️ Database Schema

### Core Tables
- **organizations** - Multi-tenant organization management
- **org_members** - Organization membership and roles
- **batches** - Data collection batches
- **batch_schemas** - Custom field definitions for batches
- **captures_universal** - RFID capture data with location
- **billing_orgs** - Stripe billing integration

### Security
- **Row Level Security (RLS)** enforced on all tables
- **Organization-based isolation** ensures data privacy
- **Helper functions** for common RLS patterns

## 💰 Billing Integration

### Stripe Configuration

1. **Create Stripe Products** for your subscription tiers
2. **Configure Webhooks** pointing to `/api/billing/webhook`
3. **Set Environment Variables** in your web app
4. **Test with Stripe CLI**:

```bash
stripe listen --forward-to localhost:3000/api/billing/webhook
```

### Subscription Management
- **Customer Portal** - Self-service billing management
- **Checkout Sessions** - Subscription signup flow
- **Webhook Handling** - Automatic subscription status updates

## 🧪 Testing

```bash
# Run all tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📦 Building and Deployment

### Web App Deployment

```bash
cd apps/web
npm run build
```

Deploy the `apps/web` directory to your hosting platform (Vercel, Netlify, etc.)

### Mobile App Deployment

```bash
cd apps/mobile

# Build for production
expo build:android
expo build:ios

# Or use EAS Build (recommended)
eas build --platform all
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- **Follow TypeScript** best practices
- **Write tests** for new features
- **Update documentation** as needed
- **Follow existing code style** and patterns
- **Ensure mobile/web compatibility** for shared features

## 📁 Project Structure

```
rfid-field-capture-saas/
├── apps/
│   ├── mobile/              # React Native mobile app
│   │   ├── src/
│   │   │   ├── contexts/    # React contexts
│   │   │   ├── navigation/  # App navigation
│   │   │   ├── screens/     # App screens
│   │   │   ├── services/    # Business logic & APIs
│   │   │   └── types/       # TypeScript types
│   │   └── package.json
│   └── web/                 # Next.js web app
│       ├── src/
│       │   ├── app/         # App Router pages
│       │   ├── components/  # React components
│       │   ├── contexts/    # React contexts
│       │   └── lib/         # Utilities & services
│       └── package.json
├── packages/
│   └── shared/              # Shared utilities & types
├── supabase/
│   ├── migrations/          # Database migrations
│   ├── rls_policies.sql     # Row Level Security policies
│   └── seed.sql            # Seed data
├── docs/                   # Documentation
├── package.json            # Root package.json
└── tsconfig.json          # TypeScript configuration
```

## 🔧 Troubleshooting

### Common Issues

**Mobile App won't connect to Supabase**
- Check your Supabase URL and anon key
- Ensure your device/simulator can reach the internet
- Verify RLS policies allow your user access

**Web app billing not working**
- Verify Stripe keys are set correctly
- Check webhook endpoint is accessible
- Ensure webhook signing secret matches

**Database connection issues**
- Verify Supabase project is running
- Check RLS policies are correctly configured
- Ensure migrations have been applied

### Getting Help

1. **Check the troubleshooting section** above
2. **Review existing issues** in the repository
3. **Create a new issue** with detailed information
4. **Join our community** discussions

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

- **Supabase** for the excellent backend-as-a-service platform
- **Expo** for simplifying React Native development  
- **Next.js** for the powerful React framework
- **Stripe** for seamless payment processing