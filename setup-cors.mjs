import { Storage } from '@google-cloud/storage';
import admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'reel-rush-221fd'
});

// Initialize Storage client
const storage = new Storage({
  projectId: 'reel-rush-221fd'
});

async function setupCORS() {
  try {
    console.log('🔧 Setting up CORS for Firebase Storage...');
    
    // Try different bucket name formats
    const possibleBuckets = [
      'reel-rush-221fd.appspot.com',
      'reel-rush-221fd.firebasestorage.app',
      'gs://reel-rush-221fd.appspot.com'
    ];
    
    for (const bucketName of possibleBuckets) {
      try {
        console.log(`\n📦 Trying bucket: ${bucketName}`);
        const cleanBucketName = bucketName.replace('gs://', '');
        const bucket = storage.bucket(cleanBucketName);
        
        // Check if bucket exists
        const [exists] = await bucket.exists();
        if (!exists) {
          console.log(`❌ Bucket ${cleanBucketName} does not exist`);
          continue;
        }
        
        console.log(`✅ Found bucket: ${cleanBucketName}`);
        
        // Set CORS configuration
        const corsConfiguration = [
          {
            origin: [
              'https://reel-rush-221fd.web.app',
              'https://reel-rush-221fd.firebaseapp.com',
              'http://localhost:3000',
              'http://localhost:5173'
            ],
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
        
        console.log('📝 Applying CORS configuration...');
        await bucket.setCorsConfiguration(corsConfiguration);
        
        console.log('✅ CORS configuration applied successfully!');
        console.log('🌐 Allowed origins:', corsConfiguration[0].origin);
        console.log('🔧 Allowed methods:', corsConfiguration[0].method);
        
        // Verify the configuration was set
        const [cors] = await bucket.getCorsConfiguration();
        console.log('🔍 Current CORS configuration:', JSON.stringify(cors, null, 2));
        
        console.log('\n🎉 CORS setup complete! Your uploads should work now.');
        process.exit(0);
        
      } catch (bucketError) {
        console.log(`❌ Error with bucket ${bucketName}:`, bucketError.message);
        continue;
      }
    }
    
    console.error('❌ No valid storage bucket found. Storage might not be enabled.');
    process.exit(1);
    
  } catch (error) {
    console.error('❌ Failed to set CORS:', error);
    process.exit(1);
  }
}

setupCORS();
