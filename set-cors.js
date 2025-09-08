const {Storage} = require('@google-cloud/storage');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'reel-rush-221fd'
});

// Initialize Storage with your project ID
const storage = new Storage({
  projectId: 'reel-rush-221fd'
});

async function setCorsConfiguration() {
  try {
    const bucket = storage.bucket('reel-rush-221fd.appspot.com');
    
    const corsConfiguration = [
      {
        origin: ['https://reel-rush-221fd.web.app', 'http://localhost:3000', 'http://localhost:5173'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        maxAgeSeconds: 3600,
        responseHeader: ['Content-Type', 'Authorization', 'x-goog-resumable']
      }
    ];
    
    await bucket.setCorsConfiguration(corsConfiguration);
    console.log('✅ CORS configuration applied successfully!');
    console.log('Allowed origins:', corsConfiguration[0].origin);
    
  } catch (error) {
    console.error('❌ Failed to set CORS configuration:', error);
  }
}

setCorsConfiguration();
