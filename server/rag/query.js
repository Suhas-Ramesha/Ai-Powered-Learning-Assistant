import RAGService from './ragService.js';

const ragService = new RAGService();

export async function queryDocument(query, docId, conversationHistory = []) {
  try {
    console.log(`Querying document ${docId} with: "${query}"`);
    
    const result = await ragService.chatWithDocument(query, docId, conversationHistory);
    
    if (result.success) {
      console.log(`✅ Generated response for query in doc ${docId}`);
    } else {
      console.error(`❌ Failed to query doc ${docId}: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error querying document ${docId}:`, error);
    return {
      success: false,
      error: error.message,
      docId: docId
    };
  }
}

export default queryDocument;