import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Mock data pro testování
    const models = [
      {
        id: 'flux-schnell',
        name: 'FLUX.1 Schnell',
        provider: 'black-forest-labs',
        type: 'image',
        status: 'active'
      },
      {
        id: 'flux-dev',
        name: 'FLUX.1 Dev',
        provider: 'black-forest-labs',
        type: 'image',
        status: 'active'
      }
    ];

    return res.status(200).json({ 
      models,
      count: models.length,
      source: 'vercel-serverless',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Models endpoint error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}