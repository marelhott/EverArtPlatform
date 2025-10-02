const EVERART_API_KEY = process.env.EVERART_API_KEY || "everart-Ec0-3NNDOk-RiqRq1n574d-grIX2izOUjlCZSGEy9cQ";
const BASE_URL = "https://api.everart.ai/v1";

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Mock data for testing
    const mockModels = [
      {
        id: "model_1",
        name: "Test Model 1",
        subject: "STYLE",
        status: "READY",
        thumbnail_url: "https://example.com/thumb1.jpg"
      },
      {
        id: "model_2", 
        name: "Test Model 2",
        subject: "STYLE",
        status: "READY",
        thumbnail_url: "https://example.com/thumb2.jpg"
      }
    ];
    
    res.status(200).json({
      success: true,
      models: mockModels,
      count: mockModels.length,
      source: 'mock-data-js',
      api_key_configured: !!EVERART_API_KEY,
      base_url: BASE_URL
    });

  } catch (error) {
    console.error('Models endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to process models request',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}