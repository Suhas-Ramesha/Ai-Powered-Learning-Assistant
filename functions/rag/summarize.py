import functions_framework
from firebase_functions import https_fn
from firebase_admin import firestore
import chromadb
from chromadb.config import Settings
import os
from typing import List, Dict, Any
import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.vectorstores import Chroma
from langchain.chains.summarize import load_summarize_chain
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

# Initialize Firestore
db = firestore.client()

# Initialize Gemini components
llm = ChatGoogleGenerativeAI(
    model="gemini-pro",
    google_api_key=os.getenv('GOOGLE_API_KEY')
)

embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001",
    google_api_key=os.getenv('GOOGLE_API_KEY')
)

@functions_framework.http
def summarize_document(request: https_fn.Request) -> https_fn.Response:
    """
    Generate a summary of a specific document using map-reduce
    """
    try:
        request_json = request.get_json()
        
        if not request_json:
            return https_fn.Response(
                json.dumps({"error": "No JSON data provided"}),
                status=400,
                mimetype="application/json"
            )
        
        document_id = request_json.get('document_id')
        summary_type = request_json.get('summary_type', 'general')  # general, key_points, detailed
        
        if not document_id:
            return https_fn.Response(
                json.dumps({"error": "Missing document_id parameter"}),
                status=400,
                mimetype="application/json"
            )
        
        # Get document chunks from ChromaDB
        vectorstore = Chroma(
            persist_directory="./chroma_db", 
            embedding_function=embeddings
        )
        
        # Get all documents for this doc_id
        docs = vectorstore.get(
            where={"doc_id": document_id}
        )
        
        if not docs['documents']:
            return https_fn.Response(
                json.dumps({"error": "Document not found"}),
                status=404,
                mimetype="application/json"
            )
        
        # Convert to LangChain Document objects
        documents = []
        for i, doc in enumerate(docs['documents']):
            documents.append(Document(
                page_content=doc,
                metadata={"chunk_index": i, "doc_id": document_id}
            ))
        
        # Create text splitter for summarization
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        # Split documents if they're too long
        split_docs = text_splitter.split_documents(documents)
        
        # Create summarization chain based on type
        if summary_type == "key_points":
            chain = load_summarize_chain(
                llm=llm,
                chain_type="map_reduce",
                map_prompt_template="Extract key points from this text:\n\n{text}\n\nKey Points:",
                combine_prompt_template="Combine these key points into a comprehensive summary:\n\n{text}\n\nSummary:"
            )
        elif summary_type == "detailed":
            chain = load_summarize_chain(
                llm=llm,
                chain_type="map_reduce",
                map_prompt_template="Create a detailed summary of this text:\n\n{text}\n\nDetailed Summary:",
                combine_prompt_template="Combine these detailed summaries into a comprehensive overview:\n\n{text}\n\nComprehensive Summary:"
            )
        else:  # general
            chain = load_summarize_chain(
                llm=llm,
                chain_type="map_reduce",
                map_prompt_template="Summarize this text in 2-3 sentences:\n\n{text}\n\nSummary:",
                combine_prompt_template="Combine these summaries into a coherent overall summary:\n\n{text}\n\nOverall Summary:"
            )
        
        # Generate summary
        summary = chain.run(split_docs)
        
        # Store summary in Firestore
        summary_ref = db.collection('summaries').document()
        summary_ref.set({
            'document_id': document_id,
            'summary_type': summary_type,
            'summary': summary,
            'chunks_used': len(docs['documents']),
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "document_id": document_id,
                "summary_type": summary_type,
                "summary": summary,
                "chunks_used": len(docs['documents'])
            }),
            status=200,
            mimetype="application/json"
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            mimetype="application/json"
        )

