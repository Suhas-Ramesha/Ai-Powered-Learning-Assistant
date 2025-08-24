import { db } from '../../server/firebaseAdmin';
import { processDocument } from '../../server/rag/ingest';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { uid, filename } = req.body;

    if (!uid || !filename) {
      return res.status(400).json({ error: 'Missing uid or filename' });
    }

    const doc_id = filename.replace(/ /g, '_');

    // Call NLP ingestion (process_document function)
    const file_path = `notes/${uid}/${filename}`;
    const processResult = await processDocument(file_path, doc_id);

    if (!processResult.success) {
      return res.status(500).json({ error: processResult.error });
    }

    // Save metadata in Firestore
    await db.collection('users').doc(uid).collection('documents').doc(doc_id).set({
      filename: filename,
      uploadedAt: new Date(),
      status: 'ready',
      docId: doc_id
    });

    return res.status(200).json({
      message: 'File processed',
      docId: doc_id,
      processResult
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}
