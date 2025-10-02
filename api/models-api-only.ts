import axios from 'axios';

const EVERART_API_KEY = process.env.EVERART_API_KEY || "everart-Ec0-3NNDOk-RiqRq1n574d-grIX2izOUjlCZSGEy9cQ";
const BASE_URL = "https://api.everart.ai/v1";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Fetch models from EverArt API only
    const response = await axios.get(`${BASE_URL}/models`, {
      headers: {
        "Authorization": `Bearer ${EVERART_API_KEY}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    const everartModels = response.data.data || [];
    
    res.status(200).json({
      success: true,
      models: everartModels,
      count: everartModels.length,
      source: 'everart-api-only'
    });

  } catch (error) {
    console.error('Models API endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch models from API',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error && 'response' in error ? (error as any).response?.data : null
    });
  }
}