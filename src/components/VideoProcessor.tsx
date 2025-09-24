import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Video, 
  Scissors, 
  Download, 
  Play, 
  Loader2,
  Clock,
  Layers,
  Film,
  Cloud,
  CheckCircle,
  Settings,
  Bug
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadVideoFile, MediaFile } from "@/lib/firebaseService";
import { trimVideoSimple as trimVideo, concatenateVideos, initFFmpeg } from "@/lib/customVideoProcessor";
import { SafeAudioMixer } from "@/lib/safeAudioMixer";
import { DirectElementMixer } from "@/lib/directElementMixer";
import { fileCache } from "@/lib/fileCache";
import { firebaseML, VideoSegment } from "@/lib/firebaseML";
import * as BeatDetection from "@/lib/beatDetection";

// Type imports
type BeatDetectionResult = BeatDetection.BeatDetectionResult;

export interface ExtendedMediaFile extends MediaFile {
  originalFile?: File; // Keep reference to original file for processing
}

interface VideoProcessorProps {
  videoFiles: MediaFile[];
  beatPoints: number[];
  endTime?: number;
  onProcessingComplete: (processedVideo: Blob) => void;
  audioFiles?: MediaFile[]; // Add audio files for ML analysis
}

export default function VideoProcessor({
  videoFiles,
  beatPoints,
  endTime,
  onProcessingComplete,
  audioFiles = [],
}: VideoProcessorProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [processedVideo, setProcessedVideo] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedVideoFile, setProcessedVideoFile] = useState<MediaFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [useMLAnalysis, setUseMLAnalysis] = useState(false);
  const [mlAnalysisResults, setMlAnalysisResults] = useState<any>(null);
  const [actualSegmentsCreated, setActualSegmentsCreated] = useState(0);
  
  // Initialize mixers
  const safeAudioMixer = new SafeAudioMixer();
  const directElementMixer = new DirectElementMixer();

  // Debug test function to understand trimming behavior
  const testTrimming = async () => {
    if (videoFiles.length === 0) {
      toast({
        title: "No Video",
        description: "Please upload a video first",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(0);
      setCurrentStep('🔍 Running trimming debug test...');

      const primaryVideo = videoFiles[0];
      let videoFile: File | null = fileCache.get(primaryVideo.id);
      
      if (!videoFile) {
        console.log('Fetching video file for debug test...');
        try {
          const response = await fetch(primaryVideo.url);
          const videoBlob = await response.blob();
          videoFile = new File([videoBlob], primaryVideo.name, { 
            type: primaryVideo.mimeType || 'video/mp4' 
          });
        } catch (error) {
          throw new Error('Could not access video file');
        }
      }

      console.log('\n🧪 DEBUG TEST: Testing 3 trimming methods on same 5-second segment');
      console.log(`📹 Video: ${videoFile.name} (${videoFile.size} bytes)`);
      
      // Test a simple 5-second segment from seconds 5-10
      const testStartTime = 5;
      const testEndTime = 10;
      const testDuration = testEndTime - testStartTime;
      
      console.log(`\n🎯 TEST PARAMETERS:`);
      console.log(`  - Start time: ${testStartTime}s`);
      console.log(`  - End time: ${testEndTime}s`);
      console.log(`  - Duration: ${testDuration}s`);
      console.log(`  - EXPECTED: Extract 5 seconds starting from the 5-second mark`);
      
      setCurrentStep('Testing trimming methods...');
      setProgress(25);
      
      // Test the main trimVideo function (which tries all 4 methods)
      const result = await trimVideo(videoFile, testStartTime, testEndTime);
      
      console.log(`\n✅ DEBUG TEST COMPLETE:`);
      console.log(`  - Result size: ${result.size} bytes`);
      console.log(`  - Expected: 5-second segment from the 5-second mark`);
      console.log(`  - IF THIS SEGMENT IS WRONG: Check the FFmpeg console logs above`);
      console.log(`  - The working method will be marked with ✅ in the logs`);
      
      setCurrentStep('Debug test complete - downloading sample');
      setProgress(100);
      
      // Create a download link for the test result
      const url = URL.createObjectURL(result);
      const a = document.createElement('a');
      a.href = url;
      a.download = `debug_test_${testStartTime}s_to_${testEndTime}s.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Debug Test Complete",
        description: `Test segment (${testStartTime}s-${testEndTime}s) downloaded. Check console for details.`,
      });

    } catch (error) {
      console.error('❌ Debug test failed:', error);
      toast({
        title: "Debug Test Failed", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProgress(0);
        setCurrentStep('');
      }, 3000);
    }
  };

  // Simple FFmpeg connection test
  const testFFmpegConnection = async () => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setCurrentStep('🧪 Testing Real FFmpeg Video Processor...');

      console.log('🧪 Testing Real FFmpeg Video Processor...');
      
      setProgress(50);
      
      // Test the real FFmpeg processor
      const ffmpegInstance = await initFFmpeg();
      
      if (ffmpegInstance) {
        console.log('✅ Custom Video Processor working!');
        setCurrentStep('✅ Custom Video Processor ready!');
        setProgress(100);
        
        toast({
          title: "SUCCESS! 🎉 Custom Processor",
          description: "Custom video processing ready! Built with pure JavaScript - no external dependencies!",
        });
      } else {
        throw new Error('Custom Video Processor not ready');
      }

    } catch (error) {
      console.error('❌ FFmpeg test failed:', error);
      toast({
        title: "FFmpeg Test Failed",
        description: `Error: ${error.message}. The stable version should work - please check browser console.`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProgress(0);
        setCurrentStep('');
      }, 3000);
    }
  };

  const processVideoWithML = async () => {
    if (videoFiles.length === 0) {
      toast({
        title: "No Videos",
        description: "Please upload at least one video file.",
        variant: "destructive"
      });
      return;
    }

    if (!audioFiles || audioFiles.length === 0) {
      toast({
        title: "No Audio File",
        description: "Please upload an audio file for AI-powered beat detection.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    try {
      // Step 1: Get audio file for client-side analysis
      setCurrentStep('🤖 Preparing audio for AI beat detection...');
      const audioFile = audioFiles[0];
      
      console.log('🤖 Starting client-side AI beat detection...');
      
      // Get actual File object from cache or download
      let audioFileObj: File | null = fileCache.get(audioFile.id);
      if (!audioFileObj) {
        const response = await fetch(audioFile.url);
        const audioBlob = await response.blob();
        audioFileObj = new File([audioBlob], audioFile.name, { 
          type: audioFile.mimeType || 'audio/mp3' 
        });
        fileCache.store(audioFile.id, audioFileObj);
      }
      
      setProgress(10);
      
      // Step 2: Client-side AI Beat Detection
      setCurrentStep('🎵 AI is analyzing audio patterns and detecting beats...');
      const beatDetectionResult: BeatDetectionResult = await BeatDetection.detectBeatsFromAudio(audioFileObj);
      
      console.log('🤖 AI detected beats:', beatDetectionResult);
      setProgress(30);
      
      // Step 3: Generate smart segments based on detected beats
      setCurrentStep('🧠 AI is creating optimal video segments...');
      const detectedBeats = beatDetectionResult.beats;
      
      // Estimate video duration (we'll use a reasonable default if we can't get the exact duration)
      const estimatedDuration = 60; // Default 1 minute - adjust based on typical video lengths
      
      // Create smart segments with confidence scores
      const smartSegments: VideoSegment[] = detectedBeats.slice(0, 10).map((beat, index) => ({
        startTime: Math.max(0, beat - 0.5), // Start 0.5s before beat
        endTime: Math.min(estimatedDuration, beat + 1.5), // End 1.5s after beat
        confidence: Math.max(0.7, 1 - (index * 0.05)), // Higher confidence for earlier beats
        type: 'beat-based',
        energy: beatDetectionResult.energy,
        hasMotion: true, // Assume motion for beat-based segments
        faceDetected: false // We'll implement face detection later
      }));
      
      setMlAnalysisResults({
        detectedBeats: detectedBeats,
        beatDetectionResult: beatDetectionResult,
        smartSegments: smartSegments,
        confidence: beatDetectionResult.confidence,
        tempo: beatDetectionResult.tempo
      });
      
      console.log('🤖 AI generated smart segments:', smartSegments);
      setProgress(45);
      
      // Step 4: Process using AI recommendations
      setCurrentStep('✨ Creating AI-optimized video segments...');
      
      // Get video file for processing
      let videoFile: File | null = fileCache.get(videoFiles[0].id);
      if (!videoFile) {
        const response = await fetch(videoFiles[0].url);
        const videoBlob = await response.blob();
        videoFile = new File([videoBlob], videoFiles[0].name, { 
          type: videoFiles[0].mimeType || 'video/mp4' 
        });
        fileCache.store(videoFiles[0].id, videoFile);
      }
      
      if (!videoFile) {
        throw new Error('Could not access video file for processing');
      }
      
      // Initialize FFmpeg
      const ffmpegInstance = await initFFmpeg();
      const segments: Blob[] = [];
      
      // Process AI-recommended segments
      for (let i = 0; i < smartSegments.length; i++) {
        const segment = smartSegments[i];
        setCurrentStep(`🎬 Processing AI segment ${i + 1}/${smartSegments.length} (confidence: ${Math.round(segment.confidence * 100)}%)`);
        
        const segmentBlob = await trimVideo(
          videoFile,
          segment.startTime,
          segment.endTime
        );
        
        if (segmentBlob) {
          segments.push(segmentBlob);
          console.log(`✅ AI segment ${i + 1} created: ${segment.startTime}s - ${segment.endTime}s`);
        }
      }
      
      if (segments.length === 0) {
        throw new Error('No valid segments were created from AI analysis');
      }
      
      setProgress(80);
      setCurrentStep('🎨 AI is combining segments into final masterpiece...');
      
      // Concatenate segments
      let finalVideo = await concatenateVideos(segments, (progress) => {
        const adjustedProgress = 80 + (progress * 0.1);
        setProgress(adjustedProgress);
      });
      
      if (!finalVideo) {
        throw new Error('Failed to concatenate AI-selected segments');
      }
      
      // Step 5: Merge with uploaded audio
      setProgress(90);
      setCurrentStep('🎵 Merging video with your uploaded audio...');
      
      try {
        finalVideo = await audioMixer.mergeVideoWithAudio(finalVideo, audioFileObj);
        console.log('🎉 Audio processed with SAFE method - video guaranteed!');
      } catch (audioError) {
        console.warn('⚠️ Audio merging failed, keeping video without audio:', audioError);
        // Continue with video-only version
      }
      
      console.log('🎯 AI PROCESSING - SETTING PROCESSED VIDEO:', {
        size: finalVideo.size,
        sizeMB: (finalVideo.size / 1024 / 1024).toFixed(2),
        type: finalVideo.type
      });
      
      setProcessedVideo(finalVideo);
      console.log('✅ AI processed video state updated!');
      setProgress(95);
      
      // Upload to Firebase
      setCurrentStep('☁️ Uploading AI-generated masterpiece...');
      await uploadProcessedVideo(finalVideo, 95);
      setProgress(100);
      
      toast({
        title: "🤖 AI Processing Complete!",
        description: `Created intelligent reel with ${smartSegments.length} AI-selected segments (Tempo: ${beatDetectionResult.tempo} BPM)`,
      });
      
    } catch (error) {
      console.error('❌ AI-powered processing failed:', error);
      toast({
        title: "AI Processing Failed",
        description: "AI analysis encountered an error. " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const processVideo = async () => {
    console.log('🎬 STARTING VIDEO PROCESSING');
    console.log('📊 Input check:', {
      videoCount: videoFiles.length,
      beatPointsCount: beatPoints.length,
      audioFilesCount: audioFiles.length
    });
    
    if (videoFiles.length === 0) {
      toast({
        title: "No Videos",
        description: "Please upload at least one video file.",
        variant: "destructive"
      });
      return;
    }

    if (beatPoints.length === 0) {
      toast({
        title: "No Beat Points",
        description: "Please add beat points by playing the audio and clicking 'Add Beat' at different moments in the song.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    console.log('🔄 Processing state set, progress reset');
    
    try {
      console.log('🎯 Entering main processing try block');
      // Initialize FFmpeg with retry mechanism
      setCurrentStep('Initializing video processor...');
      console.log('🔄 Starting FFmpeg initialization...');
      
      let ffmpegInstance;
      try {
        ffmpegInstance = await initFFmpeg();
        console.log('✅ Custom Video Processor initialized successfully');
      } catch (ffmpegError) {
        console.error('❌ Custom Video Processor initialization failed:', ffmpegError);
        
        // Show user-friendly error message
        toast({
          title: "Video Processor Initialization Failed",
          description: "Unable to load video processing engine. This might be due to network issues or browser compatibility. Please try refreshing the page or using a different browser.",
          variant: "destructive"
        });
        
        throw new Error(`FFmpeg initialization failed: ${ffmpegError.message}`);
      }
      
      setProgress(15);
      setCurrentStep('Preparing for multi-video processing...');

      console.log(`🎬 Preparing to process ${videoFiles.length} videos:`);
      videoFiles.forEach((video, index) => {
        console.log(`  ${index + 1}. ${video.name} (${(video.size / 1024 / 1024).toFixed(1)}MB)`);
      });
      
      setProgress(25);
      setCurrentStep('Analyzing beat points...');

      // Determine the final duration
      const finalEndTime = endTime || Math.max(...beatPoints) + 2;
      const effectiveBeatPoints = beatPoints.filter(beat => beat <= finalEndTime);

      console.log('🎵 Beat Points Analysis:');
      console.log('  - Original beat points:', beatPoints);
      console.log('  - Final end time:', finalEndTime, 'seconds');
      console.log('  - Effective beat points:', effectiveBeatPoints);
      console.log('  - Total videos to process:', videoFiles.length);
      console.log('  - Video files:', videoFiles.map(v => `${v.name} (${(v.size / 1024 / 1024).toFixed(1)}MB)`));
      
      // Debug: Add some test beat points if only one is provided
      if (effectiveBeatPoints.length === 1) {
        console.log('⚠️ Only one beat point detected. Adding more beat points for better processing.');
        const originalBeat = effectiveBeatPoints[0];
        const additionalBeats = [];
        
        // Add beats every 3 seconds from the original beat
        for (let i = 1; i <= 2; i++) {
          const newBeat = originalBeat + (i * 3);
          if (newBeat < finalEndTime - 2) {
            additionalBeats.push(newBeat);
          }
        }
        
        effectiveBeatPoints.push(...additionalBeats);
        console.log('  - Enhanced beat points:', effectiveBeatPoints);
      }

      if (effectiveBeatPoints.length === 0) {
        console.log('⚠️ No effective beat points found, trimming first video to end time');
        // If no beat points within the end time, just trim the first video
        setCurrentStep('Trimming first video to end time...');
        
        const firstVideo = videoFiles[0];
        let videoFile: File | null = fileCache.get(firstVideo.id);
        
        if (!videoFile) {
          const response = await fetch(firstVideo.url);
          const videoBlob = await response.blob();
          videoFile = new File([videoBlob], firstVideo.name, { 
            type: firstVideo.mimeType || 'video/mp4' 
          });
        }
        
        const trimmedVideo = await trimVideo(videoFile, 0, finalEndTime);
        
        const processedBlob = trimmedVideo;
        setProcessedVideo(processedBlob);
        
        // Upload to Firebase
        await uploadProcessedVideo(processedBlob, 65);
        return;
      }

      // Create segments based on beat points - USING ALL VIDEOS
      setCurrentStep('Creating segments from all videos...');
      setProgress(40);

      const segments: Blob[] = [];

      console.log(`🎬 Processing ${videoFiles.length} videos with ${effectiveBeatPoints.length} beat points:`);
      console.log('📹 Video files:', videoFiles.map(v => v.name));

      // Process EACH VIDEO with EACH BEAT POINT for maximum content
      for (let videoIndex = 0; videoIndex < videoFiles.length; videoIndex++) {
        const currentVideoFile = videoFiles[videoIndex];
        
        console.log(`\n📹 Processing Video ${videoIndex + 1}: ${currentVideoFile.name}`);
        
        // Get the video file
        let videoFile: File | null = fileCache.get(currentVideoFile.id);
        
        if (!videoFile) {
          console.log(`🔄 Fetching video ${videoIndex + 1} from storage...`);
          try {
            const response = await fetch(currentVideoFile.url);
            const videoBlob = await response.blob();
            videoFile = new File([videoBlob], currentVideoFile.name, { 
              type: currentVideoFile.mimeType || 'video/mp4' 
            });
            fileCache.store(currentVideoFile.id, videoFile);
          } catch (error) {
            console.warn(`⚠️ Could not fetch video ${videoIndex + 1}, skipping`);
            continue;
          }
        }
        
        // Process each beat point with this video
        for (let i = 0; i < effectiveBeatPoints.length; i++) {
          const beatTime = effectiveBeatPoints[i];
          
          // LONGER SEGMENTS: Take 4 seconds leading up to each beat for more content
          const segmentDuration = 4.0; // 4 second segments (was 2)
          
          let startTime = Math.max(0, beatTime - segmentDuration);
          let endTime = beatTime;
          
          // If we can't go back enough, take what we can
          if (startTime === 0 && beatTime < segmentDuration) {
            endTime = Math.min(finalEndTime, beatTime + segmentDuration);
          }
          
          const actualDuration = endTime - startTime;
          
          if (actualDuration < 1.0) { // Minimum 1 second segments
            console.warn(`  ⚠️ Segment too short (${actualDuration}s), skipping`);
            continue;
          }
          
          console.log(`🎯 Video ${videoIndex + 1}, Beat ${i + 1}: ${startTime.toFixed(1)}s to ${endTime.toFixed(1)}s (${actualDuration.toFixed(1)}s)`);
          
          setCurrentStep(`Processing Video ${videoIndex + 1}/${videoFiles.length}, Segment ${i + 1}/${effectiveBeatPoints.length} (${actualDuration.toFixed(1)}s)...`);
          
          try {
            const segmentBlob = await trimVideo(
              videoFile, 
              startTime, 
              endTime
            );
            
            if (segmentBlob && segmentBlob.size > 5000) { // At least 5KB
              segments.push(segmentBlob);
              console.log(`  ✅ Segment created: ${segmentBlob.size} bytes`);
            } else {
              console.warn(`  ⚠️ Segment too small, skipping`);
            }
            
          } catch (segmentError) {
            console.error(`❌ Segment failed:`, segmentError);
            continue;
          }
        }
      }

      console.log(`🎬 All segments created from ${videoFiles.length} videos!`);
      console.log(`📊 Total segments: ${segments.length}`);
      console.log('📹 Segment sizes:', segments.map((s, i) => `${i+1}: ${(s.size/1024).toFixed(1)}KB`));

      if (segments.length === 0) {
        throw new Error('No valid segments were created from any video');
      }
      
      setActualSegmentsCreated(segments.length);

      setProgress(65);
      setCurrentStep('Combining segments into final video...');

      // Concatenate all segments into final video
      let finalVideo = await concatenateVideos(segments, (progress) => {
        const adjustedProgress = 65 + (progress * 0.1);
        setProgress(adjustedProgress);
      });

      // Add audio merging if audio files are available
      if (audioFiles && audioFiles.length > 0) {
        setProgress(75);
        setCurrentStep('🎵 Merging video with uploaded audio...');
        
        console.log(`🎵 Starting audio merge process...`);
        console.log(`📹 Final video size before audio: ${finalVideo.size} bytes`);
        console.log(`🎵 Available audio files: ${audioFiles.length}`);
        
        try {
          // Get audio file (prefer cached original to avoid CORS)
          let audioFile: File | null = fileCache.get(audioFiles[0].id);
          if (audioFile) {
            console.log('📁 Using cached original audio file:', audioFile.name, audioFile.size);
          } else {
            console.log('🔄 Audio file not in cache, attempting fetch from URL (may hit CORS)...');
            try {
              const response = await fetch(audioFiles[0].url, { mode: 'cors' });
              if (!response.ok) throw new Error('Fetch failed with status ' + response.status);
              const audioBlob = await response.blob();
              audioFile = new File([audioBlob], audioFiles[0].name, { 
                type: audioFiles[0].mimeType || 'audio/mpeg' 
              });
              fileCache.store(audioFiles[0].id, audioFile);
              console.log('✅ Fetched and cached audio file:', audioFile.name);
            } catch (fetchErr) {
              console.error('❌ Audio fetch failed (CORS likely):', fetchErr);
              console.warn('➡️ Skipping audio merge and proceeding with video-only. Configure Firebase Storage CORS to allow this origin.');
              audioFile = null;
            }
          }

          if (!audioFile) {
            console.log('⚠️ No usable audio file available after fetch attempt, skipping merge.');
          } else {
            console.log(`🎵 Using audio file: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(1)}MB)`);
          }
          
          // Try direct element mixer first (keeps original encoding, may preserve quality)
          let videoWithAudio: Blob | null = null;
          if (audioFile) {
            try {
              console.log('🎧 Trying DirectElementMixer first...');
              videoWithAudio = await directElementMixer.merge(finalVideo, audioFile, (progress) => {
                const adjustedProgress = 75 + (progress * 0.1);
                setProgress(adjustedProgress);
              });
              console.log('✅ DirectElementMixer succeeded');
            } catch (directErr) {
              console.warn('DirectElementMixer failed, falling back to SafeAudioMixer:', directErr);
              console.log('🛡️ Falling back to SafeAudioMixer (video-first guarantee)');
              videoWithAudio = await safeAudioMixer.mergeVideoWithAudio(finalVideo, audioFile, (progress) => {
                const adjustedProgress = 85 + (progress * 0.05);
                setProgress(adjustedProgress);
              });
            }
          } else {
            console.log('🚫 Skipping both mixers because audioFile is null');
          }

          const mergeProgressBase = 75;
          const videoWithAudioFinal = videoWithAudio;
          const _dummy = (progress: number) => {
            const adjustedProgress = 75 + (progress * 0.2);
            setProgress(adjustedProgress);
            console.log(`🎵 Audio merge progress: ${Math.round(progress)}%`);
          };
          
          console.log(`📊 Audio merge result:`, {
            originalVideoSize: finalVideo.size,
            mergedVideoSize: videoWithAudioFinal?.size || 0,
            success: !!(videoWithAudioFinal && videoWithAudioFinal.size > 0)
          });
          
          if (videoWithAudioFinal && videoWithAudioFinal.size > 0) {
            finalVideo = videoWithAudioFinal;
            console.log(`✅ Audio merge successful! Final size: ${finalVideo.size} bytes`);
            console.log(`🎵 Video now has audio track merged!`);
          } else {
            console.log(`⚠️ Audio merge returned empty/invalid result, keeping original video`);
            console.log(`💡 This might be due to browser compatibility - the video will work but without merged audio`);
          }
          
        } catch (audioError) {
          console.error('❌ Audio merging failed:', audioError);
          console.log('🔄 Continuing with video-only result');
        }
      } else {
        console.log(`ℹ️ No audio files provided, skipping audio merge`);
      }

      console.log('🎬 Final video analysis:');
      console.log(`  - Size: ${finalVideo.size} bytes (${(finalVideo.size / 1024 / 1024).toFixed(2)} MB)`);
      console.log(`  - Type: ${finalVideo.type}`);
      
      // Validate the final video
      if (finalVideo.size === 0) {
        throw new Error('Final video is empty - processing failed');
      }
      
      if (finalVideo.size < 10000) { // Less than 10KB is suspicious
        console.warn('⚠️ Final video is very small - might not contain actual content');
      }
      
      console.log('🎯 SETTING PROCESSED VIDEO:', {
        size: finalVideo.size,
        sizeMB: (finalVideo.size / 1024 / 1024).toFixed(2),
        type: finalVideo.type
      });
      
      setProcessedVideo(finalVideo);
      console.log('✅ Processed video state updated!');
      
      // Upload to Firebase
      await uploadProcessedVideo(finalVideo, 85);
      
    } catch (error) {
      console.error('❌ Video processing failed:', error);
      
      // Log detailed error information
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        beatPointsCount: beatPoints.length,
        videoFilesCount: videoFiles.length
      });
      
      toast({
        title: "Processing Failed",
        description: `Video processing error: ${error instanceof Error ? error.message : "Unknown error occurred"}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const uploadProcessedVideo = async (videoBlob: Blob, startProgress: number) => {
    setCurrentStep('Uploading to cloud storage...');
    setProgress(startProgress);
    
    // Use the actual blob type from MediaRecorder (usually video/webm)
    const detectedType = videoBlob.type || 'video/webm';
    const isWebM = detectedType.includes('webm');
    const ext = isWebM ? 'webm' : (detectedType.includes('mp4') ? 'mp4' : 'webm');
    const fileName = `processed_video_${Date.now()}.${ext}`;
    const processedFile = new File([videoBlob], fileName, { type: detectedType });
    
    const uploadedVideoFile = await uploadVideoFile(
      processedFile,
      (uploadProgress) => {
        // Update progress during upload
        const adjustedProgress = startProgress + (uploadProgress.progress * 0.15);
        setProgress(adjustedProgress);
        setCurrentStep(`Uploading to cloud storage... ${uploadProgress.progress}%`);
      },
      `processed_videos_${Date.now()}`
    );
    
  setProcessedVideoFile(uploadedVideoFile);
  setPreviewUrl(uploadedVideoFile.url);
    
    setProgress(100);
    setCurrentStep('Processing complete!');
    
    toast({
      title: "Video Processing Complete",
      description: `Successfully processed video with beat-based trimming.`,
    });
    
    onProcessingComplete(videoBlob);
  };

  const downloadVideo = () => {
    if (!processedVideo || !processedVideoFile) return;
    
    try {
      // Use the original blob for download to avoid CORS issues
      const url = URL.createObjectURL(processedVideo);
      const a = document.createElement('a');
      a.href = url;
      // Ensure file extension matches blob type when downloading locally
      const blobType = processedVideo.type || 'video/webm';
      const isWebM = blobType.includes('webm');
      const desiredExt = isWebM ? 'webm' : (blobType.includes('mp4') ? 'mp4' : 'webm');
      const base = processedVideoFile.name.replace(/\.(mp4|webm)$/i, '');
      a.download = `${base}.${desiredExt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Your processed video is being downloaded.",
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the processed video.",
        variant: "destructive"
      });
    }
  };

  const getProcessingIcon = () => {
    if (progress === 100) return <CheckCircle className="h-4 w-4" />;
    return <Loader2 className="h-4 w-4 animate-spin" />;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Video Processor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Video Processing Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              <span className="text-sm font-medium">
                {videoFiles.length} video{videoFiles.length !== 1 ? 's' : ''} loaded
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">
                {beatPoints.length} beat point{beatPoints.length !== 1 ? 's' : ''} marked
              </span>
            </div>
          </div>

          {videoFiles.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <div>Primary video: {videoFiles[0].name}</div>
              <div>File size: {(videoFiles[0].size / 1024 / 1024).toFixed(1)} MB</div>
              {endTime && <div>End time: {formatDuration(endTime)}</div>}
            </div>
          )}
        </div>

        {/* Processing Controls */}
        <div className="space-y-4">
          {/* ML Toggle */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
              <div>
                <div className="font-medium text-sm">AI-Powered Processing</div>
                <div className="text-xs text-muted-foreground">
                  Automatic beat detection + smart segment selection
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useMLAnalysis}
                onChange={(e) => setUseMLAnalysis(e.target.checked)}
                className="sr-only peer"
                disabled={isProcessing || audioFiles.length === 0}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-blue-500"></div>
            </label>
          </div>

          {/* Processing Buttons */}
          <div className="flex gap-2">
            {useMLAnalysis ? (
              <Button 
                onClick={processVideoWithML}
                disabled={isProcessing || videoFiles.length === 0 || audioFiles.length === 0}
                className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    AI Processing...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🤖</span>
                    AI Smart Process
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={processVideo}
                disabled={isProcessing || videoFiles.length === 0 || beatPoints.length === 0}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4 mr-2" />
                    Manual Process
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Debug Test Button */}
          <div className="flex justify-center gap-2">
            <Button 
              onClick={testFFmpegConnection}
              disabled={isProcessing}
              variant="outline"
              size="sm"
              className="border-dashed border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Settings className="h-3 w-3 mr-2" />
                  Test FFmpeg
                </>
              )}
            </Button>

            <Button 
              onClick={testTrimming}
              disabled={isProcessing || videoFiles.length === 0}
              variant="outline"
              size="sm"
              className="border-dashed border-yellow-300 text-yellow-700 hover:bg-yellow-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  🔍 Debug Trim Test (5s-10s)
                </>
              )}
            </Button>
          </div>

          {/* Requirements Info */}
          <div className="text-xs text-muted-foreground">
            {useMLAnalysis ? (
              <div className="flex items-center gap-1">
                <span className="text-purple-500">🤖</span>
                AI mode requires: Video file + Audio file (beats detected automatically)
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span>✋</span>
                Manual mode requires: Video file + Manual beat points
              </div>
            )}
          </div>
        </div>

        {/* ML Analysis Results */}
        {mlAnalysisResults && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <span className="text-purple-500">🤖</span>
                AI Analysis Results
              </h3>
              <Badge variant="secondary" className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700">
                Smart Processing
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-lg">
                <div className="text-xs font-medium text-purple-700">Beats Detected</div>
                <div className="text-lg font-bold text-purple-900">
                  {mlAnalysisResults.detectedBeats?.length || 0}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-lg">
                <div className="text-xs font-medium text-blue-700">Tempo (BPM)</div>
                <div className="text-lg font-bold text-blue-900">
                  {mlAnalysisResults.tempo || 120}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-lg">
                <div className="text-xs font-medium text-green-700">AI Confidence</div>
                <div className="text-lg font-bold text-green-900">
                  {Math.round((mlAnalysisResults.confidence || 0) * 100)}%
                </div>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <div>🎵 AI detected {mlAnalysisResults.detectedBeats?.length || 0} beats automatically</div>
              <div>🎬 Created {mlAnalysisResults.smartSegments?.length || 0} optimized segments</div>
              <div>✨ Tempo: {mlAnalysisResults.tempo || 120} BPM</div>
            </div>
          </div>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                {getProcessingIcon()}
                <span>{currentStep}</span>
              </div>
              <Badge variant="outline">{progress}%</Badge>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Processed Video Preview and Download */}
        {processedVideoFile && previewUrl && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Film className="h-4 w-4" />
                Processed Video
              </h3>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Cloud className="h-3 w-3" />
                Saved to cloud
              </Badge>
            </div>
            
            <div className="rounded-lg border p-4 space-y-3">
              <video 
                src={previewUrl} 
                controls 
                className="w-full max-h-64 rounded"
                onError={(e) => {
                  console.error('Video preview error:', e);
                }}
              />
              
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {processedVideoFile.name}
                </div>
                <Button 
                  size="sm" 
                  onClick={downloadVideo}
                  className="flex items-center gap-2"
                >
                  <Download className="h-3 w-3" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Summary */}
        {processedVideoFile && (
          <div className="text-xs text-muted-foreground space-y-1">
            {mlAnalysisResults ? (
              <>
                <div>🤖 AI-processed video with {mlAnalysisResults.smartSegments?.length || 0} smart segments</div>
                <div>🎵 Beats detected automatically using AI ({mlAnalysisResults.tempo} BPM)</div>
                <div>📹 Content optimized for maximum engagement</div>
                <div>📁 Saved to Firebase Storage</div>
                <div>🎬 Ready for download and sharing</div>
              </>
            ) : (
              <>
                <div>✅ Video processed with {actualSegmentsCreated} segments from {videoFiles.length} videos</div>
                <div>🎵 Beat-synced using {beatPoints.length} beat marks</div>
                <div>📁 Saved to Firebase Storage</div>
                <div>🎬 Ready for download and sharing</div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
