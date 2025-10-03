import { Handler } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

interface Generation {
  id: string;
  outputImageUrl: string;
  inputImageUrl?: string;
  modelId: string;
  modelName?: string;
  createdAt: string;
}

export const handler: Handler = async (event, context) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== "DELETE") {
    return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
  }

  try {
    // Extrakce generationId z path parametru
    const pathParts = event.path.split("/");
    const generationId = pathParts[pathParts.length - 1];

    if (!generationId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Generation ID je vyžadováno" }),
      };
    }

    // Připojení k Blob Store
    const store = getStore({
      name: "everart-generations",
      siteID: context.site?.id,
      token: process.env.NETLIFY_TOKEN || process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Načíst existující generace
    const existingGenerations = await store.get("all-generations", { type: "json" }) as Generation[] | null;

    if (!existingGenerations || existingGenerations.length === 0) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Generation not found" }),
      };
    }

    // Odfiltrovat smazanou generaci
    const filtered = existingGenerations.filter(gen => gen.id !== generationId);

    if (filtered.length === existingGenerations.length) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Generation not found" }),
      };
    }

    // Uložit zpět
    await store.setJSON("all-generations", filtered);

    console.log(`🗑️ Deleted generation ${generationId}, remaining: ${filtered.length}`);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: "Generation successfully deleted",
        remaining: filtered.length,
      }),
    };
  } catch (error: any) {
    console.error("Error deleting from Blob Storage:", error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        message: "Chyba při mazání z Blob Storage",
        error: error?.message || "Unknown error",
      }),
    };
  }
};

export default handler;

