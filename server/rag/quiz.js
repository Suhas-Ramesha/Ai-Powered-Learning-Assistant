import RAGService from './ragService.js';

const ragService = new RAGService();

export async function generateQuiz(notes, docId, difficulty = 'medium', numQuestions = 5) {
  try {
    console.log(`Generating quiz for document: ${docId} (${difficulty} difficulty, ${numQuestions} questions)`);
    
    const result = await ragService.generateQuiz(notes, docId, difficulty, numQuestions);
    
    if (result.success) {
      console.log(`✅ Generated quiz for doc ${docId}`);
    } else {
      console.error(`❌ Failed to generate quiz for doc ${docId}: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error generating quiz for doc '${docId}':`, error);
    return {
      success: false,
      error: error.message,
      docId: docId
    };
  }
}

export default generateQuiz;
