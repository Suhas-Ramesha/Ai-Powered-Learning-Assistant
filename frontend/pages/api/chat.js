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
    const { uid, docId, question } = req.body;

    if (!uid || !docId || !question) {
      return res.status(400).json({ error: 'Missing uid, docId, or question' });
    }

    // TODO: Call RAG query here
    // For now, we'll simulate the RAG response
    // In a real implementation, you'd call your RAG query function
    const answer = `This is a simulated response to your question: "${question}" about document: ${docId}. In the real implementation, this would come from your RAG system.`;

    // Save conversation in Firestore
    const convoRef = db.collection('conversations').doc(`${uid}_${docId}`);
    
    // Add user message
    await convoRef.collection('messages').add({
      sender: 'user',
      text: question,
      timestamp: new Date(),
      docId: docId
    });
    
    // Add bot response
    await convoRef.collection('messages').add({
      sender: 'bot',
      text: answer,
      timestamp: new Date(),
      docId: docId
    });

    return res.status(200).json({ answer });

  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: error.message });
  }
}
