# Week 1 Backend Setup Guide

## ✅ Week 1 Deliverable Checklist

### 1. Firebase Project Setup
- [ ] Install Firebase Tools: `npm install -g firebase-tools`
- [ ] Login to Firebase: `firebase login`
- [ ] Initialize Project: `firebase init`
  - Choose: Functions ✅, Firestore ✅, Storage ✅, Auth ✅
  - Use Python functions (functions_framework)
- [ ] Deploy test function to verify setup

### 2. Environment Configuration
- [ ] Get Google API Key for Gemini
- [ ] Set environment variable: `firebase functions:config:set google.api_key="your_google_api_key"`
- [ ] Or set locally: `GOOGLE_API_KEY=your_key`

### 3. Dependencies Installation
```bash
cd functions
npm install
pip install -r requirements.txt
```

### 4. Week 1 APIs Implementation

#### `/upload` API
- **Purpose**: Process uploaded documents
- **Input**: `{uid, filename}`
- **Process**: 
  1. Call `process_document(file_path, doc_id)` from NLP engineer
  2. Save metadata in Firestore: `users/{uid}/documents/{docId}`
- **Output**: `{message: "File processed", docId: doc_id}`

#### `/chat` API  
- **Purpose**: Answer questions about documents
- **Input**: `{docId, question, uid}`
- **Process**:
  1. Call `get_answer(question, doc_id)` from NLP engineer
  2. Save conversation in Firestore: `conversations/{uid}_{docId}/messages`
- **Output**: `{answer: "AI response"}`

#### Storage Trigger
- **Purpose**: Auto-process uploaded files
- **Trigger**: File upload to `notes/{uid}/{filename}`
- **Process**: Call `process_document()` automatically

### 5. Firestore Schema (Week 1)

#### Documents Collection
```
users/{uid}/documents/{docId}
{
  filename: string,
  uploadedAt: timestamp,
  status: "ready",
  docId: string
}
```

#### Conversations Collection
```
conversations/{uid}_{docId}/messages/{msgId}
{
  sender: "user" | "bot",
  text: string,
  timestamp: timestamp,
  docId: string
}
```

### 6. Testing Week 1

#### Test Upload Flow
1. Upload file via frontend → Firebase Storage
2. Storage trigger processes file
3. Check Firestore for document metadata
4. Verify ChromaDB has embeddings

#### Test Chat Flow
1. Call `/chat` with `{docId, question, uid}`
2. Verify RAG response from Gemini
3. Check Firestore for conversation history

### 7. Deployment Commands
```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:upload
firebase deploy --only functions:chat

# Deploy rules
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### 8. Week 1 Success Criteria
- [ ] Firebase project initialized with all services
- [ ] `/upload` function stores embeddings + doc metadata
- [ ] `/chat` function returns Gemini RAG answers + logs to Firestore
- [ ] Firestore schema ready (users + conversations)
- [ ] Storage trigger processes uploaded files
- [ ] Can ask questions from uploaded documents

## Next Steps (Week 2)
- Add `/summarize` function
- Add `/generateQuiz` function  
- Frontend: Summarize button, quiz attempt UI
