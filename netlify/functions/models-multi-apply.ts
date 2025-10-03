import { Handler } from "@netlify/functions";

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
    // Multi-model apply - aplikace více modelů na jeden obrázek
    // Prozatím vrátíme placeholder odpověď
    return {
      statusCode: 501,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: false,
        message: "Multi-model apply vyžaduje multipart upload konfiguraci na Netlify",
        note: "Pro plnou funkčnost použijte base64 upload nebo externí storage"
      }),
    };

  } catch (error: any) {
    console.error("Chyba v models-multi-apply function:", error?.message || error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: false,
        message: "Nepodařilo se aplikovat modely", 
        error: error?.message || "Unknown error" 
      }),
    };
  }
};

export default handler;

