const EVERART_API_KEY = process.env.EVERART_API_KEY || "everart-Ec0-3NNDOk-RiqRq1n574d-grIX2izOUjlCZSGEy9cQ";
const BASE_URL = "https://api.everart.ai/v1";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Use native fetch instead of axios
    const response = await fetch(`${BASE_URL}/models`, {
      method: 'GET',
      headers: {
        "Authorization": `Bearer ${EVERART_API_KEY}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const everartModels = data.data || [];
    
    res.status(200).json({
      success: true,
      models: everartModels,
      count: everartModels.length,
      source: 'everart-api-fetch'
    });

  } catch (error) {
    console.error('Models fetch endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch models from API',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}