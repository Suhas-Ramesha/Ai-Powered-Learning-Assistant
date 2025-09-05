export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, conversationId, selectedDocumentId } = req.body || {};
    if (!text || !conversationId) {
      return res.status(400).json({ error: 'Missing text or conversationId' });
    }
    const baseUrl = process.env.NEXT_PUBLIC_FUNCTIONS_BASE_URL;
    if (!baseUrl) {
      return res.status(500).json({ error: 'NEXT_PUBLIC_FUNCTIONS_BASE_URL not set' });
    }
    const response = await fetch(`${baseUrl}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, conversationId, selectedDocumentId }),
    });
    const data = await response.json();
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}


