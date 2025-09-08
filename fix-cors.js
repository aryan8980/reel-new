const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');

// Initialize Firebase Admin with your project
admin.initializeApp({
  projectId: 'reel-rush-221fd'
});

// Get the default app's credential and use it to initialize the Storage client
const storage = new Storage({
  projectId: 'reel-rush-221fd'
});

async function setCors() {
  try {
    console.log('🔧 Setting CORS configuration for Firebase Storage...');
    
    // Get the bucket
    const bucket = storage.bucket('reel-rush-221fd.appspot.com');
    
    // Define CORS configuration
    const corsConfiguration = [
      {
        origin: ['https://reel-rush-221fd.web.app', 'https://reel-rush-221fd.firebaseapp.com'],
        method: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        maxAgeSeconds: 3600,
        responseHeader: [
          'Content-Type',
          'Authorization', 
          'x-goog-resumable',
          'x-goog-meta-*'
        ]
      }
    ];

    // Set CORS
    await bucket.setCorsConfiguration(corsConfiguration);
    
    console.log('✅ CORS configuration set successfully!');
    console.log('Allowed origins:', corsConfiguration[0].origin);
    console.log('Allowed methods:', corsConfiguration[0].method);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting CORS:', error.message);
    process.exit(1);
  }
}

setCors();
