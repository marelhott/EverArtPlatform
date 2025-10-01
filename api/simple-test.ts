export default async function handler(req: any, res: any) {
  try {
    // Test basic imports
    const express = await import('express');
    
    res.status(200).json({
      message: 'Basic imports working',
      express: !!express,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Import failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}