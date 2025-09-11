import { ChromaClient } from 'chromadb';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { db } from '../firebaseAdmin.js';

class RAGService {
  constructor() {
    this.chromaClient = new ChromaClient();
    this.collection = null;
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  async initializeCollection(collectionName = 'documents') {
    try {
      this.collection = await this.chromaClient.getOrCreateCollection({
        name: collectionName,
        metadata: { "hnsw:space": "cosine" }
      });
      console.log(`✅ ChromaDB collection '${collectionName}' initialized`);
    } catch (error) {
      console.error('❌ Error initializing ChromaDB collection:', error);
      throw error;
    }
  }

  async ingestDocument(docId, text, metadata = {}) {
    try {
      if (!this.collection) {
        await this.initializeCollection();
      }

      // Split text into chunks
      const chunks = await this.textSplitter.splitText(text);
      
      // Create documents for each chunk
      const documents = chunks.map((chunk, index) => ({
        id: `${docId}_chunk_${index}`,
        content: chunk,
        metadata: {
          docId,
          chunkIndex: index,
          ...metadata
        }
      }));

      // Add to ChromaDB
      await this.collection.add({
        ids: documents.map(doc => doc.id),
        documents: documents.map(doc => doc.content),
        metadatas: documents.map(doc => doc.metadata)
      });

      console.log(`✅ Ingested ${documents.length} chunks for document ${docId}`);
      return { success: true, chunks: documents.length };
    } catch (error) {
      console.error(`❌ Error ingesting document ${docId}:`, error);
      return { success: false, error: error.message };
    }
  }

  async queryDocuments(query, docId = null, limit = 5) {
    try {
      if (!this.collection) {
        await this.initializeCollection();
      }

      const whereClause = docId ? { docId } : undefined;
      
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: limit,
        where: whereClause
      });

      return {
        success: true,
        results: results.documents[0].map((doc, index) => ({
          content: doc,
          metadata: results.metadatas[0][index],
          distance: results.distances[0][index]
        }))
      };
    } catch (error) {
      console.error('❌ Error querying documents:', error);
      return { success: false, error: error.message };
    }
  }

  async generateResponse(query, context, task = 'answer') {
    try {
      let prompt = '';
      
      switch (task) {
        case 'summarize':
          prompt = `Based on the following context, provide a comprehensive summary. Focus on key concepts and main points:

Context:
${context}

Please provide a well-structured summary with:
1. Key Concepts (bullet points)
2. Main Points (numbered list)
3. Important Details
4. Summary (2-3 sentences)`;
          break;
          
        case 'quiz':
          prompt = `Based on the following context, generate a quiz with 5 questions. Format as JSON:
{
  "title": "Quiz Title",
  "difficulty": "medium",
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "explanation": "Why this is correct"
    }
  ]
}

Context:
${context}`;
          break;
          
        case 'explain':
          prompt = `Explain the concept "${query}" based on the following context. Structure your explanation with:
1. Definition
2. Key Points
3. Examples
4. Related Concepts
5. Summary

Context:
${context}`;
          break;
          
        default:
          prompt = `Answer the following question based on the provided context. Be helpful and accurate:

Question: ${query}

Context:
${context}

Answer:`;
      }

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('❌ Error generating response:', error);
      throw error;
    }
  }

  async summarizeNotes(text, docId) {
    try {
      // First ingest the document if not already done
      await this.ingestDocument(docId, text, { type: 'notes' });
      
      // Query for relevant chunks
      const queryResult = await this.queryDocuments('summary key points main concepts', docId, 3);
      
      if (!queryResult.success) {
        throw new Error(queryResult.error);
      }

      const context = queryResult.results.map(r => r.content).join('\n\n');
      const summary = await this.generateResponse('', context, 'summarize');
      
      // Save to Firebase
      await db.collection('summaries').add({
        docId,
        summary,
        timestamp: new Date(),
        type: 'notes'
      });

      return {
        success: true,
        summary,
        docId,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`❌ Error summarizing notes for doc ${docId}:`, error);
      return {
        success: false,
        error: error.message,
        docId
      };
    }
  }

  async generateQuiz(text, docId, difficulty = 'medium', numQuestions = 5) {
    try {
      // First ingest the document if not already done
      await this.ingestDocument(docId, text, { type: 'notes' });
      
      // Query for relevant chunks
      const queryResult = await this.queryDocuments('quiz questions test knowledge', docId, 5);
      
      if (!queryResult.success) {
        throw new Error(queryResult.error);
      }

      const context = queryResult.results.map(r => r.content).join('\n\n');
      const quizText = await this.generateResponse('', context, 'quiz');
      
      // Parse JSON response
      let quiz;
      try {
        const jsonMatch = quizText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          quiz = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (parseError) {
        // Fallback quiz
        quiz = {
          title: `Quiz for Document ${docId}`,
          difficulty,
          questions: [
            {
              id: 1,
              question: "What is the main topic of this document?",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correct_answer: 0,
              explanation: "Based on the content analysis"
            }
          ]
        };
      }

      // Save to Firebase
      await db.collection('quizzes').add({
        docId,
        quiz,
        timestamp: new Date(),
        difficulty,
        numQuestions
      });

      return {
        success: true,
        quiz,
        docId,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`❌ Error generating quiz for doc ${docId}:`, error);
      return {
        success: false,
        error: error.message,
        docId
      };
    }
  }

  async explainConcept(concept, docId) {
    try {
      // Query for relevant chunks about the concept
      const queryResult = await this.queryDocuments(concept, docId, 3);
      
      if (!queryResult.success) {
        throw new Error(queryResult.error);
      }

      const context = queryResult.results.map(r => r.content).join('\n\n');
      const explanation = await this.generateResponse(concept, context, 'explain');
      
      // Save to Firebase
      await db.collection('explanations').add({
        docId,
        concept,
        explanation,
        timestamp: new Date()
      });

      return {
        success: true,
        explanation,
        concept,
        docId,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`❌ Error explaining concept ${concept} for doc ${docId}:`, error);
      return {
        success: false,
        error: error.message,
        concept,
        docId
      };
    }
  }

  async chatWithDocument(query, docId, conversationHistory = []) {
    try {
      // Query for relevant chunks
      const queryResult = await this.queryDocuments(query, docId, 3);
      
      if (!queryResult.success) {
        throw new Error(queryResult.error);
      }

      const context = queryResult.results.map(r => r.content).join('\n\n');
      
      // Add conversation history to context
      const historyContext = conversationHistory.length > 0 
        ? `\n\nPrevious conversation:\n${conversationHistory.map(msg => `${msg.sender}: ${msg.text}`).join('\n')}`
        : '';

      const answer = await this.generateResponse(query, context + historyContext, 'answer');
      
      return {
        success: true,
        answer,
        context: queryResult.results,
        docId,
        timestamp: new Date()
      };
    } catch (error) {
      console.error(`❌ Error chatting with document ${docId}:`, error);
      return {
        success: false,
        error: error.message,
        docId
      };
    }
  }
}

export default RAGService;
