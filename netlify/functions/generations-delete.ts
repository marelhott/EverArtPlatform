import { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {
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
        body: JSON.stringify({ message: "Generation ID je vyžadováno" }),
      };
    }

    // Smazání generace - prozatím jen potvrzení (bez persistence layer)
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: true,
        message: "Generace smazána (lokální storage, bez DB)"
      }),
    };

  } catch (error: any) {
    console.error("Chyba při mazání generace:", error?.message || error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: "Nepodařilo se smazat generaci", 
        error: error?.message || "Unknown error" 
      }),
    };
  }
};

export default handler;

