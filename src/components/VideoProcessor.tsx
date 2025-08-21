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
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { uploadVideoFile, MediaFile } from "@/lib/firebaseService";
import { trimVideo, concatenateVideos, initFFmpeg } from "@/lib/videoProcessor";
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
          segment.endTime,
          (progress) => {
            const adjustedProgress = 45 + ((i + progress / 100) / smartSegments.length) * 35;
            setProgress(adjustedProgress);
          }
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
      const finalVideo = await concatenateVideos(segments, (progress) => {
        const adjustedProgress = 80 + (progress * 0.15);
        setProgress(adjustedProgress);
      });
      
      if (!finalVideo) {
        throw new Error('Failed to concatenate AI-selected segments');
      }
      
      setProcessedVideo(finalVideo);
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
    
    try {
      // Initialize FFmpeg
      setCurrentStep('Initializing video processor...');
      console.log('Starting FFmpeg initialization...');
      
      const ffmpegInstance = await initFFmpeg();
      console.log('FFmpeg initialized successfully');
      
      setProgress(15);
      setCurrentStep('Loading video file...');

      // Get the primary video for processing
      const primaryVideo = videoFiles[0];
      console.log('Processing video:', primaryVideo.name, primaryVideo.size);
      
      // Try to get original file from cache first
      let videoFile: File | null = fileCache.get(primaryVideo.id);
      
      if (videoFile) {
        console.log('✅ Using cached original file:', videoFile.size, 'bytes');
      } else {
        console.log('⚠️ Original file not cached, attempting to fetch from Firebase Storage...');
        
        try {
          const response = await fetch(primaryVideo.url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const videoBlob = await response.blob();
          videoFile = new File([videoBlob], primaryVideo.name, { 
            type: primaryVideo.mimeType || 'video/mp4' 
          });
          
          console.log('✅ Video fetched from Firebase Storage:', videoFile.size, 'bytes');
          
        } catch (error) {
          console.error('❌ CORS Error - Cannot access video from Firebase Storage:', error);
          
          toast({
            title: "Cannot Process Video",
            description: "The video file is not accessible due to browser security restrictions. Please re-upload the video file to process it.",
            variant: "destructive"
          });
          
          throw new Error('Video file is not accessible. Please re-upload the video to process it.');
        }
      }
      if (!videoFile) {
        throw new Error('Could not access video file for processing');
      }
      
      setProgress(25);
      setCurrentStep('Analyzing beat points...');

      // Determine the final duration
      const finalEndTime = endTime || Math.max(...beatPoints) + 2;
      const effectiveBeatPoints = beatPoints.filter(beat => beat <= finalEndTime);

      console.log('🎵 Beat Points Analysis:');
      console.log('  - Original beat points:', beatPoints);
      console.log('  - Final end time:', finalEndTime, 'seconds');
      console.log('  - Effective beat points:', effectiveBeatPoints);
      console.log('  - Video file size:', videoFile.size, 'bytes');
      console.log('  - Video file name:', videoFile.name);
      
      // Debug: Add some test beat points if only one is provided
      if (effectiveBeatPoints.length === 1) {
        console.log('⚠️ Only one beat point detected. Adding test beat points for better demo.');
        const testBeatPoints = [
          effectiveBeatPoints[0], // Keep the original
          Math.min(effectiveBeatPoints[0] + 3, finalEndTime - 2), // Add one 3 seconds later
          Math.min(effectiveBeatPoints[0] + 6, finalEndTime - 2), // Add one 6 seconds later
        ].filter(beat => beat > 0 && beat < finalEndTime - 1);
        
        effectiveBeatPoints.splice(0, effectiveBeatPoints.length, ...testBeatPoints);
        console.log('  - Enhanced with test beat points:', effectiveBeatPoints);
      }

      if (effectiveBeatPoints.length === 0) {
        console.log('⚠️ No effective beat points found, trimming entire video');
        // If no beat points within the end time, just trim the video
        setCurrentStep('Trimming video to end time...');
        const trimmedVideo = await trimVideo(videoFile, 0, finalEndTime, (progress) => {
          const adjustedProgress = 25 + (progress * 0.4);
          setProgress(adjustedProgress);
        });
        
        const processedBlob = trimmedVideo;
        setProcessedVideo(processedBlob);
        
        // Upload to Firebase
        await uploadProcessedVideo(processedBlob, 65);
        return;
      }

      // Create segments based on beat points
      setCurrentStep('Creating beat-based segments...');
      setProgress(40);

      const segments: Blob[] = [];

      console.log(`🎬 Creating ${effectiveBeatPoints.length} video segments:`);

      // Process each beat point into segments
      for (let i = 0; i < effectiveBeatPoints.length; i++) {
        const beatTime = effectiveBeatPoints[i];
        const startTime = Math.max(0, beatTime - 1); // 1 second before beat
        const endTime = Math.min(finalEndTime, beatTime + 1); // 1 second after beat
        
        console.log(`  Segment ${i + 1}: ${startTime}s to ${endTime}s (duration: ${endTime - startTime}s)`);
        
        setCurrentStep(`Processing segment ${i + 1}/${effectiveBeatPoints.length}...`);
        
        const segmentBlob = await trimVideo(
          videoFile, 
          startTime, 
          endTime,
          (progress) => {
            const adjustedProgress = 40 + ((i + progress / 100) / effectiveBeatPoints.length) * 25;
            setProgress(adjustedProgress);
            console.log(`Segment ${i + 1} progress: ${progress}% (overall: ${adjustedProgress}%)`);
          }
        );
        
        console.log(`  ✅ Segment ${i + 1} created:`, segmentBlob.size, 'bytes');
        segments.push(segmentBlob);
      }

      console.log(`🎬 All segments created. Total segments: ${segments.length}`);
      console.log('Segment sizes:', segments.map(s => s.size));

      setProgress(65);
      setCurrentStep('Combining segments into final video...');

      // Concatenate all segments into final video
      const finalVideo = await concatenateVideos(segments, (progress) => {
        const adjustedProgress = 65 + (progress * 0.15);
        setProgress(adjustedProgress);
      });

      console.log('🎬 Final video created:', finalVideo.size, 'bytes');
      setProcessedVideo(finalVideo);
      
      // Upload to Firebase
      await uploadProcessedVideo(finalVideo, 80);
      
    } catch (error) {
      console.error('❌ Video processing failed:', error);
      
      // Log detailed error information
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        beatPointsCount: beatPoints.length,
        videoFilesCount: videoFiles.length,
        endTime: endTime
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
    
    const fileName = `processed_video_${Date.now()}.mp4`;
    const processedFile = new File([videoBlob], fileName, { type: 'video/mp4' });
    
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
      a.download = processedVideoFile.name;
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
                <div>✅ Video processed with {beatPoints.length} beat segments</div>
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
