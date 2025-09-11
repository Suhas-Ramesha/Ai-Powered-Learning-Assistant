# Deployment Guide

## 🚀 Deploy to Vercel (Recommended)

### Prerequisites
1. Vercel account (free tier available)
2. Firebase project set up
3. Google API key for Gemini

### Step 1: Prepare Environment Variables

Create a `.env.local` file in the `frontend` directory with:

```env
# Google API Key for Gemini
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

### Step 2: Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from project root:**
   ```bash
   vercel
   ```

4. **Set Environment Variables in Vercel Dashboard:**
   - Go to your project in Vercel dashboard
   - Navigate to Settings → Environment Variables
   - Add all the environment variables from your `.env.local`

### Step 3: Configure Firebase

1. **Update Firebase Auth Domain:**
   - Go to Firebase Console → Authentication → Settings
   - Add your Vercel domain to authorized domains

2. **Update Firestore Rules:**
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow read/write access to authenticated users
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Allow read/write access to documents collection for authenticated users
       match /documents/{document} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

3. **Update Storage Rules:**
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /notes/{userId}/{allPaths=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

## 🌐 Alternative Deployment Options

### Netlify
1. Build the project: `cd frontend && npm run build`
2. Deploy the `frontend/out` directory
3. Set environment variables in Netlify dashboard

### Railway
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

### Self-Hosted (VPS)
1. Install Node.js and npm
2. Clone repository
3. Install dependencies: `cd frontend && npm install`
4. Build: `npm run build`
5. Start: `npm start`
6. Use PM2 for process management

## 🔧 Post-Deployment Checklist

- [ ] Test user authentication
- [ ] Test document upload
- [ ] Test AI features (summarize, quiz, explain)
- [ ] Verify Firebase rules are working
- [ ] Check error logs in deployment platform
- [ ] Test on mobile devices
- [ ] Set up monitoring (optional)

## 🐛 Troubleshooting

### Common Issues:

1. **Environment Variables Not Loading:**
   - Ensure all variables are set in deployment platform
   - Check variable names match exactly
   - Restart deployment after adding variables

2. **Firebase Authentication Issues:**
   - Verify authorized domains include your deployment URL
   - Check Firebase project configuration

3. **API Routes Not Working:**
   - Ensure server-side environment variables are set
   - Check Firebase Admin SDK configuration

4. **Build Failures:**
   - Check Node.js version compatibility
   - Ensure all dependencies are in package.json
   - Review build logs for specific errors

## 📊 Performance Optimization

1. **Enable Vercel Analytics** (if using Vercel)
2. **Optimize Images** using Next.js Image component
3. **Enable Compression** in deployment settings
4. **Set up CDN** for static assets
5. **Monitor Bundle Size** and optimize imports

## 🔒 Security Considerations

1. **Never commit `.env.local`** to version control
2. **Use environment variables** for all sensitive data
3. **Regularly rotate API keys**
4. **Monitor usage** and set up alerts
5. **Review Firebase security rules** regularly

## 📈 Scaling Considerations

- **Database:** Firestore scales automatically
- **Storage:** Firebase Storage scales with usage
- **API:** Consider rate limiting for production
- **Monitoring:** Set up error tracking (Sentry, etc.)
- **Backup:** Regular database backups recommended
