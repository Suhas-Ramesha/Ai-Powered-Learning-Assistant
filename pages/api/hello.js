export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({ 
    message: 'Hello World from Vercel!',
    timestamp: new Date().toISOString(),
    status: 'success'
  });
}
