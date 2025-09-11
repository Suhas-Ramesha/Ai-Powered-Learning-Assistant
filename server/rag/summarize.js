import RAGService from './ragService.js';

const ragService = new RAGService();

export async function summarizeNotes(notes, docId) {
  try {
    console.log(`Summarizing notes for document: ${docId}`);
    
    const result = await ragService.summarizeNotes(notes, docId);
    
    if (result.success) {
      console.log(`✅ Generated summary for doc ${docId}`);
    } else {
      console.error(`❌ Failed to summarize doc ${docId}: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error summarizing notes for doc '${docId}':`, error);
    return {
      success: false,
      error: error.message,
      docId: docId
    };
  }
}

export default summarizeNotes;
