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

    // Smazání modelu z lokální aplikace (ne z EverArt API)
    // Prozatím jen potvrzení (bez persistence layer)
    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: true,
        message: "Model odebrán z aplikace (lokální storage, model zůstává v EverArt)"
      }),
    };

  } catch (error: any) {
    console.error("Chyba při mazání modelu:", error?.message || error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: false,
        message: "Nepodařilo se odebrat model", 
        error: error?.message || "Unknown error" 
      }),
    };
  }
};

export default handler;

