import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "../server/routes";

// Environment configuration
const NODE_ENV = process.env.NODE_ENV || 'production';
const IS_PRODUCTION = true; // Always production on Vercel
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-secret-key-change-in-production';

// Warn about missing SESSION_SECRET in production
if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET environment variable is not set. Using default secret which is insecure for production.');
}

const app = express();

// Configure Express environment
app.set('env', 'production');

// Session configuration
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // Always secure on Vercel
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Initialize routes
let initialized = false;

async function initializeApp() {
  if (!initialized) {
    // Simple test endpoint
    app.get("/api/test-direct", (req, res) => {
      res.json({ message: "Direct test endpoint works", timestamp: new Date().toISOString() });
    });
    
    await registerRoutes(app);
    
    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      console.error(err);
    });
    
    initialized = true;
  }
  return app;
}

// Vercel serverless function handler
export default async function handler(req: any, res: any) {
  const app = await initializeApp();
  return app(req, res);
}