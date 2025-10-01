import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

// Configure for Vercel serverless environment
// Disable WebSocket for serverless compatibility
neonConfig.useSecureWebSocket = false;
neonConfig.pipelineTLS = false;
neonConfig.pipelineConnect = false;

// For local development, use a mock database URL if not provided
const databaseUrl = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/everart";

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
