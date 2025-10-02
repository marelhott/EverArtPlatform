export default async function handler(req: any, res: any) {
  try {
    // Test základních importů
    const testData = {
      message: "Test endpoint funguje",
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        hasEverartKey: !!process.env.EVERART_API_KEY,
        hasDatabaseUrl: !!process.env.DATABASE_URL
      }
    };

    res.status(200).json(testData);
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ 
      error: 'Test endpoint failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}