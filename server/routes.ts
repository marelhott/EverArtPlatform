import type { Express } from "express";
import { createServer, type Server } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { insertModelSchema, insertGenerationSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { CloudinaryService } from "./cloudinary";

// ES modules __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const EVERART_API_KEY = process.env.EVERART_API_KEY || "everart-Ec0-3NNDOk-RiqRq1n574d-grIX2izOUjlCZSGEy9cQ";
const BASE_URL = "https://api.everart.ai/v1";

// Recreate API client to use updated API key
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Authorization": `Bearer ${EVERART_API_KEY}`,
    "Accept": "application/json",
    "Content-Type": "application/json"
  }
});

console.log("API Client configured with key:", EVERART_API_KEY ? "Set" : "Not set");

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get system info
  app.get("/api/info", async (req, res) => {
    res.json({
      cloudinary: {
        configured: CloudinaryService.isConfigured(),
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
        apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
        apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
      },
      everart: {
        configured: !!EVERART_API_KEY,
        key: EVERART_API_KEY ? 'Set' : 'Not set'
      }
    });
  });

  // Get all models (simplified version for testing)
  app.get("/api/models", async (req, res) => {
    try {
      if (!EVERART_API_KEY) {
        return res.status(400).json({ 
          message: "EverArt API klíč není nastaven",
          models: []
        });
      }

      console.log("Fetching models from EverArt API...");
      // Get EverArt models directly without storage
      const response = await apiClient.get("/models");
      console.log("EverArt API response:", response.status);
      const everartModels = response.data.data || response.data.models || [];
      
      console.log(`Returning ${everartModels.length} models from EverArt API`);
      res.json({ 
        models: everartModels,
        source: 'everart-api-direct',
        count: everartModels.length
      });
    } catch (error) {
      console.error("Error fetching models:", error);
      res.status(500).json({ 
        message: "Nelze načíst modely",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

      // Get model name for generation tracking
      const model = await storage.getModelByEverartId(everartId);
      const modelName = model?.name || "Unknown Model";

      // Create generation locally
      const generation = await storage.createGeneration({
        modelId: everartId,
        modelName: modelName,
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
        // Poll for completion of ALL generations
        const maxAttempts = 60; // 5 minutes max
        let attempts = 0;
        const completedGenerations: Array<{id: string, image_url?: string, failed?: boolean}> = [];
        
        while (attempts < maxAttempts && completedGenerations.length < generations.length) {
          try {
            // Check status of all generations
            const statusPromises = generations.map((gen: any) => 
              apiClient.get(`/generations/${gen.id}`).catch(err => ({ error: err, id: gen.id }))
            );
            
            const statusResponses = await Promise.all(statusPromises);
            
            for (let i = 0; i < statusResponses.length; i++) {
              const response = statusResponses[i];
              if (response.error) continue;
              
              const genStatus = response.data.generation;
              console.log(`Generation ${genStatus.id} status: ${genStatus.status}`);
              
              if (genStatus.status === 'SUCCEEDED' && genStatus.image_url) {
                // Check if already added
                if (!completedGenerations.find(cg => cg.id === genStatus.id)) {
                  completedGenerations.push({
                    id: genStatus.id,
                    image_url: genStatus.image_url
                  });
                }
              } else if (genStatus.status === 'FAILED') {
                // Mark as failed but continue with others
                if (!completedGenerations.find(cg => cg.id === genStatus.id)) {
                  completedGenerations.push({
                    id: genStatus.id,
                    image_url: undefined,
                    failed: true
                  });
                }
              }
            }
            
            // If all generations are complete (successful or failed), return results
            const totalExpected = generations.length;
            const totalCompleted = completedGenerations.length;
            
            if (totalCompleted >= totalExpected) {
              const successfulGenerations = completedGenerations.filter(cg => cg.image_url && !cg.failed);
              
              if (successfulGenerations.length > 0) {
                // Upload ALL successful generations to Cloudinary if configured
                const cloudinaryUrls = [];
                
                if (CloudinaryService.isConfigured()) {
                  for (const generation of successfulGenerations) {
                    try {
                      const cloudinaryResult = await CloudinaryService.uploadFromUrl(
                        generation.image_url,
                        'everart-generations'
                      );
                      cloudinaryUrls.push({
                        ...generation,
                        image_url: cloudinaryResult.secure_url
                      });
                      console.log(`Image uploaded to Cloudinary: ${cloudinaryResult.secure_url}`);
                    } catch (cloudinaryError) {
                      console.warn('Failed to upload to Cloudinary, using original URL:', cloudinaryError);
                      cloudinaryUrls.push(generation);
                    }
                  }
                } else {
                  console.log('Cloudinary not configured, using original EverArt URLs');
                  cloudinaryUrls.push(...successfulGenerations);
                }

                const finalImageUrl = cloudinaryUrls[0]?.image_url || (successfulGenerations[0]?.image_url ?? '');

                // Update our local generation with the final result URL
                const updatedGeneration = await storage.updateGeneration(generation.id, {
                  outputImageUrl: finalImageUrl,
                  status: "COMPLETED"
                });
                
                return res.json({ 
                  generations: cloudinaryUrls,
                  generation: updatedGeneration,
                  resultUrl: finalImageUrl 
                });
              } else {
                // All failed
                await storage.updateGeneration(generation.id, { status: "FAILED" });
                return res.status(500).json({ message: "Všechna generování selhala" });
              }
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
    } catch (error: any) {
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

  // Delete generation (local only, not from EverArt API)
  app.delete("/api/generations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const generationId = parseInt(id);
      
      if (isNaN(generationId)) {
        return res.status(400).json({ message: "Neplatné ID generování" });
      }

      // Delete from local storage only
      const success = await storage.deleteGeneration(generationId);
      
      if (success) {
        res.json({ message: "Generování úspěšně smazáno" });
      } else {
        res.status(404).json({ message: "Generování nenalezeno" });
      }
    } catch (error) {
      console.error("Error deleting generation:", error);
      res.status(500).json({ message: "Nepodařilo se smazat generování" });
    }
  });

  // Generate images - supports both single and multi-model generation
  app.post("/api/generations", upload.single("image"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const { modelIds, styleStrength = "0.8", width = "512", height = "512", numImages = "1" } = req.body;

      let parsedModelIds;
      try {
        parsedModelIds = JSON.parse(modelIds);
      } catch (e) {
        parsedModelIds = [modelIds]; // fallback for single model
      }

      if (!parsedModelIds || parsedModelIds.length === 0) {
        return res.status(400).json({ message: "At least one model ID is required" });
      }

      console.log("Generating with models:", parsedModelIds, "params:", { styleStrength, width, height, numImages });

      // Upload input image once
      const filename = file.originalname;
      const contentType = file.mimetype;
      
      const uploadResponse = await apiClient.post("/images/uploads", {
        images: [{ filename, content_type: contentType }]
      });
      
      const uploadData = uploadResponse.data.image_uploads[0];
      await axios.put(uploadData.upload_url, file.buffer, {
        headers: { "Content-Type": contentType }
      });

      // Process each model and create individual database entries
      const allResults = [];
      
      for (const modelId of parsedModelIds) {
        try {
          // Get model details
          const model = await storage.getModelByEverartId(modelId);
          const modelName = model?.name || "Unknown Model";
          
          try {
            // Generate with EverArt - numImages controls how many images per model
            const generationPayload = {
              prompt: " ",
              type: "img2img", 
              image: uploadData.file_url,
              image_count: parseInt(numImages),
              width: parseInt(width),
              height: parseInt(height),
              style_strength: parseFloat(styleStrength)
            };

            const generationResponse = await apiClient.post(`/models/${modelId}/generations`, generationPayload);
            const generations = generationResponse.data.generations || [];

            if (generations.length > 0) {
              // Process each generated image separately
              for (let i = 0; i < generations.length; i++) {
                const genId = generations[i].id;
                
                // Create individual database entry for each image
                const generation = await storage.createGeneration({
                  modelId: modelId,
                  modelName: modelName,
                  inputImageUrl: uploadData.upload_url,
                  status: "PROCESSING",
                  styleStrength: parseFloat(styleStrength),
                  width: parseInt(width),
                  height: parseInt(height)
                });

                // Poll for completion of this specific image
                const maxAttempts = 120; // Increased from 60 to 120 (6 minutes total)
                let attempts = 0;
                
                console.log(`Starting polling for generation ${genId}, max attempts: ${maxAttempts}`);
                
                while (attempts < maxAttempts) {
                  try {
                    const statusResponse = await apiClient.get(`/generations/${genId}`);
                    const genStatus = statusResponse.data.generation;
                    
                    console.log(`Polling attempt ${attempts + 1}/${maxAttempts} for generation ${genId}: status=${genStatus.status}`);
                    
                    if (genStatus.status === 'SUCCEEDED' && genStatus.image_url) {
                      // Upload to Cloudinary if configured
                      let finalUrl = genStatus.image_url;
                      if (CloudinaryService.isConfigured()) {
                        try {
                          const cloudinaryResult = await CloudinaryService.uploadFromUrl(
                            genStatus.image_url,
                            'everart-generations'
                          );
                          finalUrl = cloudinaryResult.secure_url;
                        } catch (cloudinaryError) {
                          console.warn('Cloudinary upload failed, using original URL:', cloudinaryError);
                        }
                      }

                      await storage.updateGeneration(generation.id, {
                        outputImageUrl: finalUrl,
                        cloudinaryUrl: finalUrl,
                        status: "COMPLETED"
                      });

                      allResults.push({
                        modelId,
                        modelName,
                        success: true,
                        cloudinaryUrl: finalUrl,
                        outputImageUrl: finalUrl,
                        imageUrl: finalUrl,
                        generation
                      });
                      break;
                    } else if (genStatus.status === 'FAILED') {
                      await storage.updateGeneration(generation.id, { 
                        status: "FAILED", 
                        errorMessage: "Generation failed on EverArt"
                      });
                      allResults.push({ modelId, modelName, success: false, error: "Generation failed" });
                      break;
                    }
                    
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    attempts++;
                  } catch (pollError) {
                    console.error(`Error polling generation ${genId} for model ${modelId}:`, pollError);
                    attempts++;
                    await new Promise(resolve => setTimeout(resolve, 3000));
                  }
                }
                
                if (attempts >= maxAttempts) {
                  // Timeout
                  console.log(`Generation ${genId} timed out after ${maxAttempts} attempts (${maxAttempts * 3} seconds)`);
                  await storage.updateGeneration(generation.id, { 
                    status: "FAILED", 
                    errorMessage: `Generování trvá příliš dlouho (více než ${Math.floor(maxAttempts * 3 / 60)} minut). Zkuste to prosím později.`
                  });
                  allResults.push({ 
                    modelId, 
                    modelName, 
                    success: false, 
                    error: `Timeout po ${Math.floor(maxAttempts * 3 / 60)} minutách` 
                  });
                }
              }
            } else {
              // No generations returned
              const generation = await storage.createGeneration({
                modelId: modelId,
                modelName: modelName,
                inputImageUrl: uploadData.upload_url,
                status: "FAILED",
                errorMessage: "No generations returned from API",
                styleStrength: parseFloat(styleStrength),
                width: parseInt(width),
                height: parseInt(height)
              });
              allResults.push({ modelId, modelName, success: false, error: "No generations returned" });
            }
          } catch (apiError) {
            console.error(`Error generating with model ${modelId}:`, apiError);
            // Create a failed generation entry
            const failedGeneration = await storage.createGeneration({
              modelId: modelId,
              modelName: modelName,
              inputImageUrl: uploadData.upload_url,
              status: "FAILED",
              errorMessage: apiError instanceof Error ? apiError.message : 'API error',
              styleStrength: parseFloat(styleStrength),
              width: parseInt(width),
              height: parseInt(height)
            });
            allResults.push({ 
              modelId, 
              modelName,
              success: false, 
              error: apiError instanceof Error ? apiError.message : 'API error' 
            });
          }
        } catch (storageError) {
          console.error(`Error creating generation for model ${modelId}:`, storageError);
          allResults.push({ 
            modelId, 
            modelName: "Unknown Model",
            success: false, 
            error: storageError instanceof Error ? storageError.message : 'Storage error' 
          });
        }
      }

      const successfulResults = allResults.filter(r => r.success);
      
      if (successfulResults.length > 0) {
        res.json({ 
          success: true,
          results: allResults,
          message: `Úspěšně vygenerováno ${successfulResults.length}/${allResults.length} obrázků`
        });
      } else {
        res.status(500).json({
          success: false,
          results: allResults,
          message: "Žádné generování se nepodařilo"
        });
      }
      
    } catch (error: unknown) {
      console.error("Error in generation:", error);
      res.status(500).json({ 
        message: "Nepodařilo se aplikovat modely",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // 🚀 ULTIMÁTNÍ KOMPLETNÍ SYNCHRONIZACE - najde a nahraje VŠECHNO
  app.post("/api/generations/sync-cloudinary", async (req, res) => {
    try {
      console.log("=== ZAČÍNÁ KOMPLETNÍ SYNCHRONIZACE ===");
      
      // Get both database and localStorage generations
      const dbGenerations = await storage.getAllGenerations();
      const { localStorageData = [] } = req.body || {};
      
      let syncedCount = 0;
      let errors = 0;  
      let processedUrls = new Set();
      let detailedLog = [];

      console.log(`Databáze generací: ${dbGenerations.length}`);
      console.log(`LocalStorage data: ${localStorageData.length}`);

      // 1. SYNCHRONIZACE DATABÁZOVÝCH GENERACÍ
      console.log("--- Synchronizace databázových generací ---");
      for (const generation of dbGenerations) {
        if (generation.outputImageUrl && 
            !generation.outputImageUrl.includes('cloudinary.com') &&
            !processedUrls.has(generation.outputImageUrl)) {
          
          processedUrls.add(generation.outputImageUrl);
          console.log(`DB: Zpracovávám ${generation.outputImageUrl}`);
          
          try {
            if (CloudinaryService.isConfigured()) {
              const cloudinaryResult = await CloudinaryService.uploadFromUrl(
                generation.outputImageUrl,
                'everart-generations'
              );
              
              await storage.updateGeneration(generation.id, {
                outputImageUrl: cloudinaryResult.secure_url
              });
              
              syncedCount++;
              detailedLog.push(`✓ DB gen ${generation.id}: ${cloudinaryResult.secure_url}`);
              console.log(`✓ DB generace ${generation.id} synchronizována`);
            }
          } catch (syncError) {
            errors++;
            detailedLog.push(`✗ DB gen ${generation.id}: ${syncError.message}`);
            console.error(`✗ Chyba pri synchronizaci DB generace ${generation.id}:`, syncError);
          }
        }
      }

      // 2. SYNCHRONIZACE LOCALSTORAGE DAT (včetně apply_model_state) 
      console.log("--- Synchronizace localStorage dat ---");
      for (const localData of localStorageData) {
        if (localData.outputImageUrl && 
            !localData.outputImageUrl.includes('cloudinary.com') &&
            !processedUrls.has(localData.outputImageUrl)) {
          
          processedUrls.add(localData.outputImageUrl);
          console.log(`LocalStorage: Zpracovávám ${localData.outputImageUrl}`);
          
          try {
            if (CloudinaryService.isConfigured()) {
              const cloudinaryResult = await CloudinaryService.uploadFromUrl(
                localData.outputImageUrl,
                'everart-generations'
              );
              
              // Vytvoř novou databázovou položku pro localStorage data
              const newGeneration = await storage.createGeneration({
                modelId: localData.modelId || '',
                inputImageUrl: localData.inputImageUrl || '',
                status: 'COMPLETED',
                styleStrength: localData.styleStrength || 0.7,
                width: localData.width || 1024,
                height: localData.height || 1024,
                outputImageUrl: cloudinaryResult.secure_url
              });
              
              syncedCount++;
              detailedLog.push(`✓ LocalStorage: ${cloudinaryResult.secure_url}`);
              console.log(`✓ LocalStorage obrázek synchronizován jako generace ${newGeneration.id}`);
            }
          } catch (syncError) {
            errors++;
            detailedLog.push(`✗ LocalStorage: ${syncError.message}`);
            console.error(`✗ Chyba při synchronizaci localStorage dat:`, syncError);
          }
        }
      }

      console.log("=== SYNCHRONIZACE DOKONČENA ===");
      console.log(`Celkem synchronizováno: ${syncedCount}`);
      console.log(`Chyby: ${errors}`);
      console.log(`Zpracované URL: ${processedUrls.size}`);

      res.json({ 
        success: true, 
        synced: syncedCount, 
        errors: errors,
        totalProcessed: processedUrls.size,
        detailedLog: detailedLog,
        message: `KOMPLETNÍ SYNCHRONIZACE: ${syncedCount} obrázků nahráno, ${errors} chyb, ${processedUrls.size} unikátních URL`
      });
    } catch (error: any) {
      console.error("Kritická chyba při kompletní synchronizaci:", error);
      res.status(500).json({ message: "Kritická chyba při kompletní synchronizaci", error: error.message });
    }
  });

  // 🎯 MANUÁLNÍ TRIGGER - Vynucená synchronizace vašich skutečných dat
  app.post("/api/force-sync-user-data", async (req, res) => {
    try {
      console.log("🚀 SPOUŠTÍM MANUÁLNÍ SYNCHRONIZACI VAŠICH DAT");
      
      // Načti skutečná data z apply_model_state localStorage (pokud jsou poslána)
      const { applyModelState, everartGenerations } = req.body;
      
      let allUserData = [];
      let syncedCount = 0;
      let errors = 0;
      
      // Zpracuj apply_model_state data
      if (applyModelState && applyModelState.instances) {
        console.log(`🔍 Našel jsem ${applyModelState.instances.length} instancí v apply_model_state`);
        
        applyModelState.instances.forEach((instance, idx) => {
          if (instance.results && Array.isArray(instance.results)) {
            instance.results.forEach((result, resultIdx) => {
              if (result.resultUrl && !result.resultUrl.includes('cloudinary.com')) {
                allUserData.push({
                  id: `user-apply-${idx}-${resultIdx}`,
                  outputImageUrl: result.resultUrl,
                  inputImageUrl: result.originalUrl || '',
                  modelId: instance.selectedModel?.everartId || 'unknown',
                  source: 'apply_model_state'
                });
              }
            });
          }
        });
      }
      
      // Zpracuj everart_generations data
      if (everartGenerations && Array.isArray(everartGenerations)) {
        console.log(`🔍 Našel jsem ${everartGenerations.length} generací v everart_generations`);
        everartGenerations.forEach((gen, idx) => {
          if (gen.outputImageUrl && !gen.outputImageUrl.includes('cloudinary.com')) {
            allUserData.push({
              id: `user-gen-${idx}`,
              outputImageUrl: gen.outputImageUrl,
              inputImageUrl: gen.inputImageUrl || '',
              modelId: gen.modelId || 'unknown',
              source: 'everart_generations'
            });
          }
        });
      }
      
      console.log(`📊 CELKEM NALEZENO: ${allUserData.length} vašich obrázků k synchronizaci`);
      
      // Synchronizuj všechny nalezené obrázky
      for (const userData of allUserData) {
        try {
          console.log(`🔄 Syncing ${userData.source}: ${userData.outputImageUrl}`);
          
          if (CloudinaryService.isConfigured()) {
            const cloudinaryResult = await CloudinaryService.uploadFromUrl(
              userData.outputImageUrl,
              'everart-generations'
            );
            
            // Vytvoř databázový záznam
            await storage.createGeneration({
              modelId: userData.modelId,
              inputImageUrl: userData.inputImageUrl,
              status: 'COMPLETED',
              styleStrength: 0.7,
              width: 1024,
              height: 1024,
              outputImageUrl: cloudinaryResult.secure_url
            });
            
            syncedCount++;
            console.log(`✅ ${userData.source} obrázek synchronizován: ${cloudinaryResult.secure_url}`);
          }
        } catch (syncError) {
          errors++;
          console.error(`❌ Chyba při synchronizaci ${userData.source}:`, syncError);
        }
      }
      
      console.log(`🎉 MANUÁLNÍ SYNCHRONIZACE DOKONČENA: ${syncedCount} úspěch, ${errors} chyb`);
      
      res.json({
        success: true,
        synced: syncedCount,
        errors: errors,
        totalFound: allUserData.length,
        message: `Vaše data: ${syncedCount} obrázků nahráno do Cloudinary, ${errors} chyb ze ${allUserData.length} nalezených`
      });
      
    } catch (error: any) {
      console.error("💥 Kritická chyba v manuální synchronizaci:", error);
      res.status(500).json({ message: "Manuální synchronizace selhala", error: error.message });
    }
  });

  // Delete model (only from local storage, NOT from EverArt)
  app.delete("/api/models/:everartId", async (req, res) => {
    try {
      const { everartId } = req.params;
      
      // Check if model exists first
      const existingModel = await storage.getModelByEverartId(everartId);
      if (!existingModel) {
        return res.status(404).json({ success: false, message: "Model nenalezen" });
      }
      
      // Only delete from local storage, NOT from EverArt API
      const deleted = await storage.deleteModel(everartId);
      if (deleted) {
        console.log(`Model ${everartId} removed from local storage only`);
        res.json({ success: true, message: "Model odebrán z aplikace" });
      } else {
        res.status(500).json({ success: false, message: "Nepodařilo se odebrat model" });
      }
    } catch (error) {
      console.error("Error deleting model:", error);
      res.status(500).json({ success: false, message: "Nepodařilo se odebrat model" });
    }
  });

  // Multi-model generation - apply multiple models to same image
  app.post("/api/models/multi-apply", upload.single('image'), async (req, res) => {
    try {
      const { modelIds, styleStrength = 0.6, width = 512, height = 512 } = req.body;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "Žádný obrázek nebyl nahrán" });
      }

      if (!modelIds || !Array.isArray(JSON.parse(modelIds))) {
        return res.status(400).json({ message: "Žádné modely nebyly vybrány" });
      }

      const selectedModelIds = JSON.parse(modelIds);
      console.log("Multi-model generation for:", selectedModelIds);

      // Upload input image once
      const filename = file.originalname;
      const contentType = file.mimetype;
      
      const uploadResponse = await apiClient.post("/images/uploads", {
        images: [{ filename, content_type: contentType }]
      });
      
      const uploadData = uploadResponse.data.image_uploads[0];
      await axios.put(uploadData.upload_url, file.buffer, {
        headers: { "Content-Type": contentType }
      });

      // Process each model concurrently
      const allResults = [];
      const generationPromises = selectedModelIds.map(async (modelId: string) => {
        try {
          // Create generation locally for each model
          const generation = await storage.createGeneration({
            modelId: modelId,
            inputImageUrl: uploadData.upload_url,
            status: "PROCESSING",
            styleStrength: parseFloat(styleStrength),
            width: parseInt(width),
            height: parseInt(height)
          });

          // Generate with EverArt
          const generationPayload = {
            prompt: " ",
            type: "img2img", 
            image: uploadData.file_url,
            image_count: 1,
            width: parseInt(width),
            height: parseInt(height),
            style_strength: parseFloat(styleStrength)
          };

          const generationResponse = await apiClient.post(`/models/${modelId}/generations`, generationPayload);
          const generations = generationResponse.data.generations || [];

          if (generations.length > 0) {
            // Poll for completion
            const maxAttempts = 60;
            let attempts = 0;
            
            while (attempts < maxAttempts) {
              try {
                const statusResponse = await apiClient.get(`/generations/${generations[0].id}`);
                const genStatus = statusResponse.data.generation;
                
                if (genStatus.status === 'SUCCEEDED' && genStatus.image_url) {
                  // Upload to Cloudinary if configured
                  let finalUrl = genStatus.image_url;
                  
                  if (CloudinaryService.isConfigured()) {
                    try {
                      const cloudinaryResult = await CloudinaryService.uploadFromUrl(
                        genStatus.image_url,
                        'everart-generations'
                      );
                      finalUrl = cloudinaryResult.secure_url;
                    } catch (cloudinaryError) {
                      console.warn('Failed to upload to Cloudinary:', cloudinaryError);
                    }
                  }

                  await storage.updateGeneration(generation.id, {
                    outputImageUrl: finalUrl,
                    status: "COMPLETED"
                  });

                  return {
                    modelId,
                    success: true,
                    resultUrl: finalUrl,
                    generation
                  };
                } else if (genStatus.status === 'FAILED') {
                  await storage.updateGeneration(generation.id, { status: "FAILED" });
                  return { modelId, success: false, error: "Generation failed" };
                }
                
                await new Promise(resolve => setTimeout(resolve, 3000));
                attempts++;
              } catch (pollError) {
                console.error(`Error polling generation for model ${modelId}:`, pollError);
                attempts++;
                await new Promise(resolve => setTimeout(resolve, 3000));
              }
            }
            
            // Timeout
            await storage.updateGeneration(generation.id, { status: "FAILED" });
            return { modelId, success: false, error: "Timeout" };
          } else {
            await storage.updateGeneration(generation.id, { status: "FAILED" });
            return { modelId, success: false, error: "No generations returned" };
          }
        } catch (error: unknown) {
          console.error(`Error processing model ${modelId}:`, error);
          return { modelId, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      });

      // Wait for all generations to complete
      const results = await Promise.all(generationPromises);
      
      res.json({ 
        success: true,
        results: results,
        message: `Zpracováno ${results.filter(r => r.success).length}/${results.length} modelů`
      });
      
    } catch (error: unknown) {
      console.error("Error in multi-model generation:", error);
      res.status(500).json({ 
        message: "Nepodařilo se aplikovat modely",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Delete generation
  app.delete("/api/generations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteGeneration(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting generation:", error);
      res.status(500).json({ message: "Nelze smazat generování" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
