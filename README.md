# RFID Field Capture + Sync SaaS

A comprehensive SaaS solution for RFID field data capture and synchronization.

## Project Structure

```
├── apps/
│   └── web/                 # Next.js web application
│       ├── src/
│       │   ├── middleware.ts    # Request middleware
│       │   ├── __tests__/       # Test files
│       │   └── MIDDLEWARE.md    # Middleware documentation
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.js
│       └── .env.example
└── README.md
```

## Getting Started

1. Navigate to the web app:
   ```bash
   cd apps/web
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

## Features

- **Security**: Comprehensive security headers and CORS handling
- **Request Tracking**: Unique request IDs for debugging and monitoring
- **Type Safety**: Full TypeScript support
- **Testing**: Jest-based testing setup
- **Development**: Hot reloading and development logging

## Middleware

The application includes a robust middleware system that handles:
- Security headers for all requests
- CORS configuration for API routes  
- Request ID generation and logging
- Route-specific processing

See [apps/web/src/MIDDLEWARE.md](apps/web/src/MIDDLEWARE.md) for detailed documentation.
