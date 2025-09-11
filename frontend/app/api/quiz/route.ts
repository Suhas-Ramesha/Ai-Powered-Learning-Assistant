import { NextRequest, NextResponse } from 'next/server';
import ragService from '@/lib/simpleRagService.js';

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
    const { uid, docId, text, difficulty = 'medium', numQuestions = 5 } = await request.json();

    if (!uid || !docId || !text) {
      return NextResponse.json(
        { error: 'Missing uid, docId, or text' },
        { status: 400 }
      );
    }

    // Call RAG quiz function
    const result = await ragService.generateQuiz(text, docId, difficulty, numQuestions);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      quiz: result.quiz,
      docId: result.docId,
      timestamp: result.timestamp
    });

  } catch (error) {
    console.error('Quiz error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
