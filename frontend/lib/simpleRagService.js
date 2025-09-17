import { GoogleGenerativeAI } from '@google/generative-ai';

class SimpleRAGService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    
    // In-memory storage for document chunks (for demo purposes)
    // In production, you'd use a proper vector database
    this.documentStore = new Map();
    this.vectorStore = new Map();
  }

  // Simple text chunking function
  chunkText(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let start = 0;
    
    while (start < text.length) {
      let end = start + chunkSize;
      
      // Try to break at sentence boundary
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        
        if (breakPoint > start + chunkSize * 0.5) {
          end = breakPoint + 1;
        }
      }
      
      const chunk = text.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push({
          text: chunk,
          start: start,
          end: end
        });
      }
      
      start = end - overlap;
    }
    
    return chunks;
  }

  // Simple similarity scoring (based on keyword overlap)
  calculateSimilarity(query, text) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const textWords = text.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const word of queryWords) {
      if (textWords.some(textWord => textWord.includes(word) || word.includes(textWord))) {
        matches++;
      }
    }
    
    return matches / Math.max(queryWords.length, 1);
  }

  // Ingest a document
  async ingestDocument(docId, text, metadata = {}) {
    try {
      console.log(`📚 Ingesting document ${docId}...`);
      
      // Store the full document
      this.documentStore.set(docId, {
        text: text,
        metadata: metadata,
        timestamp: new Date()
      });
      
      // Create chunks
      const chunks = this.chunkText(text);
      console.log(`📄 Created ${chunks.length} chunks for document ${docId}`);
      
      // Store chunks with simple indexing
      this.vectorStore.set(docId, chunks.map((chunk, index) => ({
        ...chunk,
        id: `${docId}_chunk_${index}`,
        docId: docId
      })));
      
      return {
        success: true,
        docId: docId,
        chunksCreated: chunks.length
      };
    } catch (error) {
      console.error(`❌ Error ingesting document ${docId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Retrieve relevant chunks for a query
  retrieveRelevantChunks(query, docId, topK = 3) {
    const chunks = this.vectorStore.get(docId);
    if (!chunks) {
      return [];
    }

    // Calculate similarity scores
    const scoredChunks = chunks.map(chunk => ({
      ...chunk,
      score: this.calculateSimilarity(query, chunk.text)
    }));

    // Sort by score and return top K
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(chunk => chunk.score > 0); // Only return chunks with some relevance
  }

  // Chat with document
  async chatWithDocument(question, docId, conversationHistory = []) {
    try {
      console.log(`💬 Processing chat question for document ${docId}`);
      
      // Retrieve relevant context
      const relevantChunks = this.retrieveRelevantChunks(question, docId, 5);
      
      if (relevantChunks.length === 0) {
        // If no relevant chunks found, use the full document (truncated)
        const doc = this.documentStore.get(docId);
        if (!doc) {
          return {
            success: false,
            error: "Document not found"
          };
        }
        
        const truncatedText = doc.text.substring(0, 3000);
        relevantChunks.push({
          text: truncatedText,
          score: 0.1
        });
      }

      const context = relevantChunks.map(chunk => chunk.text).join('\n\n');
      
      // Build conversation history context
      let conversationContext = '';
      if (conversationHistory.length > 0) {
        const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
        conversationContext = '\n\nPrevious conversation:\n' + 
          recentHistory.map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`).join('\n');
      }

      // Create prompt
      const prompt = `You are a helpful AI assistant that answers questions based on the provided document context. Use the context below to answer the user's question. If the answer isn't in the context, say so politely.

Context from document:
${context}${conversationContext}

User question: ${question}

Please provide a helpful and accurate answer based on the context provided:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const answer = response.text();

      return {
        success: true,
        answer: answer,
        context: relevantChunks.map(chunk => ({
          text: chunk.text.substring(0, 200) + '...',
          score: chunk.score
        }))
      };

    } catch (error) {
      console.error(`❌ Error in chat with document ${docId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Summarize document/text
  async summarizeNotes(text, docId) {
    try {
      console.log(`📝 Generating summary for document ${docId}`);
      
      // Get document content
      let contentToSummarize = text;
      if (docId && this.documentStore.has(docId)) {
        contentToSummarize = this.documentStore.get(docId).text;
      }

      // Truncate if too long
      if (contentToSummarize.length > 8000) {
        contentToSummarize = contentToSummarize.substring(0, 8000) + '...';
      }

      const prompt = `Please provide a comprehensive summary of the following document. Include:
1. Main topics and key concepts
2. Important details and facts
3. Key takeaways

Document content:
${contentToSummarize}

Summary:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const summary = response.text();

      return {
        success: true,
        summary: summary,
        docId: docId,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ Error summarizing document ${docId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate quiz
  async generateQuiz(text, docId, difficulty = 'medium', numQuestions = 5) {
    try {
      console.log(`🧠 Generating quiz for document ${docId}`);
      
      // Get document content
      let contentForQuiz = text;
      if (docId && this.documentStore.has(docId)) {
        contentForQuiz = this.documentStore.get(docId).text;
      }

      // Truncate if too long
      if (contentForQuiz.length > 6000) {
        contentForQuiz = contentForQuiz.substring(0, 6000) + '...';
      }

      const prompt = `Create a ${difficulty} difficulty quiz with ${numQuestions} multiple-choice questions based on the following content. 

Format your response as a valid JSON object with this exact structure:
{
  "title": "Quiz Title",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "id": 1,
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Explanation of why this is correct"
    }
  ]
}

Make sure each question:
- Tests understanding of key concepts from the content
- Has 4 plausible options
- Includes a clear explanation
- Is appropriate for ${difficulty} difficulty level

Content:
${contentForQuiz}

Quiz JSON:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let quizText = response.text();

      // Clean up the response to extract JSON
      quizText = quizText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let quiz;
      try {
        quiz = JSON.parse(quizText);
      } catch (parseError) {
        // If JSON parsing fails, create a fallback quiz
        console.warn('Failed to parse quiz JSON, creating fallback');
        quiz = {
          title: "Document Quiz",
          difficulty: difficulty,
          questions: [
            {
              id: 1,
              question: "Based on the document content, what is the main topic discussed?",
              options: [
                "The document discusses multiple topics",
                "The content is not clearly defined",
                "The main topic varies throughout",
                "The document focuses on a specific subject"
              ],
              correct_answer: 3,
              explanation: "Most documents have a primary focus or main topic that runs throughout the content."
            }
          ]
        };
      }

      return {
        success: true,
        quiz: quiz,
        docId: docId,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ Error generating quiz for document ${docId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Explain concept
  async explainConcept(concept, docId) {
    try {
      console.log(`💡 Explaining concept "${concept}" for document ${docId}`);
      
      // Retrieve relevant context about the concept
      const relevantChunks = this.retrieveRelevantChunks(concept, docId, 3);
      
      let context = '';
      if (relevantChunks.length > 0) {
        context = relevantChunks.map(chunk => chunk.text).join('\n\n');
      } else if (this.documentStore.has(docId)) {
        // If no specific chunks found, use part of the document
        const doc = this.documentStore.get(docId);
        context = doc.text.substring(0, 3000);
      }

      const prompt = `Please explain the concept "${concept}" based on the following document context. Provide a clear, detailed explanation that would help someone understand this concept better.

${context ? `Document context:\n${context}\n\n` : ''}

Please explain "${concept}" in detail, including:
- What it is
- Why it's important
- How it relates to the broader topic
- Any examples or applications mentioned

Explanation:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const explanation = response.text();

      return {
        success: true,
        explanation: explanation,
        concept: concept,
        docId: docId,
        timestamp: new Date()
      };

    } catch (error) {
      console.error(`❌ Error explaining concept "${concept}" for document ${docId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get document info
  getDocumentInfo(docId) {
    const doc = this.documentStore.get(docId);
    const chunks = this.vectorStore.get(docId);
    
    return {
      exists: !!doc,
      chunksCount: chunks ? chunks.length : 0,
      metadata: doc ? doc.metadata : null,
      timestamp: doc ? doc.timestamp : null
    };
  }
}

// Create and export a singleton instance
const ragService = new SimpleRAGService();
export default ragService;