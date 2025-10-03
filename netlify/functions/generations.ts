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
      // POST - multipart upload pro generování s více modely
      // Prozatím vrátíme informaci že to vyžaduje další konfiguraci
      return {
        statusCode: 501,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ 
          success: false,
          message: "Generování s multipart uploadem vyžaduje další konfiguraci na Netlify",
          note: "Pro plnou funkčnost použijte base64 upload nebo externí storage"
        }),
      };
    } catch (error: any) {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ 
          success: false,
          message: "Chyba při generování", 
          error: error?.message || "Unknown error" 
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
