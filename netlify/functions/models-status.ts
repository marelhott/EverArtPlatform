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

    const apiClient = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const response = await apiClient.get(`/models/${modelId}`);
    const model = response.data.model;

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        status: model.status, 
        thumbnailUrl: model.thumbnail_url 
      }),
    };

  } catch (error: any) {
    console.error("Chyba při načítání stavu modelu:", error?.message || error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: "Nelze načíst stav modelu", 
        error: error?.message || "Unknown error" 
      }),
    };
  }
};

export default handler;

