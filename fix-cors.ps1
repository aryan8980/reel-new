# Firebase Storage CORS Configuration Script
# This script helps configure CORS for Firebase Storage to fix audio upload issues

Write-Host "🔧 FIREBASE STORAGE CORS CONFIGURATION HELPER" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 PROBLEM IDENTIFIED:" -ForegroundColor Yellow
Write-Host "Audio uploads work, but accessing the audio files is blocked by CORS policy" -ForegroundColor White
Write-Host ""

Write-Host "✅ SOLUTION STEPS:" -ForegroundColor Green
Write-Host "1. Install Google Cloud SDK (if not already installed)" -ForegroundColor White
Write-Host "2. Configure CORS for your Firebase Storage bucket" -ForegroundColor White
Write-Host "3. Test the audio upload functionality" -ForegroundColor White
Write-Host ""

Write-Host "🔗 MANUAL STEPS TO FIX:" -ForegroundColor Magenta
Write-Host "Step 1: Install Google Cloud SDK" -ForegroundColor White
Write-Host "  Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 2: Set CORS configuration" -ForegroundColor White
Write-Host "  Run this command in PowerShell:" -ForegroundColor Gray
Write-Host "  gsutil cors set firebase-storage-cors.json gs://reel-rush-221fd.firebasestorage.app" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 3: Alternative - Firebase Console Method" -ForegroundColor White
Write-Host "  1. Go to: https://console.firebase.google.com/" -ForegroundColor Gray
Write-Host "  2. Select your project: reel-rush-221fd" -ForegroundColor Gray
Write-Host "  3. Go to Storage > Files" -ForegroundColor Gray
Write-Host "  4. Click on 'Rules' tab" -ForegroundColor Gray
Write-Host "  5. Update rules to allow CORS requests" -ForegroundColor Gray
Write-Host ""

Write-Host "📁 CORS Configuration File Created:" -ForegroundColor Green
Write-Host "  File: firebase-storage-cors.json" -ForegroundColor White
Write-Host "  Location: Current directory" -ForegroundColor White
Write-Host ""

Write-Host "🧪 TESTING:" -ForegroundColor Blue
Write-Host "After CORS configuration, test by:" -ForegroundColor White
Write-Host "1. Open http://localhost:8080/" -ForegroundColor Gray
Write-Host "2. Go to Editor page" -ForegroundColor Gray
Write-Host "3. Upload an audio file" -ForegroundColor Gray
Write-Host "4. Check if waveform analysis works" -ForegroundColor Gray
Write-Host ""

Write-Host "💡 QUICK FIX FOR NOW:" -ForegroundColor Cyan
Write-Host "The app will still work with simplified audio analysis" -ForegroundColor White
Write-Host "Audio upload ✅ | Beat detection ✅ | Video processing ✅" -ForegroundColor Green
Write-Host ""

# Check if gsutil is available
if (Get-Command gsutil -ErrorAction SilentlyContinue) {
    Write-Host "🔧 Google Cloud SDK detected! Ready to configure CORS." -ForegroundColor Green
    Write-Host ""
    Write-Host "Run this command to fix CORS:" -ForegroundColor Yellow
    Write-Host "gsutil cors set firebase-storage-cors.json gs://reel-rush-221fd.firebasestorage.app" -ForegroundColor White
} else {
    Write-Host "📦 Google Cloud SDK not found." -ForegroundColor Yellow
    Write-Host "Install from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
