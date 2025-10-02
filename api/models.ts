import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import { models } from '../shared/schema';
import axios from 'axios';

// Configure for Vercel serverless environment
neonConfig.useSecureWebSocket = false;
neonConfig.pipelineTLS = false;
neonConfig.pipelineConnect = false;

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
    if (!EVERART_API_KEY) {
      return res.status(400).json({ 
        message: "EverArt API klíč není nastaven",
        models: []
      });
    }

    console.log("Fetching models from EverArt API...");
    
    // Get EverArt models for sync
    const response = await apiClient.get("/models");
    console.log("EverArt API response:", response.status, `Found ${response.data.models?.length || 0} models`);
    const everartModels = response.data.models || [];
    
    console.log(`Processing ${everartModels.length} models from EverArt API...`);
    
    // Store/update NEW models in local storage only (skip deleted ones)
    for (const model of everartModels) {
      try {
        // Check if model exists
        const existingModel = await db.select().from(models).where(eq(models.everartId, model.id)).limit(1);
        
        if (existingModel.length === 0) {
          console.log(`Creating new model: ${model.name} (${model.id})`);
          await db.insert(models).values({
            everartId: model.id,
            name: model.name,
            subject: model.subject || "STYLE",
            status: model.status,
            thumbnailUrl: model.thumbnail_url
          });
        } else {
          console.log(`Updating existing model: ${model.name} (${model.id})`);
          await db.update(models)
            .set({
              status: model.status,
              thumbnailUrl: model.thumbnail_url
            })
            .where(eq(models.everartId, model.id));
        }
      } catch (modelError) {
        console.error(`Error processing model ${model.id}:`, modelError);
      }
    }
    
    // Return all models from local storage
    const localModels = await db.select().from(models);
    console.log(`Returning ${localModels.length} models from local storage`);
    
    res.json({ models: localModels });
  } catch (error) {
    console.error("Error fetching models:", error);
    res.status(500).json({ 
      message: "Nelze načíst modely",
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}