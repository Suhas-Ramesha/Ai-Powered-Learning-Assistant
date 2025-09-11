# 🤖 AI-Powered Learning Assistant

A comprehensive AI learning platform that transforms your documents into interactive learning experiences using advanced AI technologies.

![AI Learning Assistant](https://img.shields.io/badge/AI-Powered-blue) ![Next.js](https://img.shields.io/badge/Next.js-14-black) ![Firebase](https://img.shields.io/badge/Firebase-Google-orange) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ✨ Features

### 🎯 Core Functionality
- **📄 Document Upload**: Support for TXT, MD, PDF, DOC, DOCX files
- **🧠 AI-Powered Summaries**: Get comprehensive summaries with key concepts
- **📝 Interactive Quizzes**: Generate and take quizzes based on your documents
- **💡 Concept Explanation**: Ask questions and get detailed explanations
- **💬 Smart Chat**: Chat with your documents using RAG (Retrieval-Augmented Generation)

### 🎨 Modern UI/UX
- **🌐 Beautiful Landing Page**: Modern design with hero section and features
- **📱 Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **🎭 Interactive Quiz Interface**: Question-by-question format with explanations
- **🗂️ Document Management**: Upload, view, and delete documents easily
- **🔐 Secure Authentication**: Google OAuth integration

### 🚀 Technical Features
- **⚡ Real-time Processing**: Instant AI responses
- **🔄 RAG Pipeline**: Advanced document retrieval and generation
- **☁️ Cloud Storage**: Firebase integration for scalability
- **🛡️ Type Safety**: Full TypeScript implementation
- **📊 Progress Tracking**: Quiz scores and learning analytics

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Services   │
│   (Next.js 14)  │◄──►│   (API Routes)  │◄──►│   (Gemini API)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Firebase      │    │   RAG Service   │    │   Document      │
│   (Auth/DB)     │    │   (Simple)      │    │   Processing    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project
- Google API key for Gemini

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-powered-learning-assistant
   ```

2. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your actual values
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
# Google API Key for Gemini AI
GOOGLE_API_KEY=your_google_api_key_here

# Firebase Admin SDK (for API routes)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----"
FIREBASE_STORAGE_BUCKET=your_storage_bucket

# Firebase Client SDK (for frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Firebase Setup

1. **Create a Firebase project**
2. **Enable Authentication** (Google provider)
3. **Create Firestore database**
4. **Set up Firebase Storage**
5. **Configure security rules** (see `firestore.rules` and `storage.rules`)

## 📁 Project Structure

```
ai-powered-learning-assistant/
├── 📁 frontend/                 # Next.js Frontend Application
│   ├── 📁 app/                  # Next.js 14 App Router
│   │   ├── 📁 api/              # API Routes (TypeScript)
│   │   │   ├── 📁 chat/         # Chat API with RAG
│   │   │   ├── 📁 explain/      # Concept explanation API
│   │   │   ├── 📁 quiz/         # Quiz generation API
│   │   │   ├── 📁 summarize/    # Document summarization API
│   │   │   └── 📁 upload/       # Document upload API
│   │   ├── 📄 globals.css       # Global styles
│   │   ├── 📄 layout.tsx        # Root layout with AuthProvider
│   │   └── 📄 page.tsx          # Home page with modern landing
│   ├── 📁 components/           # React Components (TypeScript)
│   │   ├── 📄 ChatInterface.tsx # Main chat component with RAG
│   │   ├── 📄 DocumentUpload.tsx # Document upload component
│   │   ├── 📄 QuizInterface.tsx # Interactive quiz component
│   │   └── 📄 LoginButton.tsx   # Google OAuth login button
│   ├── 📁 context/              # React Context Providers
│   │   └── 📄 AuthContext.tsx   # Authentication context
│   ├── 📁 lib/                  # Utility Libraries
│   │   ├── 📄 firebase.ts       # Firebase client configuration
│   │   └── 📄 simpleRagService.js # Simplified RAG service
│   ├── 📄 .env.local.example    # Environment variables template
│   ├── 📄 next.config.js        # Next.js configuration
│   ├── 📄 package.json          # Frontend dependencies
│   └── 📄 tsconfig.json         # TypeScript configuration
├── 📁 server/                   # Backend Services
│   ├── 📁 rag/                  # RAG Pipeline Implementation
│   │   ├── 📄 ragService.js     # Main RAG service with LangChain
│   │   ├── 📄 summarize.js      # Document summarization functions
│   │   ├── 📄 quiz.js           # Quiz generation functions
│   │   ├── 📄 explain.js        # Concept explanation functions
│   │   ├── 📄 query.js          # Document querying functions
│   │   └── 📄 index.js          # RAG functions export
│   └── 📄 firebaseAdmin.js      # Firebase Admin SDK configuration
├── 📄 .env.local                # Root environment variables
├── 📄 firebase.json             # Firebase project configuration
├── 📄 firestore.rules           # Firestore security rules
├── 📄 storage.rules             # Firebase Storage security rules
├── 📄 vercel.json               # Vercel deployment configuration
├── 📄 DEPLOYMENT.md             # Deployment guide
└── 📄 README.md                 # This file
```

## 🎮 Usage

### 1. **Authentication**
- Click "Get Started Free" on the landing page
- Sign in with your Google account
- Access the main application

### 2. **Upload Documents**
- Choose between file upload or text input
- Supported formats: TXT, MD, PDF, DOC, DOCX
- Documents are processed and stored securely

### 3. **AI Features**
- **Summarize**: Get comprehensive document summaries
- **Quiz**: Generate and take interactive quizzes
- **Explain**: Ask questions about concepts
- **Chat**: Have conversations about your documents

### 4. **Quiz Experience**
- Question-by-question format
- Multiple choice answers
- Instant feedback and explanations
- Score tracking and progress

## 🔧 API Endpoints

### Chat API
```http
POST /api/chat
Content-Type: application/json

{
  "uid": "user_id",
  "docId": "document_id",
  "question": "Your question",
  "conversationHistory": []
}
```

### Upload API
```http
POST /api/upload
Content-Type: application/json

{
  "uid": "user_id",
  "filename": "document_name.txt",
  "text": "document_content"
}
```

### Summarize API
```http
POST /api/summarize
Content-Type: application/json

{
  "uid": "user_id",
  "docId": "document_id",
  "text": "summarize"
}
```

### Quiz API
```http
POST /api/quiz
Content-Type: application/json

{
  "uid": "user_id",
  "docId": "document_id",
  "text": "generate quiz",
  "difficulty": "medium",
  "numQuestions": 5
}
```

### Explain API
```http
POST /api/explain
Content-Type: application/json

{
  "uid": "user_id",
  "docId": "document_id",
  "concept": "concept_to_explain"
}
```

## 🚀 Deployment

### Vercel (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` from project root
3. Set environment variables in Vercel dashboard
4. Configure Firebase authorized domains

### Other Platforms
- **Netlify**: Deploy the `frontend/out` directory
- **Railway**: Connect GitHub repository
- **Self-hosted**: Use PM2 for process management

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

### Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Firebase Admin SDK
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth (Google OAuth)
- **Storage**: Firebase Storage
- **AI**: Google Gemini API
- **RAG**: Custom implementation with keyword matching
- **Deployment**: Vercel (recommended)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini API** for AI capabilities
- **Firebase** for backend services
- **Next.js** for the React framework
- **Tailwind CSS** for styling
- **Vercel** for deployment platform

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Documentation**: [Wiki](https://github.com/your-repo/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**Made with ❤️ for learners everywhere**