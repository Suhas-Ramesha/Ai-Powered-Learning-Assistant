# AI Learning Assistant - Week 1 Backend

A comprehensive AI learning assistant built with Next.js, Firebase, and LangChain + Gemini for document processing, RAG-based Q&A, and intelligent learning features.

## 🎯 Week 1 Focus: Core RAG Backend

This week implements the foundational backend infrastructure:
- **Document Upload & Processing**: Extract text → chunk → Gemini embeddings → ChromaDB
- **RAG Chat System**: Retrieve relevant chunks → Gemini LLM → return answers
- **Firebase Integration**: Storage, Firestore, Functions, Auth
- **Frontend**: Upload + Chat UI

## 🏗️ Architecture (Week 1)

```
Frontend (Next.js + Firebase SDK)
├── Document Upload → Firebase Storage
├── Chat Interface → Firebase Functions
└── Firebase Auth (Google/Email login)

Backend (Firebase Cloud Functions + LangChain)
├── /upload API → process_document() → ChromaDB
├── /chat API → get_answer() → Gemini RAG
└── Storage Trigger → auto-process uploads

RAG Core (LangChain + ChromaDB + Gemini)
├── Document Chunking (500 chars, 50 overlap)
├── Gemini Embeddings (models/embedding-001)
├── ChromaDB Vector Store
└── Gemini LLM (gemini-pro)
```

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- Python 3.8+
- Firebase account
- Google API key for Gemini

### 2. Installation
```bash
# Clone the repository
git clone <repository-url>
cd ai-learning-assistant

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../functions
npm install
pip install -r requirements.txt
```

### 3. Firebase Setup
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and initialize
firebase login
firebase init

# Choose services: Functions, Firestore, Storage, Auth
# Use Python for functions
```

### 4. Environment Configuration
```bash
# Set Google API key
firebase functions:config:set google.api_key="your_google_api_key"

# Or set locally
export GOOGLE_API_KEY="your_google_api_key"
```

### 5. Start Development
```bash
# Start Firebase emulators
firebase emulators:start

# Start frontend (in another terminal)
cd frontend
npm run dev
```

## 📁 Project Structure

```
/project-root
├── /frontend (Next.js + Firebase SDK)
│   ├── /components
│   │   ├── DocumentUpload.js    # File upload to Storage
│   │   └── ChatInterface.js     # Chat with documents
│   ├── /pages
│   │   └── index.js             # Main app page
│   └── /utils
│       └── firebase.js          # Firebase configuration
├── /functions (Firebase Cloud Functions)
│   ├── main.py                  # Week 1 APIs: /upload, /chat
│   ├── index.js                 # Function exports
│   └── /rag
│       ├── ingest.py            # process_document() interface
│       └── query.py             # get_answer() interface
├── firebase.json               # Firebase configuration
├── firestore.rules             # Security rules
├── storage.rules               # Storage security
└── WEEK1_SETUP.md             # Detailed setup guide
```

## 🔧 Week 1 APIs

### `/upload` API
Process uploaded documents and store embeddings.

**Request:**
```json
{
  "uid": "user123",
  "filename": "notes.pdf"
}
```

**Response:**
```json
{
  "message": "File processed",
  "docId": "notes_pdf"
}
```

### `/chat` API
Answer questions about uploaded documents using RAG.

**Request:**
```json
{
  "uid": "user123",
  "docId": "notes_pdf",
  "question": "What is machine learning?"
}
```

**Response:**
```json
{
  "answer": "Machine learning is a subset of artificial intelligence..."
}
```

## 🗄️ Firestore Schema (Week 1)

### Documents
```
users/{uid}/documents/{docId}
{
  filename: string,
  uploadedAt: timestamp,
  status: "ready",
  docId: string
}
```

### Conversations
```
conversations/{uid}_{docId}/messages/{msgId}
{
  sender: "user" | "bot",
  text: string,
  timestamp: timestamp,
  docId: string
}
```

## 🔒 Security Rules

### Firestore Rules
- Users can only access their own documents
- Conversations are user-specific
- Authentication required for all operations

### Storage Rules
- Users can upload to `notes/{uid}/` folder
- Read access to processed documents
- System-only write access to processed documents

## 🧪 Testing Week 1

### Test Upload Flow
1. Upload document via frontend
2. Verify file appears in Firebase Storage
3. Check Firestore for document metadata
4. Confirm ChromaDB has embeddings

### Test Chat Flow
1. Select a document in chat interface
2. Ask a question
3. Verify RAG response from Gemini
4. Check conversation history in Firestore

## 🚀 Deployment

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific components
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only hosting
```

## 📋 Week 1 Checklist

- [ ] Firebase project initialized (Functions, Firestore, Storage, Auth)
- [ ] `/upload` function stores embeddings + doc metadata
- [ ] `/chat` function returns Gemini RAG answers + logs to Firestore
- [ ] Firestore schema ready (users + conversations)
- [ ] Storage trigger processes uploaded files
- [ ] Frontend upload + chat UI working
- [ ] Can ask questions from uploaded documents

## 🔮 Next Steps (Week 2)

- Add `/summarize` function (map-reduce with Gemini)
- Add `/generateQuiz` function (Gemini prompt → MCQs)
- Frontend: Summarize button, quiz attempt UI
- Deliverable: Upload → Summarize → Generate & Take Quiz

## 🤝 NLP Engineer Interface

The backend expects these functions from the NLP engineer:

```python
# In rag/ingest.py
def process_document(file_path: str, doc_id: str) -> Dict[str, Any]:
    """Process document: chunk + embed + store in ChromaDB"""
    pass

# In rag/query.py  
def get_answer(question: str, doc_id: str) -> str:
    """Get RAG answer: retrieve + Gemini LLM"""
    pass
```

## 📚 Technologies Used

- **Frontend**: Next.js, React, Tailwind CSS, Firebase SDK
- **Backend**: Firebase Cloud Functions, Python (functions_framework)
- **AI/ML**: LangChain, Google Gemini, ChromaDB
- **Database**: Firebase Firestore, Firebase Storage
- **Authentication**: Firebase Auth

## 📄 License

MIT License - see LICENSE file for details.
