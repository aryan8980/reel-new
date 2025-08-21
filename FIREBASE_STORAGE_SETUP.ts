// Firebase Storage Setup Instructions
// Follow these steps to enable Firebase Storage with proper security rules

/*
STEP 1: Enable Firebase Storage in Firebase Console
1. Go to https://console.firebase.google.com
2. Select your project: "reel-rush-221fd"
3. Go to "Storage" in the left sidebar
4. Click "Get started"
5. Choose "Start in production mode" 
6. Select a location (choose closest to your users)
7. Click "Done"

STEP 2: Set up Security Rules
1. In the Firebase Console, go to Storage > Rules
2. Replace the existing rules with the content from storage.rules file
3. Click "Publish"

STEP 3: Verify Storage Bucket
Your storage bucket should be: reel-rush-221fd.firebasestorage.app
This is already configured in firebase.ts

ALTERNATIVE QUICK SETUP:
If you prefer to start with more permissive rules for testing:

rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}

Note: Use the more restrictive rules from storage.rules for production!
*/

export const FIREBASE_STORAGE_SETUP = {
  bucket: "reel-rush-221fd.firebasestorage.app",
  status: "Configure in Firebase Console",
  securityRules: "See storage.rules file",
  maxFileSize: "50MB per file",
  supportedTypes: {
    audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac"],
    video: ["video/mp4", "video/webm", "video/ogg", "video/avi"]
  }
};
