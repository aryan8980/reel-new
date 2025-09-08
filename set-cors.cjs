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
    // Try both bucket name formats
    const bucketNames = ['reel-rush-221fd.appspot.com', 'reel-rush-221fd.firebasestorage.app'];
    
    for (const bucketName of bucketNames) {
      try {
        console.log(`Trying bucket: ${bucketName}`);
        const bucket = storage.bucket(bucketName);
        
        // Check if bucket exists
        const [exists] = await bucket.exists();
        if (!exists) {
          console.log(`Bucket ${bucketName} does not exist`);
          continue;
        }
        
        console.log(`✅ Found bucket: ${bucketName}`);
        
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
        return;
        
      } catch (bucketError) {
        console.log(`Failed for bucket ${bucketName}:`, bucketError.message);
      }
    }
    
    console.error('❌ No valid storage bucket found');
    
  } catch (error) {
    console.error('❌ Failed to set CORS configuration:', error);
  }
}

setCorsConfiguration();
