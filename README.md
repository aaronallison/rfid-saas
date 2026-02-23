# RFID Field Capture + Sync SaaS

Multi-tenant SaaS for RFID field data capture, GPS tracking, and automated case management.

## Monorepo Structure

```
apps/
  web/      → Next.js 14 dashboard (React, Tailwind, Supabase SSR auth)
  mobile/   → Expo React Native app (offline-first, RFID, GPS)
  api/      → Express.js API + agentic pipeline (BullMQ, Claude AI)
packages/
  shared/   → Shared types and utilities (planned)
supabase/
  migrations/ → Postgres schema (10 migrations, RLS on all tables)
```

## Quick Start

```bash
npm install
npx turbo run dev       # Start all apps
npx turbo run test      # Run all tests
npx turbo run lint      # Lint all apps
```

### Individual apps

```bash
cd apps/web && npm run dev      # Next.js on :3000
cd apps/api && npm run dev      # Express API on :3001
cd apps/mobile && npm start     # Expo dev server
```

## Stack

- **Web**: Next.js 14, React 18, Tailwind CSS, Supabase SSR
- **Mobile**: Expo SDK 54, React Native, SQLite, RFID abstraction
- **API**: Express.js, Zod validation, Pino logging, Helmet
- **Agentic**: 10-stage pipeline, BullMQ/Redis, Anthropic Claude
- **Database**: Supabase (Postgres + Auth + RLS)
- **Billing**: Stripe (checkout, portal, webhooks)
- **Deploy**: Railway (API), Vercel/Railway (web)
- **CI**: GitHub Actions (turbo lint + test)
