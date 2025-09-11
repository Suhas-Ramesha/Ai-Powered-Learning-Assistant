"use client";
import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';

interface Document {
  id: string;
  docId: string;
  filename: string;
  status: string;
  uploadedAt: any;
}

const DocumentUpload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState<'file' | 'text'>('text');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [userDocuments, setUserDocuments] = useState<Document[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const auth = getAuth();
  const db = getFirestore();

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
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    
    // Auto-set document name from filename
    if (selectedFile && !documentName) {
      setDocumentName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleTextInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDocumentName(e.target.value);
  };

  const handleUpload = async () => {
    if (!auth.currentUser) {
      setUploadStatus('Please log in to upload documents');
      return;
    }

    if (!documentName.trim()) {
      setUploadStatus('Please enter a document name');
      return;
    }

    if (documentType === 'file' && !file) {
      setUploadStatus('Please select a file');
      return;
    }

    if (documentType === 'text' && !documentName.trim()) {
      setUploadStatus('Please enter document content');
      return;
    }

    // Check file size limit (10MB)
    if (documentType === 'file' && file && file.size > 10 * 1024 * 1024) {
      setUploadStatus('File too large. Maximum size is 10MB.');
      return;
    }

    // Check text content size limit (10MB)
    if (documentType === 'text' && documentName.length > 10 * 1024 * 1024) {
      setUploadStatus('Text content too large. Maximum size is 10MB.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading document...');

    try {
      const uid = auth.currentUser.uid;
      let filename = documentName;
      let textContent = '';

      if (documentType === 'file' && file) {
        // Read file content instead of uploading to Firebase Storage
        const fileExtension = file.name.split('.').pop();
        filename = `${documentName}.${fileExtension}`;
        
        // Read file content as text
        textContent = await readFileAsText(file);
        console.log('File content read:', textContent.substring(0, 100) + '...');
      } else {
        // For text input, use the text directly
        filename = `${documentName}.txt`;
        textContent = documentName;
      }

      // Call backend upload API with file content
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: uid,
          filename: filename,
          text: textContent
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Upload failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();

      setUploadStatus(`Successfully uploaded! Document ID: ${result.docId}`);
      
      // Reset form
      setFile(null);
      setDocumentName('');
      setDocumentType('text');
      
      // Reload documents
      await loadUserDocuments();
      
      // Clear status after 5 seconds
      setTimeout(() => setUploadStatus(''), 5000);

    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadStatus(`Error uploading document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!auth.currentUser) return;
    
    if (!confirm(`Are you sure you want to delete "${docName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(docId);
    
    try {
      const uid = auth.currentUser.uid;
      
      // Delete from user's documents collection
      const userDocRef = doc(db, 'users', uid, 'documents', docId);
      await deleteDoc(userDocRef);
      
      // Also delete from main documents collection
      const mainDocRef = doc(db, 'documents', docId);
      await deleteDoc(mainDocRef);
      
      // Reload documents
      await loadUserDocuments();
      
      setUploadStatus(`Document "${docName}" deleted successfully`);
      setTimeout(() => setUploadStatus(''), 3000);
      
    } catch (error) {
      console.error('Error deleting document:', error);
      setUploadStatus(`Error deleting document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(null);
    }
  };

  // Helper function to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        
        // If it's a PDF file, try to extract meaningful content
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const extractedText = extractTextFromPDFContent(content);
          resolve(extractedText);
        } else {
          resolve(content);
        }
      };
      reader.onerror = (e) => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsText(file);
    });
  };

  // Helper function to extract meaningful text from PDF content
  const extractTextFromPDFContent = (pdfContent: string): string => {
    // Remove PDF metadata and structure
    let text = pdfContent
      // Remove PDF object definitions
      .replace(/\d+\s+\d+\s+obj[\s\S]*?endobj/g, '')
      // Remove PDF structure commands
      .replace(/\/[A-Za-z]+\s*\[[^\]]*\]/g, '')
      // Remove hexadecimal strings
      .replace(/<[0-9A-Fa-f]+>/g, '')
      // Remove PDF operators
      .replace(/[A-Za-z]+\s*\d+\s*\d+\s*R/g, '')
      // Remove stream data
      .replace(/stream[\s\S]*?endstream/g, '')
      // Remove PDF keywords
      .replace(/\b(stream|endstream|obj|endobj|xref|trailer|startxref|PDF|Type|Subtype|Length|Filter|FlateDecode|Compressed|Producer|Creator|Title|Author|Subject|Keywords|CreationDate|ModDate|Language|Page|Pages|Kids|Parent|Count|First|Last|Prev|Next|Dest|Dests|Outlines|Catalog|Root|Info|ID|Size|W|H|MediaBox|CropBox|BleedBox|TrimBox|ArtBox|Rotate|Resources|Font|BaseFont|Encoding|ToUnicode|Widths|FontDescriptor|Flags|FontBBox|ItalicAngle|Ascent|Descent|CapHeight|StemV|XHeight|FontFile|FontFile2|FontFile3|Subtype|BaseFont|FirstChar|LastChar|Widths|FontDescriptor|Flags|FontBBox|ItalicAngle|Ascent|Descent|CapHeight|StemV|XHeight|FontFile|FontFile2|FontFile3)\b/g, '')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // If we still have mostly PDF structure, try to extract actual text content
    if (text.length < 100 || text.includes('obj') || text.includes('stream')) {
      // Look for actual text content between parentheses or brackets
      const textMatches = pdfContent.match(/\(([^)]+)\)/g);
      if (textMatches && textMatches.length > 0) {
        text = textMatches
          .map(match => match.slice(1, -1)) // Remove parentheses
          .filter(content => content.length > 3 && !content.match(/^[0-9\s]+$/)) // Filter out numbers and short content
          .join(' ');
      }
    }

    // If still no meaningful content, return a message
    if (text.length < 50) {
      return `PDF file: ${file?.name || 'Unknown'}\n\nThis appears to be a PDF file. For best results with PDF documents, please:\n1. Copy the text content from the PDF\n2. Paste it as text in the "Paste Text" option\n3. Or use a PDF-to-text converter before uploading\n\nAlternatively, you can upload text files (.txt, .md) or Word documents (.doc, .docx) which work better with our AI system.`;
    }

    return text;
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
          <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload New Document
        </h2>
        
        {/* Authentication Check */}
        {!auth.currentUser && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
            Please log in to upload documents.
          </div>
        )}
        
        {/* Document Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Document Type
          </label>
          <div className="flex space-x-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="file"
                checked={documentType === 'file'}
                onChange={(e) => setDocumentType(e.target.value as 'file' | 'text')}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={!auth.currentUser}
              />
              <span className="text-sm font-medium text-gray-700">Upload File</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                value="text"
                checked={documentType === 'text'}
                onChange={(e) => setDocumentType(e.target.value as 'file' | 'text')}
                className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                disabled={!auth.currentUser}
              />
              <span className="text-sm font-medium text-gray-700">Paste Text</span>
            </label>
          </div>
        </div>

        {/* File Upload */}
        {documentType === 'file' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept=".txt,.md,.pdf,.doc,.docx"
                      disabled={isUploading || !auth.currentUser}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  TXT, MD, PDF, DOC, DOCX up to 10MB
                </p>
                {file && (
                  <p className="text-xs text-blue-600 mt-1">
                    File size: {(file.size / 1024 / 1024).toFixed(2)}MB
                  </p>
                )}
              </div>
            </div>
            {file && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <span className="font-medium">Selected:</span> {file.name}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Document Name/Content */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {documentType === 'file' ? 'Document Name' : 'Document Content'}
          </label>
          {documentType === 'file' ? (
            <input
              type="text"
              value={documentName}
              onChange={handleTextInput}
              placeholder="Enter document name"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isUploading || !auth.currentUser}
            />
          ) : (
            <textarea
              value={documentName}
              onChange={handleTextInput}
              placeholder="Paste your document content here..."
              rows={8}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isUploading || !auth.currentUser}
            />
          )}
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={isUploading || !auth.currentUser}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isUploading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Uploading...
            </div>
          ) : (
            'Upload Document'
          )}
        </button>

        {/* Status Message */}
        {uploadStatus && (
          <div className={`mt-4 p-3 rounded-lg ${
            uploadStatus.includes('Error') 
              ? 'bg-red-100 text-red-700 border border-red-200' 
              : uploadStatus.includes('Successfully') || uploadStatus.includes('deleted')
              ? 'bg-green-100 text-green-700 border border-green-200'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {uploadStatus}
          </div>
        )}
      </div>

      {/* Document List */}
      {auth.currentUser && userDocuments.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="w-5 h-5 text-gray-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Your Documents ({userDocuments.length})
          </h3>
          <div className="space-y-3">
            {userDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{doc.filename}</p>
                    <p className="text-xs text-gray-500">
                      Uploaded {doc.uploadedAt?.toDate ? doc.uploadedAt.toDate().toLocaleDateString() : 'Recently'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                  disabled={isDeleting === doc.id}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete document"
                >
                  {isDeleting === doc.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;