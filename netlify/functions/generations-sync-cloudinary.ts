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

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const localStorageData: Array<any> = body.localStorageData || [];

    // V této serverless verzi pouze potvrzujeme přijetí a vracíme souhrn
    // (volitelné Cloudinary nahrávání lze doplnit později přes API klíče).
    const totalProcessed = localStorageData.length;

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        synced: 0,
        errors: 0,
        totalProcessed,
        detailedLog: [],
        message: `Přijato ${totalProcessed} položek k synchronizaci (Cloudinary není na Netlify funkci aktivní).`,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ success: false, message: "Sync selhala", error: error?.message || "Unknown error" }),
    };
  }
};

export default handler;

