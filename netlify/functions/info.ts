import { Handler } from "@netlify/functions";

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

  const everartConfigured = !!process.env.EVERART_API_KEY;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET),
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? "Set" : "Not set",
        apiKey: process.env.CLOUDINARY_API_KEY ? "Set" : "Not set",
        apiSecret: process.env.CLOUDINARY_API_SECRET ? "Set" : "Not set",
      },
      everart: {
        configured: everartConfigured,
        key: everartConfigured ? "Set" : "Not set",
      },
    }),
  };
};

export default handler;

