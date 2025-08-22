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
from langchain.chains import RetrievalQA

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

def get_answer(question: str, doc_id: str) -> str:
    """
    Main function for getting answers - called by main.py
    This is the interface that the NLP engineer provides to the backend developer
    
    Args:
        question: User's question
        doc_id: Document ID to search in
    
    Returns:
        String answer from the LLM
    """
    try:
        # Create ChromaDB vectorstore
        vectorstore = Chroma(
            persist_directory="./chroma_db", 
            embedding_function=embeddings
        )
        
        # Create retriever for the specific document
        retriever = vectorstore.as_retriever(
            search_type="similarity", 
            k=4,
            search_kwargs={"filter": {"doc_id": doc_id}}
        )
        
        # Get relevant documents
        docs = retriever.get_relevant_documents(question)
        
        if not docs:
            return "I couldn't find any relevant information in the document to answer your question."
        
        # Create RetrievalQA chain
        qa = RetrievalQA.from_chain_type(
            llm=llm, 
            retriever=retriever,
            return_source_documents=True
        )
        
        # Get answer
        result = qa({"query": question})
        answer = result["result"]
        
        return answer
        
    except Exception as e:
        print(f"Error getting answer for question '{question}' in doc '{doc_id}': {str(e)}")
        return f"Sorry, I encountered an error while processing your question: {str(e)}"

@functions_framework.http
def query_documents(request: https_fn.Request) -> https_fn.Response:
    """
    HTTP endpoint for document queries (legacy support)
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
        
        query = request_json.get('query')
        top_k = request_json.get('top_k', 5)
        
        if not query:
            return https_fn.Response(
                json.dumps({"error": "Missing query parameter"}),
                status=400,
                mimetype="application/json"
            )
        
        # Create ChromaDB vectorstore
        vectorstore = Chroma(
            persist_directory="./chroma_db", 
            embedding_function=embeddings
        )
        
        # Create retriever
        retriever = vectorstore.as_retriever(
            search_type="similarity", 
            k=top_k
        )
        
        # Get relevant documents
        docs = retriever.get_relevant_documents(query)
        
        # Create RetrievalQA chain
        qa = RetrievalQA.from_chain_type(
            llm=llm, 
            retriever=retriever,
            return_source_documents=True
        )
        
        # Get answer
        result = qa({"query": query})
        answer = result["result"]
        source_docs = result["source_documents"]
        
        # Log the query in Firestore
        query_ref = db.collection('queries').document()
        query_ref.set({
            'query': query,
            'answer': answer,
            'retrieved_docs_count': len(source_docs),
            'timestamp': firestore.SERVER_TIMESTAMP
        })
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "query": query,
                "answer": answer,
                "retrieved_documents": [doc.page_content for doc in source_docs],
                "source_documents": source_docs
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
def semantic_search(request: https_fn.Request) -> https_fn.Response:
    """
    Perform semantic search without LLM generation
    """
    try:
        request_json = request.get_json()
        
        if not request_json:
            return https_fn.Response(
                json.dumps({"error": "No JSON data provided"}),
                status=400,
                mimetype="application/json"
            )
        
        query = request_json.get('query')
        top_k = request_json.get('top_k', 10)
        
        if not query:
            return https_fn.Response(
                json.dumps({"error": "Missing query parameter"}),
                status=400,
                mimetype="application/json"
            )
        
        # Create ChromaDB vectorstore
        vectorstore = Chroma(
            persist_directory="./chroma_db", 
            embedding_function=embeddings
        )
        
        # Create retriever
        retriever = vectorstore.as_retriever(
            search_type="similarity", 
            k=top_k
        )
        
        # Get relevant documents
        docs = retriever.get_relevant_documents(query)
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "query": query,
                "results": {
                    "documents": [doc.page_content for doc in docs],
                    "metadatas": [doc.metadata for doc in docs]
                }
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
    # Test the get_answer function
    test_question = "What is machine learning?"
    test_doc_id = "test_document"
    
    answer = get_answer(test_question, test_doc_id)
    print(f"Question: {test_question}")
    print(f"Answer: {answer}")
