import { db } from '../../server/firebaseAdmin';
import { getAnswer } from '../../server/rag/query';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uid, docId, question } = req.body;

    if (!uid || !docId || !question) {
      return res.status(400).json({ error: 'Missing uid, docId, or question' });
    }

    // Call NLP RAG query (get_answer function)
    const answer = await getAnswer(question, docId);

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
