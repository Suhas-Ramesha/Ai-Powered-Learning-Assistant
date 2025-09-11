import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import ragService from '@/lib/simpleRagService.js';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();

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
    const { uid, docId, question, conversationHistory = [] } = await request.json();

    if (!uid || !docId || !question) {
      return NextResponse.json(
        { error: 'Missing uid, docId, or question' },
        { status: 400 }
      );
    }

    // Call RAG query function
    const ragResult = await ragService.chatWithDocument(question, docId, conversationHistory);

    if (!ragResult.success) {
      return NextResponse.json(
        { error: ragResult.error },
        { status: 500 }
      );
    }

    const answer = ragResult.answer;

    // Save conversation in Firestore
    const convoRef = db.collection('conversations').doc(`${uid}_${docId}`);
    
    // Add user message
    await convoRef.collection('messages').add({
      sender: 'user',
      text: question,
      timestamp: new Date(),
      docId: docId
    });
    
    // Add bot response
    await convoRef.collection('messages').add({
      sender: 'bot',
      text: answer,
      timestamp: new Date(),
      docId: docId
    });

    return NextResponse.json({ 
      answer,
      context: ragResult.context,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
