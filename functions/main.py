import functions_framework
from google.cloud import storage, firestore
import tempfile
import os
from typing import Dict, Any
import json

# Import NLP engineer's scripts
from rag.ingest import process_document
from rag.query import get_answer

@functions_framework.http
def upload(request):
    """
    /upload API - Triggered when frontend tells backend: "new doc uploaded."
    """
    try:
        data = request.get_json()
        uid = data.get("uid")
        filename = data.get("filename")
        doc_id = filename.replace(" ", "_")

        # Call NLP ingestion (already downloads file + embeds)
        file_path = f"notes/{uid}/{filename}"
        process_document(file_path, doc_id)

        # Save metadata in Firestore
        db = firestore.Client()
        db.collection("users").document(uid).collection("documents").document(doc_id).set({
            "filename": filename,
            "uploadedAt": firestore.SERVER_TIMESTAMP,
            "status": "ready",
            "docId": doc_id
        })

        return {"message": "File processed", "docId": doc_id}
    
    except Exception as e:
        return {"error": str(e)}, 500

@functions_framework.http
def chat(request):
    """
    /chat API - Input: {docId, question, uid}
    """
    try:
        data = request.get_json()
        uid = data.get("uid")
        doc_id = data.get("docId")
        question = data.get("question")

        # Call NLP RAG query
        answer = get_answer(question, doc_id)

        # Save conversation in Firestore
        db = firestore.Client()
        convo_ref = db.collection("conversations").document(f"{uid}_{doc_id}")
        
        # Add user message
        convo_ref.collection("messages").add({
            "sender": "user",
            "text": question,
            "timestamp": firestore.SERVER_TIMESTAMP,
            "docId": doc_id
        })
        
        # Add bot response
        convo_ref.collection("messages").add({
            "sender": "bot",
            "text": answer,
            "timestamp": firestore.SERVER_TIMESTAMP,
            "docId": doc_id
        })

        return {"answer": answer}
    
    except Exception as e:
        return {"error": str(e)}, 500

def process_file(event, context):
    """
    Cloud Function Trigger - Triggered when a file is uploaded to Firebase Storage.
    """
    try:
        bucket_name = event['bucket']
        file_name = event['name']
        
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(file_name)

        # Download file to temp location
        temp_path = tempfile.mktemp()
        blob.download_to_filename(temp_path)

        # Extract doc_id from filename
        doc_id = file_name.split('/')[-1].replace(" ", "_")

        # Call NLP ingest pipeline
        process_document(temp_path, doc_id)

        # Clean up temp file
        os.remove(temp_path)

        print(f"Processed {file_name} successfully.")
        return {"status": "success", "file": file_name}
    
    except Exception as e:
        print(f"Error processing file: {str(e)}")
        return {"error": str(e)}, 500

# Test function for deployment verification
@functions_framework.http
def hello(request):
    """Test function to verify deployment"""
    return "Hello World from Firebase!"
