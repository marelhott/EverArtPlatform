# Deployment Configuration

## Environment Variables Required for Production

### Required Secrets
1. **SESSION_SECRET** - Required for session management
   - Generate a secure random string for production
   - Used for cookie signing and session security

2. **EVERART_API_KEY** - Required for AI image processing
   - Your EverArt API key for model operations
   - Already configured in routes.ts

### Environment Detection
The application now properly detects production vs development:
- Uses `NODE_ENV=production` OR `REPLIT_DEPLOYMENT` environment variable
- Automatically configures secure cookies in production
- Serves static files instead of Vite dev server

## Build Process
- Build script: `npm run build` 
  - Builds frontend with Vite
  - Compiles backend with ESBuild to `dist/index.js`
- Start script: `npm start`
  - Sets NODE_ENV=production
  - Runs compiled `dist/index.js`

## Production Checklist
- [x] NODE_ENV environment variable detection
- [x] REPLIT_DEPLOYMENT detection for production mode
- [x] SESSION_SECRET environment variable handling
- [x] Proper build output compilation
- [x] Static file serving in production
- [x] Secure cookie configuration