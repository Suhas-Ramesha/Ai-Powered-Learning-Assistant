import functions_framework
from firebase_functions import https_fn
from firebase_admin import firestore
import chromadb
from chromadb.config import Settings
import os
from typing import List, Dict, Any
import json
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.vectorstores import Chroma
import tempfile

# Initialize Firestore
db = firestore.client()

# Initialize Gemini Embeddings
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=os.getenv('GOOGLE_API_KEY')
)

def process_document(file_path: str, doc_id: str) -> Dict[str, Any]:
    """
    Main function for processing documents - called by main.py
    This is the interface that the NLP engineer provides to the backend developer
    
    Args:
        file_path: Path to the document file
        doc_id: Unique identifier for the document
    
    Returns:
        Dict with processing results
    """
    try:
        # Read the file content
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Chunk the content using LangChain
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=500, 
            chunk_overlap=50
        )
        chunks = splitter.split_text(content)
        
        # Create ChromaDB vectorstore
        vectorstore = Chroma(
            persist_directory="./chroma_db", 
            embedding_function=embeddings
        )
        
        # Add texts to vectorstore with metadata
        metadatas = [{"doc_id": doc_id, "chunk_index": i} for i in range(len(chunks))]
        vectorstore.add_texts(chunks, metadatas=metadatas)
        vectorstore.persist()
        
        # Store metadata in Firestore
        doc_ref = db.collection('documents').document(doc_id)
        doc_ref.set({
            'document_id': doc_id,
            'file_path': file_path,
            'chunk_count': len(chunks),
            'status': 'processed',
            'ingested_at': firestore.SERVER_TIMESTAMP
        })
        
        return {
            "success": True,
            "document_id": doc_id,
            "chunks_created": len(chunks),
            "file_path": file_path
        }
        
    except Exception as e:
        print(f"Error processing document {doc_id}: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "document_id": doc_id
        }

@functions_framework.http
def ingest_document(request: https_fn.Request) -> https_fn.Response:
    """
    HTTP endpoint for document ingestion (legacy support)
    """
    try:
        # Get request data
        request_json = request.get_json()
        
        if not request_json:
            return https_fn.Response(
                json.dumps({"error": "No JSON data provided"}),
                status=400,
                mimetype="application/json"
            )
        
        content = request_json.get('content')
        document_id = request_json.get('document_id')
        metadata = request_json.get('metadata', {})
        
        if not content or not document_id:
            return https_fn.Response(
                json.dumps({"error": "Missing content or document_id"}),
                status=400,
                mimetype="application/json"
            )
        
        # Create a temporary file for processing
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            f.write(content)
            temp_path = f.name
        
        try:
            # Process the document
            result = process_document(temp_path, document_id)
            
            if result["success"]:
                return https_fn.Response(
                    json.dumps(result),
                    status=200,
                    mimetype="application/json"
                )
            else:
                return https_fn.Response(
                    json.dumps(result),
                    status=500,
                    mimetype="application/json"
                )
        finally:
            # Clean up temp file
            os.unlink(temp_path)
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            mimetype="application/json"
        )

# For local testing
if __name__ == "__main__":
    # Test the process_document function
    test_content = "This is a test document. It has multiple sentences. We want to chunk it properly."
    
    # Create a test file
    with open("test_doc.txt", "w") as f:
        f.write(test_content)
    
    # Test processing
    result = process_document("test_doc.txt", "test_document")
    print(f"Processing result: {result}")
    
    # Clean up
    os.remove("test_doc.txt")
