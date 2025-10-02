import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import axios from 'axios';

// Configure for Vercel serverless environment
neonConfig.useSecureWebSocket = false;
neonConfig.pipelineTLS = false;
neonConfig.pipelineConnect = false;

// Inline schema definition
const models = pgTable('models', {
  id: text('id').primaryKey(),
  everartId: varchar('everart_id', { length: 255 }).unique(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 50 }).default('STYLE'),
  status: varchar('status', { length: 50 }),
  thumbnailUrl: text('thumbnail_url'),
  createdAt: timestamp('created_at').defaultNow()
});

const databaseUrl = process.env.DATABASE_URL || "postgresql://user:password@localhost:5432/everart";
const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle({ client: pool, schema: { models } });

const EVERART_API_KEY = process.env.EVERART_API_KEY || "everart-Ec0-3NNDOk-RiqRq1n574d-grIX2izOUjlCZSGEy9cQ";
const BASE_URL = "https://api.everart.ai/v1";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Authorization": `Bearer ${EVERART_API_KEY}`,
    "Accept": "application/json",
    "Content-Type": "application/json"
  }
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Fetch models from EverArt API
    const response = await apiClient.get('/models');
    const everartModels = response.data.data || [];

    // Get existing models from database
    const existingModels = await db.select().from(models);
    const existingModelIds = new Set(existingModels.map(m => m.everartId));

    // Sync models
    for (const model of everartModels) {
      if (!existingModelIds.has(model.id)) {
        // Insert new model
        await db.insert(models).values({
          id: `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          everartId: model.id,
          name: model.name,
          subject: model.subject || "STYLE",
          status: model.status,
          thumbnailUrl: model.thumbnail_url
        });
      } else {
        // Update existing model
        await db.update(models)
          .set({
            status: model.status,
            thumbnailUrl: model.thumbnail_url
          })
          .where(eq(models.everartId, model.id));
      }
    }

    // Return updated models from database
    const allModels = await db.select().from(models);
    
    res.status(200).json({
      success: true,
      models: allModels,
      synced: everartModels.length
    });

  } catch (error) {
    console.error('Models endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch models',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}