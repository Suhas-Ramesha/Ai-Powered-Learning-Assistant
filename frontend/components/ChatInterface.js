import React, { useState, useRef, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [userDocuments, setUserDocuments] = useState([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const messagesEndRef = useRef(null);
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
      const uid = auth.currentUser.uid;
      const docsRef = collection(db, 'users', uid, 'documents');
      const q = query(docsRef, where('status', '==', 'ready'));
      const querySnapshot = await getDocs(q);
      
      const docs = [];
      querySnapshot.forEach((doc) => {
        docs.push({
          id: doc.id,
          ...doc.data()
        });
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

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Call backend chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: auth.currentUser.uid,
          docId: selectedDocument,
          question: inputMessage
        })
      });

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.statusText}`);
      }

      const result = await response.json();

      const aiMessage = {
        id: Date.now() + 1,
        text: result.answer,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Authentication Check */}
      {!auth.currentUser && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          Please log in to chat with your documents.
        </div>
      )}

      {/* Document Selector */}
      {auth.currentUser && <DocumentSelector />}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            className="flex-1 p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={isLoading || !auth.currentUser || !selectedDocument}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputMessage.trim() || !auth.currentUser || !selectedDocument}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
