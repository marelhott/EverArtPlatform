import { Handler } from "@netlify/functions";
import axios from "axios";

const BASE_URL = "https://api.everart.ai/v1";

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    };
  }

  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.EVERART_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "EverArt API klíč není nastaven", models: [] }),
    };
  }

  try {
    const client = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const response = await client.get("/models");
    const everartModels = response.data.data || response.data.models || [];

    const mapped = everartModels.map((m: any) => ({
      id: m.id,
      everartId: m.id,
      name: m.name,
      subject: m.subject || m.type || "STYLE",
      status: m.status || "READY",
      thumbnailUrl: m.thumbnail_url,
      createdAt: m.created_at || m.createdAt || new Date().toISOString(),
    }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ models: mapped, source: "everart-api-direct", count: mapped.length }),
    };
  } catch (error: any) {
    console.error("Error in Netlify models function:", error?.response?.data || error?.message || error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Nelze načíst modely", error: error?.message || "Unknown error" }),
    };
  }
};

export default handler;

