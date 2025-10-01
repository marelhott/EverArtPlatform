export default async function handler(req: any, res: any) {
  try {
    // Test database connection
    const { Pool } = await import('@neondatabase/serverless');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Simple query test
    const result = await pool.query('SELECT 1 as test');
    
    res.status(200).json({
      message: 'Database connection successful',
      result: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database connection failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}