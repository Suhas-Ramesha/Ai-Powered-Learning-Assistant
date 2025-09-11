import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import ragService from '../../lib/simpleRagService.js';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();

// Helper function to chunk text into smaller pieces
function chunkText(text: string, maxChunkSize: number = 800000): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    let end = start + maxChunkSize;
    
    // Try to break at a sentence or word boundary
    if (end < text.length) {
      const lastSentence = text.lastIndexOf('.', end);
      const lastWord = text.lastIndexOf(' ', end);
      
      if (lastSentence > start + maxChunkSize * 0.8) {
        end = lastSentence + 1;
      } else if (lastWord > start + maxChunkSize * 0.8) {
        end = lastWord;
      }
    }
    
    chunks.push(text.slice(start, end));
    start = end;
  }
  
  return chunks;
}

export async function POST(request: NextRequest) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '3600',
      },
    });
  }

  try {
    const { uid, filename, text } = await request.json();

    if (!uid || !filename) {
      return NextResponse.json(
        { error: 'Missing uid or filename' },
        { status: 400 }
      );
    }

    // Check document size limit (10MB for text content)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (text && text.length > maxSize) {
      return NextResponse.json(
        { error: `Document too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB. Your document is ${Math.round(text.length / 1024 / 1024)}MB.` },
        { status: 413 }
      );
    }

    // Generate a unique document ID
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Chunk the text if it's too large for a single Firestore document
    const maxChunkSize = 800000; // 800KB per chunk (Firestore limit is 1MB)
    const textChunks = text ? chunkText(text, maxChunkSize) : [''];
    
    console.log(`💾 Saving document ${docId} to Firebase with ${textChunks.length} chunks, total text length: ${text ? text.length : 0}`);

    // Save document chunks to main documents collection
    if (textChunks.length === 1) {
      // Single chunk - save normally
      await db.collection('documents').doc(docId).set({
        docId: docId,
        filename: filename,
        uid: uid,
        text: text || '',
        status: 'processing',
        uploadedAt: new Date(),
        createdAt: new Date(),
        chunkCount: 1
      });
    } else {
      // Multiple chunks - save each chunk separately
      for (let i = 0; i < textChunks.length; i++) {
        const chunkId = i === 0 ? docId : `${docId}_chunk_${i}`;
        await db.collection('documents').doc(chunkId).set({
          docId: docId,
          filename: filename,
          uid: uid,
          text: textChunks[i],
          status: 'processing',
          uploadedAt: new Date(),
          createdAt: new Date(),
          chunkIndex: i,
          chunkCount: textChunks.length,
          isChunk: i > 0
        });
      }
    }
    console.log(`✅ Document ${docId} saved to Firebase documents collection`);

    // Also save metadata to user's documents collection
    await db.collection('users').doc(uid).collection('documents').add({
      docId: docId,
      filename: filename,
      status: 'processing',
      uploadedAt: new Date(),
      createdAt: new Date()
    });

    // Process the document with RAG system
    if (text) {
      try {
        // Ingest document into RAG service
        const ingestResult = await ragService.ingestDocument(docId, text, {
          filename,
          uid,
          type: 'uploaded_document'
        });

        if (ingestResult.success) {
          // Update status to ready in both collections
          await db.collection('documents').doc(docId).update({ status: 'ready' });
          await db.collection('users').doc(uid).collection('documents')
            .where('docId', '==', docId)
            .get()
            .then(snapshot => {
              snapshot.forEach(doc => {
                doc.ref.update({ status: 'ready' });
              });
            });

          console.log(`✅ Document ${docId} processed and ready`);
        } else {
          console.error(`❌ Failed to process document ${docId}:`, ingestResult.error);
        }
      } catch (error) {
        console.error(`❌ Error processing document ${docId}:`, error);
        // Keep status as processing for retry
      }
    }

    return NextResponse.json({ 
      docId: docId,
      message: 'Document uploaded successfully',
      status: text ? 'processing' : 'ready'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
