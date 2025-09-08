# Firebase Storage CORS Error Fix

## Issue Analysis
The error you're seeing indicates that Firebase Storage is either:
1. Not enabled in your Firebase project, OR
2. Has CORS configuration issues

## Quick Fix Steps:

### Step 1: Enable Firebase Storage in Firebase Console
1. Go to https://console.firebase.google.com/project/reel-rush-221fd
2. Click on "Storage" in the left sidebar
3. If you see "Get Started", click it to enable Storage
4. Choose "Start in production mode"
5. Select a location close to your users (like us-central1)
6. Click "Done"

### Step 2: Update Storage Rules
Once Storage is enabled, go to the Rules tab and paste these rules:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to read and write to their own directory
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Step 3: Alternative - Manual CORS Configuration
If the CORS script doesn't work, you can configure CORS manually using Google Cloud Console:

1. Go to https://console.cloud.google.com/storage/browser?project=reel-rush-221fd
2. Find your storage bucket
3. Click the "..." menu and select "Edit CORS configuration"
4. Add this CORS configuration:

```json
[
  {
    "origin": ["https://reel-rush-221fd.web.app", "http://localhost:3000", "http://localhost:5173"],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"]
  }
]
```

## Testing
After completing these steps:
1. Visit https://reel-rush-221fd.web.app/debug
2. Test file upload functionality
3. Check if the CORS errors are resolved

If Firebase Storage was not enabled, that would explain the CORS errors you're seeing.
