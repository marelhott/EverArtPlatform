import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertModelSchema, insertGenerationSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const EVERART_API_KEY = process.env.EVERART_API_KEY || process.env.API_KEY || "everart-Ec0-3NNDOk-RiqRq1n574d-grIX2izOUjlCZSGEy9cQ";
const BASE_URL = "https://api.everart.ai/v1";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Authorization": `Bearer ${EVERART_API_KEY}`,
    "Accept": "application/json",
    "Content-Type": "application/json"
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all models from EverArt API
  app.get("/api/models", async (req, res) => {
    try {
      const response = await apiClient.get("/models");
      const models = response.data.models || [];
      
      // Store/update models in local storage
      for (const model of models) {
        const existingModel = await storage.getModelByEverartId(model.id);
        if (!existingModel) {
          await storage.createModel({
            everartId: model.id,
            name: model.name,
            subject: model.subject || "STYLE",
            status: model.status,
            thumbnailUrl: model.thumbnail_url
          });
        } else {
          await storage.updateModelStatus(model.id, model.status, model.thumbnail_url);
        }
      }
      
      const localModels = await storage.getAllModels();
      res.json({ models: localModels });
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ message: "Nelze načíst modely" });
    }
  });

  // Create new model
  app.post("/api/models", upload.array('images', 20), async (req, res) => {
    try {
      const { name, subject } = req.body;
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Žádné obrázky nebyly nahrány" });
      }

      // Upload images to EverArt
      const uploadTokens = [];
      for (const file of files) {
        const filename = file.originalname;
        const contentType = file.mimetype;
        
        // Request upload URL
        const uploadResponse = await apiClient.post("/images/uploads", {
          images: [{ filename, content_type: contentType }]
        });
        
        const uploadData = uploadResponse.data.image_uploads[0];
        
        // Upload file to the provided URL
        await axios.put(uploadData.upload_url, file.buffer, {
          headers: { "Content-Type": contentType }
        });
        
        uploadTokens.push(uploadData.upload_token);
      }

      // Create model in EverArt
      const modelResponse = await apiClient.post("/models", {
        name,
        subject,
        image_upload_tokens: uploadTokens
      });

      const everartModel = modelResponse.data.model;
      
      // Store model locally
      const model = await storage.createModel({
        everartId: everartModel.id,
        name: everartModel.name,
        subject: everartModel.subject || subject,
        status: everartModel.status,
        thumbnailUrl: everartModel.thumbnail_url
      });

      res.json({ model });
    } catch (error) {
      console.error("Error creating model:", error);
      res.status(500).json({ message: "Nepodařilo se vytvořit model" });
    }
  });

  // Get model status
  app.get("/api/models/:everartId/status", async (req, res) => {
    try {
      const { everartId } = req.params;
      const response = await apiClient.get(`/models/${everartId}`);
      const model = response.data.model;
      
      // Update local storage
      await storage.updateModelStatus(everartId, model.status, model.thumbnail_url);
      
      res.json({ status: model.status, thumbnailUrl: model.thumbnail_url });
    } catch (error) {
      console.error("Error fetching model status:", error);
      res.status(500).json({ message: "Nelze načíst stav modelu" });
    }
  });

  // Apply model to image
  app.post("/api/models/:everartId/apply", upload.single('image'), async (req, res) => {
    try {
      const { everartId } = req.params;
      const { styleStrength = 0.6, width = 512, height = 512, numImages = 1 } = req.body;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "Žádný obrázek nebyl nahrán" });
      }

      console.log("Applying model:", everartId, "with params:", { styleStrength, width, height, numImages });

      // Upload input image
      const filename = file.originalname;
      const contentType = file.mimetype;
      
      const uploadResponse = await apiClient.post("/images/uploads", {
        images: [{ filename, content_type: contentType }]
      });
      
      const uploadData = uploadResponse.data.image_uploads[0];
      console.log("Upload response data:", JSON.stringify(uploadData, null, 2));
      
      await axios.put(uploadData.upload_url, file.buffer, {
        headers: { "Content-Type": contentType }
      });

      console.log("Image uploaded with token:", uploadData.upload_token);

      // Create generation locally
      const generation = await storage.createGeneration({
        modelId: everartId,
        inputImageUrl: uploadData.upload_url,
        status: "PROCESSING",
        styleStrength: parseFloat(styleStrength),
        width: parseInt(width),
        height: parseInt(height)
      });

      // Generate with EverArt - according to official API docs
      const generationPayload = {
        prompt: " ",
        type: "img2img", 
        image: uploadData.file_url,  // Use file_url from upload response
        image_count: parseInt(numImages),
        width: parseInt(width),
        height: parseInt(height),
        style_strength: parseFloat(styleStrength)
      };

      console.log("Sending generation request:", JSON.stringify(generationPayload, null, 2));

      const generationResponse = await apiClient.post(`/models/${everartId}/generations`, generationPayload);

      console.log("Generation response:", generationResponse.data);

      const generations = generationResponse.data.generations || [];
      if (generations.length > 0) {
        const generationId = generations[0].id;
        
        // Poll for completion
        const maxAttempts = 60; // 5 minutes max
        let attempts = 0;
        
        while (attempts < maxAttempts) {
          try {
            const statusResponse = await apiClient.get(`/generations/${generationId}`);
            const genStatus = statusResponse.data.generation;
            
            console.log(`Generation ${generationId} status: ${genStatus.status}`);
            
            if (genStatus.status === 'SUCCEEDED' && genStatus.image_url) {
              // Update generation with result
              const updatedGeneration = await storage.updateGeneration(generation.id, {
                outputImageUrl: genStatus.image_url,
                status: "COMPLETED"
              });
              
              return res.json({ 
                generation: updatedGeneration,
                resultUrl: genStatus.image_url 
              });
            } else if (genStatus.status === 'FAILED') {
              await storage.updateGeneration(generation.id, { status: "FAILED" });
              return res.status(500).json({ message: "Generování selhalo" });
            }
            
            // Wait 5 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;
          } catch (pollError) {
            console.error("Error polling generation status:", pollError);
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
        
        // Timeout
        await storage.updateGeneration(generation.id, { status: "FAILED" });
        res.status(500).json({ message: "Generování trvá příliš dlouho" });
      } else {
        await storage.updateGeneration(generation.id, { status: "FAILED" });
        res.status(500).json({ message: "Generování se nezdařilo" });
      }
    } catch (error) {
      console.error("Error applying model:", error);
      if (error.response) {
        console.error("EverArt API response:", error.response.data);
        console.error("Status:", error.response.status);
      }
      res.status(500).json({ 
        message: "Nepodařilo se aplikovat model",
        error: error.response?.data || error.message 
      });
    }
  });

  // Get all generations
  app.get("/api/generations", async (req, res) => {
    try {
      const generations = await storage.getAllGenerations();
      res.json({ generations });
    } catch (error) {
      console.error("Error fetching generations:", error);
      res.status(500).json({ message: "Nelze načíst generování" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
