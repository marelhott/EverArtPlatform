export default async function handler(req: any, res: any) {
  try {
    // Test storage import
    const { storage } = await import('../server/storage');
    
    // Test getting models from storage
    const models = await storage.getAllModels();
    
    res.status(200).json({
      message: 'Models endpoint test successful',
      models: models,
      count: models.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Models test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}