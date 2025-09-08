# Manual CORS Configuration for Firebase Storage

## Method 1: Google Cloud Console (Recommended)

1. **Go to Google Cloud Console**:
   - Visit: https://console.cloud.google.com/storage/browser?project=reel-rush-221fd
   - Make sure you're logged in with the same Google account used for Firebase

2. **Find Your Storage Bucket**:
   - You should see a bucket named `reel-rush-221fd.appspot.com`
   - Click on it to open

3. **Configure CORS**:
   - Click the "CONFIGURATION" tab at the top
   - Look for "CORS" section
   - Click "EDIT CORS CONFIGURATION"
   - Replace any existing configuration with this:

```json
[
  {
    "origin": [
      "https://reel-rush-221fd.web.app", 
      "https://reel-rush-221fd.firebaseapp.com",
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "maxAgeSeconds": 3600,
    "responseHeader": [
      "Content-Type",
      "Authorization", 
      "x-goog-resumable",
      "x-goog-meta-*"
    ]
  }
]
```

4. **Save the Configuration**:
   - Click "SAVE"
   - Wait for the changes to propagate (usually 1-2 minutes)

## Method 2: Alternative Upload Method (Temporary Fix)

If CORS configuration doesn't work immediately, we can modify the upload code to use a different approach.

## Test After Configuration

1. Wait 2-3 minutes for CORS changes to propagate
2. Visit https://reel-rush-221fd.web.app
3. Try uploading an audio file
4. Check browser console for any remaining errors

The CORS error occurs because Firebase Storage needs explicit permission to allow web uploads from your domain.
