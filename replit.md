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