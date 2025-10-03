import { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

interface Generation {
  id: string;
  outputImageUrl: string;
  inputImageUrl?: string;
  modelId: string;
  modelName?: string;
  createdAt: string;
  width?: number;
  height?: number;
  styleStrength?: number;
}

export const handler: Handler = async (event, context) => {
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

  try {
    // Připojení k Blob Store
    const store = getStore({
      name: "everart-generations",
      siteID: context.site?.id,
      token: process.env.NETLIFY_TOKEN || process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Načíst všechny generace
    const generations = await store.get("all-generations", { type: "json" }) as Generation[] | null;

    // Query parametry pro stránkování (volitelné)
    const params = event.queryStringParameters || {};
    const limit = params.limit ? parseInt(params.limit) : undefined;
    const offset = params.offset ? parseInt(params.offset) : 0;

    let result = generations || [];
    const total = result.length;

    // Aplikovat stránkování pokud je specifikováno
    if (limit) {
      result = result.slice(offset, offset + limit);
    }

    console.log(`📋 Retrieved ${result.length} generations (total: ${total})`);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        generations: result,
        total,
        offset,
        limit: limit || total,
      }),
    };
  } catch (error: any) {
    console.error("Error reading from Blob Storage:", error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        message: "Chyba při načítání z Blob Storage",
        error: error?.message || "Unknown error",
        generations: [],
        total: 0,
      }),
    };
  }
};

export default handler;

