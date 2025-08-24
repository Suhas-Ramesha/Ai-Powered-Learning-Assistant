import { db } from '../../server/firebaseAdmin';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '3600');
    return res.status(204).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const { uid, filename } = req.body;

    if (!uid || !filename) {
      return res.status(400).json({ error: 'Missing uid or filename' });
    }

    const doc_id = filename.replace(/ /g, '_');

    // TODO: Call RAG ingestion here
    // For now, we'll simulate the process
    // In a real implementation, you'd call your RAG processing function
    console.log(`Processing document: ${filename} for user: ${uid}`);

    // Save metadata in Firestore
    await db.collection('users').doc(uid).collection('documents').doc(doc_id).set({
      filename: filename,
      uploadedAt: new Date(),
      status: 'ready',
      docId: doc_id
    });

    return res.status(200).json({
      message: 'File processed',
      docId: doc_id
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}
