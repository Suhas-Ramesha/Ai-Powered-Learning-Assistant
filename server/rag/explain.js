import RAGService from './ragService.js';

const ragService = new RAGService();

export async function explainConcept(concept, context, docId) {
  try {
    console.log(`Explaining concept: "${concept}" for document: ${docId}`);
    
    const result = await ragService.explainConcept(concept, docId);
    
    if (result.success) {
      console.log(`✅ Generated explanation for concept '${concept}' in doc ${docId}`);
    } else {
      console.error(`❌ Failed to explain concept '${concept}' for doc ${docId}: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error explaining concept '${concept}' for doc '${docId}':`, error);
    return {
      success: false,
      error: error.message,
      concept: concept,
      docId: docId
    };
  }
}

export default explainConcept;
