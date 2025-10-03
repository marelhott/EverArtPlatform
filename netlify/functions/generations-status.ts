import { Handler } from "@netlify/functions";
import axios from "axios";

const BASE_URL = "https://api.everart.ai/v1";

export const handler: Handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== "GET") {
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
    // Extrakce generationId z path parametru
    const pathParts = event.path.split("/");
    const generationId = pathParts[pathParts.length - 2]; // .../:generationId/status

    if (!generationId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Generation ID je vyžadováno" }),
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

    // Kontrola statusu generace na EverArt API
    const response = await apiClient.get(`/generations/${generationId}`);
    const generation = response.data.generation;

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        id: generation.id,
        status: generation.status,
        imageUrl: generation.image_url,
        progress: generation.progress,
        createdAt: generation.created_at,
      }),
    };

  } catch (error: any) {
    console.error("Chyba při načítání statusu generace:", error?.response?.data || error?.message || error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: "Nelze načíst status generace", 
        error: error?.response?.data || error?.message || "Unknown error" 
      }),
    };
  }
};

export default handler;

