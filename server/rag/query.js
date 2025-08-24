import axios from 'axios';

// Gemini API configuration
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function getAnswer(question, docId) {
  try {
    console.log(`Getting answer for question: "${question}" in doc: ${docId}`);
    
    // In production, this would:
    // 1. Search vector database for relevant chunks
    // 2. Retrieve top-k relevant documents
    // 3. Generate answer using Gemini
    
    const prompt = `Based on the document ${docId}, answer this question: ${question}
    
    If you don't have specific information about this document, provide a helpful general response.`;
    
    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    });
    
    const answer = response.data.candidates[0].content.parts[0].text;
    
    console.log(`Generated answer for doc ${docId}`);
    return answer;
    
  } catch (error) {
    console.error(`Error getting answer for question '${question}' in doc '${docId}':`, error);
    return `Sorry, I encountered an error while processing your question: ${error.message}`;
  }
}

export default getAnswer;
