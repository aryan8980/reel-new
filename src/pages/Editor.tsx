import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Play, 
  Pause, 
  Download, 
  Wand2, 
  Music, 
  Video,
  Hash,
  Settings,
  User
} from "lucide-react";
import AudioUpload from "@/components/AudioUpload";
import VideoUpload from "@/components/VideoUpload";
import BeatTimeline from "@/components/BeatTimeline";
import HashtagGenerator from "@/components/HashtagGenerator";
import SettingsModal from "@/components/SettingsModal";
import VideoProcessor from "@/components/VideoProcessor";
import { useNavigate } from "react-router-dom";
import { MediaFile } from "@/lib/firebaseService";
import { useAuth } from "@/contexts/AuthContext";

const Editor = () => {
  const [audioFile, setAudioFile] = useState<MediaFile | null>(null);
  const [videoFiles, setVideoFiles] = useState<MediaFile[]>([]);
  const [beatPoints, setBeatPoints] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [endTime, setEndTime] = useState<number | undefined>(undefined);
  const [processedVideo, setProcessedVideo] = useState<Blob | null>(null);
  const [projectId] = useState<string>(() => `project_${Date.now()}`);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleExport = async () => {
    if (!videoRef.current || !canvasRef.current || videoFiles.length === 0) return;
    
    setIsExporting(true);
    setExportProgress(0);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Create MediaRecorder for video output
    const stream = canvas.captureStream();
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=h264'
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    
    mediaRecorder.onstop = () => {
      // Combine all chunks and create download
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'final-reel.mp4';
      a.click();
      setIsExporting(false);
    };

    // Start recording
    mediaRecorder.start();

    // Process each beat segment
    for (let i = 0; i < beatPoints.length - 1; i++) {
      const start = beatPoints[i];
      const end = beatPoints[i + 1];
      
      // Seek to start time
      video.currentTime = start;
      
      // Wait for video to seek
      await new Promise(resolve => {
        video.onseeked = resolve;
      });

      // Draw frames until end time
      while (video.currentTime < end) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        video.currentTime += 1/30; // 30fps
        
        // Update progress
        const progress = ((i + (video.currentTime - start) / (end - start)) / (beatPoints.length - 1)) * 100;
        setExportProgress(Math.min(Math.round(progress), 100));
        
        // Wait for next frame
        await new Promise(requestAnimationFrame);
      }
    }

    // Stop recording
    mediaRecorder.stop();
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleUserClick = () => {
    navigate("/account");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hidden video and canvas for processing */}
      <video 
        ref={videoRef} 
        style={{ display: 'none' }} 
        src={videoFiles[0]?.url || ''} 
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">ReelEditr</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleSettingsClick}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleUserClick}>
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 max-w-7xl mx-auto space-y-6">
        {/* Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AudioUpload 
            onAudioUpload={setAudioFile}
            audioFile={audioFile}
            projectId={projectId}
          />
          <VideoUpload 
            onVideoUpload={setVideoFiles}
            uploadedVideos={videoFiles}
            projectId={projectId}
          />
        </div>

        {/* Timeline Section */}
        {audioFile && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Beat Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BeatTimeline 
                audioFile={audioFile}
                beatPoints={beatPoints}
                onBeatPointsChange={setBeatPoints}
                isPlaying={isPlaying}
                onPlayToggle={setIsPlaying}
                endTime={endTime}
                onEndTimeChange={setEndTime}
              />
            </CardContent>
          </Card>
        )}

        {/* Controls & Export */}
        <div className="grid grid-cols-1 gap-6">
          {/* Hashtag Generator */}
          <HashtagGenerator />
          
          {/* Video Processing */}
          <VideoProcessor 
            videoFiles={videoFiles}
            beatPoints={beatPoints}
            endTime={endTime}
            onProcessingComplete={setProcessedVideo}
            audioFiles={audioFile ? [audioFile] : []}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="glass-card text-center p-4">
            <Music className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Audio</p>
            <p className="font-semibold">{audioFile ? "1 file" : "No file"}</p>
          </Card>
          <Card className="glass-card text-center p-4">
            <Video className="w-6 h-6 text-secondary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Videos</p>
            <p className="font-semibold">{videoFiles.length} files</p>
          </Card>
          <Card className="glass-card text-center p-4">
            <Wand2 className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Beats</p>
            <p className="font-semibold">{beatPoints.length} marks</p>
          </Card>
          <Card className="glass-card text-center p-4">
            <Hash className="w-6 h-6 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">End Time</p>
            <p className="font-semibold">
              {endTime ? `${endTime.toFixed(1)}s` : "Not set"}
            </p>
          </Card>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings} 
        onClose={handleCloseSettings} 
      />
    </div>
  );
};

export default Editor;