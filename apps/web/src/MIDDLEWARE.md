# Middleware Documentation

## Overview
This middleware provides essential security, CORS handling, and request tracking for the RFID Field Capture + Sync SaaS application.

## Features

### 1. Security Headers
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME type sniffing
- **Referrer-Policy**: Controls referrer information
- **X-XSS-Protection**: Enables XSS filtering

### 2. CORS Handling
- Configurable allowed origins
- Proper handling of preflight requests
- Credentials support for authenticated requests
- Comprehensive header allowlists

### 3. Request Tracking
- Unique request ID generation
- Development logging
- Request method and path tracking

## Configuration

### Allowed Origins
Update the `allowedOrigins` array in the middleware to include your production domains:

```typescript
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-production-domain.com'
]
```

### Route Matching
The middleware runs on all routes except:
- Static files (`_next/static`)
- Image optimization (`_next/image`)
- Favicon
- Image files (svg, png, jpg, jpeg, gif, webp)

To modify which routes are processed, update the `config.matcher` array.

## Environment Variables
Create a `.env.local` file based on `.env.example` for local development.

## Testing
Run the middleware tests with:
```bash
npm test middleware
```

## Security Considerations
1. Keep the allowed origins list minimal and specific
2. Review Content Security Policy headers regularly
3. Monitor request logs for suspicious activity
4. Consider rate limiting for API endpoints
5. Implement proper authentication checks for sensitive routes

## Performance Notes
- Middleware runs on every matched request
- Keep middleware logic lightweight
- Use proper logging levels in production
- Consider caching strategies for repeated checks