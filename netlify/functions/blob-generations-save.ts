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
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
  }

  try {
    const generations: Generation[] = JSON.parse(event.body || "[]");

    if (!Array.isArray(generations) || generations.length === 0) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ success: false, message: "Invalid generations data" }),
      };
    }

    // Připojení k Blob Store
    const store = getStore({
      name: "everart-generations",
      siteID: context.site?.id,
      token: process.env.NETLIFY_TOKEN || process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Načíst existující generace
    const existingData = await store.get("all-generations", { type: "json" }) as Generation[] | null;
    const existingGenerations = existingData || [];

    // Přidat nové generace na začátek (nejnovější první)
    const newGenerations = [...generations, ...existingGenerations];

    // Odstranit duplicity podle ID
    const uniqueGenerations = Array.from(
      new Map(newGenerations.map(gen => [gen.id, gen])).values()
    );

    // Seřadit podle data (nejnovější první)
    uniqueGenerations.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Uložit zpět do Blob Storage
    await store.setJSON("all-generations", uniqueGenerations);

    console.log(`✅ Saved ${generations.length} new generations, total: ${uniqueGenerations.length}`);

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        saved: generations.length,
        total: uniqueGenerations.length,
        message: `Úspěšně uloženo ${generations.length} generací`,
      }),
    };
  } catch (error: any) {
    console.error("Error saving to Blob Storage:", error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: false,
        message: "Chyba při ukládání do Blob Storage",
        error: error?.message || "Unknown error",
      }),
    };
  }
};

export default handler;

