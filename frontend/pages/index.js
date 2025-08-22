import { useState } from 'react';
import Head from 'next/head';
import ChatInterface from '../components/ChatInterface';
import DocumentUpload from '../components/DocumentUpload';

export default function Home() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>AI Learning Assistant</title>
        <meta name="description" content="AI-powered learning assistant with RAG capabilities" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                AI Learning Assistant
              </h1>
            </div>
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'chat'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'upload'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Upload Documents
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {activeTab === 'chat' ? (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium text-gray-900">
                  Chat with Your Documents
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Ask questions about your uploaded documents and get AI-powered answers.
                </p>
              </div>
              <div className="h-96">
                <ChatInterface />
              </div>
            </div>
          ) : (
            <DocumentUpload />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            Powered by Firebase, LangChain, and ChromaDB
          </p>
        </div>
      </footer>
    </div>
  );
}