@functions_framework.http
def summarize_collection(request: https_fn.Request) -> https_fn.Response:
    """
    Generate a summary of an entire collection of documents
    """
    try:
        request_json = request.get_json()
        
        if not request_json:
            return https_fn.Response(
                json.dumps({"error": "No JSON data provided"}),
                status=400,
                mimetype="application/json"
            )
        
        topic_filter = request_json.get('topic_filter', None)
        max_chunks = request_json.get('max_chunks', 50)
        
        # Get all documents from ChromaDB
        vectorstore = Chroma(
            persist_directory="./chroma_db", 
            embedding_function=embeddings
        )
        
        # Get all documents (with optional topic filter)
        if topic_filter:
            docs = vectorstore.get(
                where={"topic": topic_filter}
            )
        else:
            docs = vectorstore.get()
        
        if not docs['documents']:
            return https_fn.Response(
                json.dumps({"error": "No documents found"}),
                status=404,
                mimetype="application/json"
            )
        
        # Limit the number of chunks to process
        documents = docs['documents'][:max_chunks]
        
        # Convert to LangChain Document objects
        langchain_docs = []
        for i, doc in enumerate(documents):
            langchain_docs.append(Document(
                page_content=doc,
                metadata={"chunk_index": i}
            ))
        
        # Create text splitter for summarization
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
        
        # Split documents if they're too long
        split_docs = text_splitter.split_documents(langchain_docs)
        
        # Create summarization chain for collection
        chain = load_summarize_chain(
            llm=llm,
            chain_type="map_reduce",
            map_prompt_template="Summarize this text and identify main themes:\n\n{text}\n\nSummary and Themes:",
            combine_prompt_template="Create a comprehensive summary of this collection, organizing by main themes:\n\n{text}\n\nCollection Summary:"
        )
        
        # Generate collection summary
        summary = chain.run(split_docs)
        
        # Store collection summary in Firestore
        summary_ref = db.collection('collection_summaries').document()
        summary_ref.set({
            'topic_filter': topic_filter,
            'summary': summary,
            'documents_processed': len(documents),
            'total_documents': len(docs['documents']),
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "topic_filter": topic_filter,
                "summary": summary,
                "documents_processed": len(documents),
                "total_documents": len(docs['documents'])
            }),
            status=200,
            mimetype="application/json"
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            mimetype="application/json"
        )

@functions_framework.http
def generate_toc(request: https_fn.Request) -> https_fn.Response:
    """
    Generate a table of contents for a document
    """
    try:
        request_json = request.get_json()
        
        if not request_json:
            return https_fn.Response(
                json.dumps({"error": "No JSON data provided"}),
                status=400,
                mimetype="application/json"
            )
        
        document_id = request_json.get('document_id')
        
        if not document_id:
            return https_fn.Response(
                json.dumps({"error": "Missing document_id parameter"}),
                status=400,
                mimetype="application/json"
            )
        
        # Get document chunks
        vectorstore = Chroma(
            persist_directory="./chroma_db", 
            embedding_function=embeddings
        )
        
        docs = vectorstore.get(
            where={"doc_id": document_id}
        )
        
        if not docs['documents']:
            return https_fn.Response(
                json.dumps({"error": "Document not found"}),
                status=404,
                mimetype="application/json"
            )
        
        # Combine all chunks
        full_text = "\n\n".join(docs['documents'])
        
        # Generate table of contents using Gemini
        toc_prompt = f"""Create a table of contents for the following document. 
        Identify the main sections and subsections, and organize them hierarchically:

        {full_text}

        Table of Contents:"""
        
        toc = llm.invoke(toc_prompt).content
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "document_id": document_id,
                "table_of_contents": toc
            }),
            status=200,
            mimetype="application/json"
        )
        
    except Exception as e:
        return https_fn.Response(
            json.dumps({"error": str(e)}),
            status=500,
            mimetype="application/json"
        )

# For local testing
if __name__ == "__main__":
    # Test the summarization function
    test_text = "This is a test document about machine learning. It covers various topics including supervised learning, unsupervised learning, and deep learning."
    print("Testing summarization functionality...")
