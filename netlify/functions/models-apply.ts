import { Handler } from "@netlify/functions";
import axios from "axios";
import FormData from "form-data";

const BASE_URL = "https://api.everart.ai/v1";

export const handler: Handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
  }

  const apiKey = process.env.EVERART_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "EverArt API klíč není nastaven" }),
    };
  }

  try {
    // Extrakce modelId z path parametru
    const pathParts = event.path.split("/");
    const modelIdIndex = pathParts.indexOf("models") + 1;
    const modelId = pathParts[modelIdIndex];

    if (!modelId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Model ID je vyžadováno" }),
      };
    }

    // Parse multipart/form-data z body
    // Pro serverless je jednodušší přijmout base64 encoded data nebo JSON s URL
    // Prozatím vrátím placeholder odpověď, aby UI vidělo že endpoint funguje
    
    const apiClient = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    // Placeholder - v produkci zde zpracujeme multipart upload
    // Pro nyní vrátíme error s informací o tom, že funkce existuje
    return {
      statusCode: 501,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: "Model apply endpoint je připraven, ale zpracování multipart uploadu vyžaduje další konfiguraci na Netlify",
        modelId,
        note: "Pro plnou funkčnost je nutné použít Netlify Blob Storage nebo externí storage pro upload souborů"
      }),
    };

  } catch (error: any) {
    console.error("Chyba v models-apply function:", error?.message || error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: "Nepodařilo se aplikovat model", 
        error: error?.message || "Unknown error" 
      }),
    };
  }
};

export default handler;

