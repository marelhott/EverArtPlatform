import { Handler } from "@netlify/functions";

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

  try {
    // Volba: zatím vracím prázdný seznam, aby se UI nezlomilo
    // V produkci sem později můžete přidat čtení z Persistence Layer (Databáze/storage).
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
};

export default handler;
