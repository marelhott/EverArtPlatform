import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  try {
    // CORS headers
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };
    
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: ''
      };
    }

    if (event.httpMethod !== 'GET') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
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
      },
      {
        id: 'stable-diffusion-xl',
        name: 'Stable Diffusion XL',
        provider: 'stability-ai',
        type: 'image',
        status: 'active'
      }
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        models,
        count: models.length,
        source: 'netlify-functions',
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Models endpoint error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};