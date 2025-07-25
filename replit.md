# EverArt AI - Image Style Transfer Application

## Overview

This is a full-stack web application that integrates with the EverArt AI API to provide AI-powered image style transfer capabilities. The application allows users to create custom AI models, train them with their own images, and apply these models to transform new images with specific artistic styles.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized production builds
- **UI Framework**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with ESM modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Storage**: PostgreSQL-based session storage
- **File Handling**: Multer for multipart form data processing
- **External API**: EverArt AI integration for model training and image processing

### Database Design
The application uses PostgreSQL with three main tables:
- **models**: Stores AI model metadata including EverArt IDs, names, subjects, and status
- **generations**: Tracks image generation requests and results
- **users**: Basic user authentication (prepared but not fully implemented)

## Key Components

### Model Management
- Create new AI models by uploading training images
- Support for different model types (STYLE, PERSON, OBJECT)
- Real-time status tracking during model training
- Local storage sync with EverArt API models

### Image Processing
- Upload images for style transfer
- Configurable parameters (style strength, dimensions)
- Asynchronous processing with status updates
- Result image display and download capabilities

### User Interface
- Responsive design with mobile support
- Three main tabs: Models listing, Model creation, Model application
- File drag-and-drop functionality
- Progress indicators for long-running operations
- Toast notifications for user feedback

## Data Flow

1. **Model Creation**: User uploads training images → FormData sent to backend → EverArt API creates model → Status stored locally
2. **Model Training**: Periodic status checks → EverArt API polling → Local database updates
3. **Image Generation**: User uploads input image → Backend processes through EverArt API → Result returned and stored
4. **Model Listing**: Frontend queries local database → Returns cached model data with real-time status updates

## External Dependencies

### Core Dependencies
- **EverArt AI API**: Primary external service for AI model training and image processing
- **Neon Database**: PostgreSQL hosting (based on connection string format)
- **Radix UI**: Headless component library for accessibility
- **TanStack Query**: Server state synchronization

### Development Tools
- **Drizzle Kit**: Database migration management
- **Replit Integration**: Development environment optimization
- **ESBuild**: Production bundling for backend

## Deployment Strategy

### Development Mode
- Vite dev server for frontend hot reloading
- TSX for TypeScript execution without compilation
- Concurrent frontend/backend development

### Production Build
- **Frontend**: Vite builds static assets to `dist/public`
- **Backend**: ESBuild bundles Node.js application to `dist/index.js`
- **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- API keys stored in environment variables
- Database connection via `DATABASE_URL`
- Development/production mode detection
- CORS and security headers configured appropriately

### Key Architectural Decisions

**Monorepo Structure**: Single repository with shared schema between client and server for type safety and code reuse.

**In-Memory Fallback Storage**: Implements IStorage interface with both database and memory implementations for development flexibility.

**API-First Integration**: Direct integration with EverArt API rather than building custom ML pipeline, reducing complexity and leveraging specialized AI services.

**Real-time Status Updates**: Polling-based model training status updates to provide responsive user experience despite long-running AI operations.

**File Upload Handling**: Memory-based multer storage with size limits for efficient file processing without persistent storage requirements.

## Recent Changes (July 25, 2025)

### Image Management Improvements
- **Fullscreen Modal Dialog**: Implemented ImageModal component for viewing generated images in fullscreen
- **Local Image Deletion**: Added one-click delete functionality with trash icon (no confirmation required)
- **Soft Delete System**: Images are marked as deleted instead of being physically removed, preventing re-loading on restart
- **Visual Improvements**: Trash icon positioned in bottom-right corner, smaller and more transparent
- **Reverse Chronological Order**: Newest generated images now appear at the top of the feed

## Previous Changes (July 23, 2025)

### Completed User Data Synchronization (MAJOR SUCCESS)
- **Full Data Recovery**: Successfully found and synchronized 13 user-generated images from localStorage
- **Cloudinary Integration**: All user images now backed up to cloud storage with CDN URLs
- **Automatic Sync**: System now automatically synchronizes all new and existing data on app load
- **Debug Tools**: Created comprehensive localStorage diagnostic and sync tools
- **Data Persistence**: User's actual generated images preserved and accessible via Cloudinary

### Simplified Multi-Model Generation Interface
- **Removed Mode Toggle**: Eliminated separate "single model" / "multi-model" tabs
- **Unified Checkbox Interface**: All models show checkboxes for selection
- **Smart Generation**: One button adapts to selected model count
- **Improved UX**: Single interface handles both single and multi-model workflows seamlessly

### Enhanced Cloudinary Synchronization System
- **localStorage Integration**: Comprehensive sync of apply_model_state and everart_generations data
- **Robust Error Handling**: Graceful handling of unavailable URLs and network issues
- **Duplicate Prevention**: Smart URL deduplication prevents multiple uploads of same image
- **Debug Interface**: Interactive debug tool at /debug-localStorage for manual synchronization
- **Background Processing**: Automatic sync on app load with detailed logging

## Previous Changes (July 22, 2025)

### Deployment Fixes Applied
- **Environment Detection**: Added proper NODE_ENV and REPLIT_DEPLOYMENT detection for production mode
- **Session Configuration**: Implemented express-session with SESSION_SECRET environment variable
- **Production Mode**: Fixed production vs development mode detection in server/index.ts
- **Build Process**: Confirmed ESBuild compilation outputs to dist/index.js as expected
- **TypeScript Fixes**: Resolved type errors in server/routes.ts for better deployment compatibility

### Model Management Enhancements
- **Delete Functionality**: Added small trash icon next to model names on homepage thumbnails
- **Local-Only Deletion**: Models removed only from local application, NOT from EverArt API
- **Confirmation Dialog**: User-friendly confirmation dialog before model removal
- **UI Placement**: Trash icon positioned directly next to model name for easy access

### Cloudinary Integration Completed
- **Cloud Storage**: Integrated Cloudinary for automatic image uploads and CDN delivery
- **API Configuration**: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET configured
- **Automatic Upload**: All generated images automatically uploaded to Cloudinary CDN
- **Automatic Sync**: Existing images automatically synchronized with Cloudinary on app load
- **Background Processing**: Sync happens silently without user intervention
- **Fallback Handling**: Graceful fallback to original URLs if Cloudinary upload fails
- **Storage Structure**: Images organized in `everart-generations/` folder

### Multi-Model Generation Feature
- **Unified Interface**: Single interface for both single and multi-model generation (no mode toggle)
- **Checkbox Selection**: Click models to select/deselect them (visual feedback with checkmarks)
- **Flexible Selection**: Select 1 model for single generation, multiple for batch processing
- **Batch Processing**: Generate images with multiple models from single source image
- **Concurrent API Calls**: Parallel processing of multiple models for faster results
- **Individual Results**: Each model generates separate result instance
- **Smart Button**: Button text adapts based on selection count

### Environment Variables Required for Production
1. **SESSION_SECRET** - Required for secure session management in production
2. **EVERART_API_KEY** - Required for AI image processing (already configured)
3. **CLOUDINARY_CLOUD_NAME** - Cloud storage configuration (configured)
4. **CLOUDINARY_API_KEY** - Cloud storage API access (configured)
5. **CLOUDINARY_API_SECRET** - Cloud storage authentication (configured)
6. **NODE_ENV** - Set to "production" for deployment (or REPLIT_DEPLOYMENT will be detected)

The application now properly handles production deployment with secure session management, correct environment detection, and cloud-based image storage.