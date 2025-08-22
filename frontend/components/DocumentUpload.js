import React, { useState } from 'react';
import { functions } from '../utils/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const DocumentUpload = () => {
  const [file, setFile] = useState(null);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('text');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const auth = getAuth();
  const storage = getStorage();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    // Auto-set document name from filename
    if (selectedFile && !documentName) {
      setDocumentName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleTextInput = (e) => {
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

    setIsUploading(true);
    setUploadStatus('Uploading document...');

    try {
      const uid = auth.currentUser.uid;
      let filename = documentName;
      let filePath = '';

      if (documentType === 'file') {
        // Upload file to Firebase Storage
        const fileExtension = file.name.split('.').pop();
        filename = `${documentName}.${fileExtension}`;
        filePath = `notes/${uid}/${filename}`;
        
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log('File uploaded to:', downloadURL);
      } else {
        // For text input, create a text file and upload it
        const textBlob = new Blob([documentName], { type: 'text/plain' });
        filename = `${documentName}.txt`;
        filePath = `notes/${uid}/${filename}`;
        
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, textBlob);
        
        const downloadURL = await getDownloadURL(storageRef);
        console.log('Text file uploaded to:', downloadURL);
      }

      // Call backend upload function
      const uploadFunction = functions.httpsCallable('upload');
      const result = await uploadFunction({
        uid: uid,
        filename: filename
      });

      setUploadStatus(`Successfully uploaded! Document ID: ${result.data.docId}`);
      
      // Reset form
      setFile(null);
      setDocumentName('');
      setDocumentType('text');
      
      // Clear status after 5 seconds
      setTimeout(() => setUploadStatus(''), 5000);

    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadStatus(`Error uploading document: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Upload Document</h2>
      
      {/* Authentication Check */}
      {!auth.currentUser && (
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          Please log in to upload documents.
        </div>
      )}
      
      {/* Document Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Document Type
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="file"
              checked={documentType === 'file'}
              onChange={(e) => setDocumentType(e.target.value)}
              className="mr-2"
              disabled={!auth.currentUser}
            />
            Upload File
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="text"
              checked={documentType === 'text'}
              onChange={(e) => setDocumentType(e.target.value)}
              className="mr-2"
              disabled={!auth.currentUser}
            />
            Paste Text
          </label>
        </div>
      </div>

      {/* File Upload */}
      {documentType === 'file' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select File
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            accept=".txt,.md,.pdf,.doc,.docx"
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            disabled={isUploading || !auth.currentUser}
          />
          <p className="mt-1 text-sm text-gray-500">
            Supported formats: TXT, MD, PDF, DOC, DOCX
          </p>
        </div>
      )}

      {/* Document Name */}
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
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isUploading || !auth.currentUser}
          />
        ) : (
          <textarea
            value={documentName}
            onChange={handleTextInput}
            placeholder="Paste your document content here..."
            rows={10}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={isUploading || !auth.currentUser}
          />
        )}
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={isUploading || !auth.currentUser}
        className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
            ? 'bg-red-100 text-red-700' 
            : uploadStatus.includes('Successfully') 
            ? 'bg-green-100 text-green-700'
            : 'bg-blue-100 text-blue-700'
        }`}>
          {uploadStatus}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
