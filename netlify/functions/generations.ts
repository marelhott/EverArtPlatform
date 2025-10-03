import { Handler } from "@netlify/functions";
import axios from "axios";

const BASE_URL = "https://api.everart.ai/v1";

export const handler: Handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders };
  }

  // Podporujeme GET i POST
  if (event.httpMethod === "GET") {
    // GET - vrátit seznam generací (zatím prázdný)
    try {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ generations: [] }),
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ generations: [], message: "Selhání při načítání generací", error: error?.message || "Unknown error" }),
      };
    }
  }

  if (event.httpMethod === "POST") {
    // POST - vytvořit novou generaci
    const apiKey = process.env.EVERART_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "EverArt API klíč není nastaven" }),
      };
    }

    try {
      // POST - přijmout base64 image a parametry
      const body = JSON.parse(event.body || '{}');
      const { imageBase64, imageName, imageMimeType, modelIds, styleStrength, width, height, numImages } = body;

      if (!imageBase64 || !modelIds || !Array.isArray(modelIds) || modelIds.length === 0) {
        return {
          statusCode: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          body: JSON.stringify({ 
            success: false,
            message: "Chybí povinné parametry: imageBase64, modelIds" 
          }),
        };
      }

      const apiClient = axios.create({
        baseURL: BASE_URL,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      // 1. Upload obrázku na EverArt
      const filename = imageName || 'image.jpg';
      const contentType = imageMimeType || 'image/jpeg';

      const uploadResponse = await apiClient.post("/images/uploads", {
        images: [{ filename, content_type: contentType }]
      });

      const uploadData = uploadResponse.data.image_uploads[0];
      console.log("Upload data received:", JSON.stringify({
        upload_url: uploadData.upload_url,
        file_url: uploadData.file_url,
        upload_token: uploadData.upload_token,
      }, null, 2));
      
      // 2. Nahrát base64 na upload_url
      const imageBuffer = Buffer.from(imageBase64, 'base64');
      const putResponse = await axios.put(uploadData.upload_url, imageBuffer, {
        headers: { "Content-Type": contentType }
      });
      console.log("Image uploaded to S3, status:", putResponse.status);

      // 3. Spustit generování pro každý model
      const results = [];
      for (const modelId of modelIds) {
        try {
          const generationPayload = {
            prompt: "Apply style to this image",  // Required by API
            type: "img2img",
            image: uploadData.file_url,  // Required for img2img
            image_count: parseInt(numImages || "1"),
            width: parseInt(width || "1024"),
            height: parseInt(height || "1024"),
            // NOTE: style_strength is NOT in API docs, removed
          };

          console.log(`Starting generation for model ${modelId}:`, generationPayload);

          const genResponse = await apiClient.post(`/models/${modelId}/generations`, generationPayload);
          const generations = genResponse.data.generations || [];

          console.log(`Model ${modelId} returned ${generations.length} generations`);

          if (generations.length > 0) {
            // Vrátit všechny generationIds pro tento model
            const generationIds = generations.map((g: any) => g.id);
            results.push({
              modelId,
              success: true,
              generationIds,  // Pole všech generation IDs
              status: "PROCESSING",
              message: `Zahájeno ${generationIds.length} generování`
            });
          } else {
            results.push({
              modelId,
              success: false,
              error: "API nevrátilo žádné generování"
            });
          }
        } catch (modelError: any) {
          console.error(`Error for model ${modelId}:`, modelError?.response?.data || modelError?.message);
          results.push({
            modelId,
            success: false,
            error: modelError?.response?.data?.message || modelError?.message || "Chyba při generování"
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        statusCode: successCount > 0 ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ 
          success: successCount > 0,
          results,
          message: `Úspěšně zahájeno generování pro ${successCount}/${modelIds.length} modelů. Použijte generationIds pro kontrolu statusu.`,
          note: "Generování běží asynchronně. Kontrolujte status pomocí GET /api/generations/:id/status"
        }),
      };

    } catch (error: any) {
      console.error("Chyba při generování:", error?.response?.data || error?.message || error);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ 
          success: false,
          message: "Chyba při generování", 
          error: error?.response?.data || error?.message || "Unknown error" 
        }),
      };
    }
  }

  // Neznámá metoda
  return { 
    statusCode: 405, 
    headers: corsHeaders, 
    body: "Method Not Allowed" 
  };
};

export default handler;
