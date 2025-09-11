"use client";
import React, { useState, useRef, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import QuizInterface from './QuizInterface';

interface Document {
  id: string;
  docId: string;
  filename: string;
  status: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isError?: boolean;
  quiz?: any;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [userDocuments, setUserDocuments] = useState<Document[]>([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const auth = getAuth();
  const db = getFirestore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (auth.currentUser) {
      loadUserDocuments();
    }
  }, [auth.currentUser]);

  const loadUserDocuments = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      
      const docsRef = collection(db, 'users', uid, 'documents');
      const q = query(docsRef, where('status', '==', 'ready'));
      const querySnapshot = await getDocs(q);
      
      const docs: Document[] = [];
      querySnapshot.forEach((doc) => {
        docs.push({
          id: doc.id,
          ...doc.data()
        } as Document);
      });
      
      setUserDocuments(docs);
      
      // Auto-select first document if available
      if (docs.length > 0 && !selectedDocument) {
        setSelectedDocument(docs[0].docId);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    if (!auth.currentUser) {
      alert('Please log in to chat');
      return;
    }

    if (!selectedDocument) {
      alert('Please select a document to chat about');
      return;
    }

    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentMessage = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call backend chat API with conversation history
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: auth.currentUser.uid,
          docId: selectedDocument,
          question: currentMessage,
          conversationHistory: messages.slice(-10) // Last 10 messages for context
        })
      });

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.statusText}`);
      }

      const result = await response.json();

      const aiMessage: Message = {
        id: Date.now() + 1,
        text: result.answer,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpecialCommand = async (command: string) => {
    if (!auth.currentUser || !selectedDocument) return;

    setIsLoading(true);
    const commandMessage: Message = {
      id: Date.now(),
      text: `Executing: ${command}`,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, commandMessage]);

    try {
      let response;
      let result;

      switch (command) {
        case 'summarize':
          response = await fetch('/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: auth.currentUser.uid,
              docId: selectedDocument,
              text: 'Please summarize this document' // The RAG service will get the content from its storage
            })
          });
          result = await response.json();
          break;

        case 'quiz':
          response = await fetch('/api/quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: auth.currentUser.uid,
              docId: selectedDocument,
              text: 'Please generate a quiz from this document', // The RAG service will get the content from its storage
              difficulty: 'medium',
              numQuestions: 5
            })
          });
          result = await response.json();
          break;

        case 'explain':
          const concept = prompt('What concept would you like me to explain?');
          if (!concept) return;
          
          response = await fetch('/api/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: auth.currentUser.uid,
              docId: selectedDocument,
              concept: concept
            })
          });
          result = await response.json();
          break;

        default:
          throw new Error('Unknown command');
      }

      if (!response.ok) {
        throw new Error(`Command failed: ${response.statusText}`);
      }

      const aiMessage: Message = {
        id: Date.now() + 1,
        text: command === 'quiz' ? 'Quiz generated successfully! Click the button below to start.' : result.summary || result.explanation,
        sender: 'ai',
        timestamp: new Date(),
        quiz: command === 'quiz' ? result.quiz : undefined
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error executing command:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: `Error executing ${command}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        sender: 'ai',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startQuiz = (quiz: any) => {
    setCurrentQuiz(quiz);
    setShowQuiz(true);
  };

  const closeQuiz = () => {
    setShowQuiz(false);
    setCurrentQuiz(null);
  };

  const DocumentSelector = () => (
    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">
          Select Document to Chat About:
        </label>
        <button
          onClick={() => setShowDocumentSelector(!showDocumentSelector)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showDocumentSelector ? 'Hide' : 'Change'}
        </button>
      </div>
      
      {showDocumentSelector ? (
        <div className="space-y-2">
          {userDocuments.map((doc) => (
            <label key={doc.id} className="flex items-center">
              <input
                type="radio"
                name="document"
                value={doc.docId}
                checked={selectedDocument === doc.docId}
                onChange={(e) => setSelectedDocument(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">{doc.filename}</span>
            </label>
          ))}
          {userDocuments.length === 0 && (
            <p className="text-sm text-gray-500">
              No documents uploaded yet. Please upload a document first.
            </p>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-600">
          {selectedDocument ? 
            userDocuments.find(d => d.docId === selectedDocument)?.filename || 'Unknown document' :
            'No document selected'
          }
        </div>
      )}
    </div>
  );

  return (
    <>
      {showQuiz && currentQuiz && (
        <QuizInterface quiz={currentQuiz} onClose={closeQuiz} />
      )}
      <div className="flex flex-col h-[600px] max-w-4xl mx-auto">
        {/* Authentication Check */}
        {!auth.currentUser && (
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            Please log in to chat with your documents.
          </div>
        )}

        {/* Document Selector */}
        {auth.currentUser && <DocumentSelector />}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.length === 0 && auth.currentUser && (
            <div className="text-center text-gray-500 py-8">
              <p>Start a conversation about your documents!</p>
              <p className="text-sm mt-2">Ask questions about the content you've uploaded.</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.isError
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                {message.quiz && (
                  <button
                    onClick={() => startQuiz(message.quiz)}
                    className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                  >
                    🧠 Start Quiz
                  </button>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Command Buttons */}
        {auth.currentUser && selectedDocument && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => handleSpecialCommand('summarize')}
                disabled={isLoading}
                className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                📝 Summarize
              </button>
              <button
                onClick={() => handleSpecialCommand('quiz')}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 disabled:opacity-50 transition-colors"
              >
                🧠 Generate Quiz
              </button>
              <button
                onClick={() => handleSpecialCommand('explain')}
                disabled={isLoading}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                💡 Explain Concept
              </button>
            </div>
          </div>
        )}

        {/* Input Container */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                !auth.currentUser 
                  ? "Please log in to chat..." 
                  : !selectedDocument 
                  ? "Please select a document first..."
                  : "Ask a question about your document..."
              }
              className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={isLoading || !auth.currentUser || !selectedDocument}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim() || !auth.currentUser || !selectedDocument}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatInterface;