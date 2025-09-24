import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Music, Upload, X, Play, Pause, Cloud, CheckCircle, AlertCircle, Bug } from "lucide-react";
import { uploadAudioFile, UploadProgress, MediaFile, testStorageConnection } from "@/lib/firebaseService";
import { fileCache } from "@/lib/fileCache";
import { useAuth } from "@/contexts/AuthContext";

interface AudioUploadProps {
  onAudioUpload: (file: MediaFile | null) => void;
  audioFile: MediaFile | null;
  projectId?: string;
}

const AudioUpload = ({ onAudioUpload, audioFile, projectId }: AudioUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState<UploadProgress | null>(null);
  const { user } = useAuth();

  // Debug function to test Firebase connection
  const debugConnection = async () => {
    console.log('🔍 DEBUGGING AUDIO UPLOAD CONNECTION');
    console.log('===================================');
    
    // Check authentication
    console.log('🔐 Authentication Status:');
    console.log('  User:', user ? 'Authenticated ✅' : 'Not authenticated ❌');
    if (user) {
      console.log('  User ID:', user.uid);
      console.log('  Email:', user.email);
    }
    
    // Test storage connection
    console.log('🔥 Firebase Storage Test:');
    try {
      const storageConnected = await testStorageConnection();
      console.log('  Storage Connection:', storageConnected ? 'Success ✅' : 'Failed ❌');
    } catch (error) {
      console.error('  Storage Error:', error);
    }
    
    alert('Debug results logged to console. Press F12 to view.');
  };

  const handleFileSelect = async (file: File) => {
    console.log('🎵 Audio upload attempt:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      isAudio: file.type.startsWith('audio/')
    });

    if (!file.type.startsWith('audio/')) {
      console.error('❌ Not an audio file:', file.type);
      alert('Please select an audio file (MP3, WAV, M4A, etc.)');
      return;
    }

    if (!user) {
      console.error('❌ No authenticated user');
      alert('Please sign in to upload audio');
      return;
    }

    console.log('✅ User authenticated:', user.uid, user.email);

    try {
      setUploading({
        fileName: file.name,
        progress: 0,
        status: 'uploading'
      });

      console.log('🚀 Starting audio upload...');
      const uploadedFile = await uploadAudioFile(
        file,
        (progress) => {
          console.log('📈 Upload progress:', progress);
          setUploading(progress);
        },
        projectId
      );

      console.log('✅ Audio upload successful:', uploadedFile);
      onAudioUpload(uploadedFile);

      // Cache original File so later processing does not need to refetch (avoids CORS issues)
      try {
        fileCache.store(uploadedFile.id, file);
        console.log('📁 Cached original audio file for', uploadedFile.id, file.name, file.size);
      } catch (e) {
        console.warn('Could not cache original audio file:', e);
      }

      // Remove upload state after a brief delay
      setTimeout(() => {
        setUploading(null);
      }, 2000);

    } catch (error) {
      console.error('❌ Audio upload failed:', error);
      
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      console.error('Full error details:', {
        message: errorMessage,
        error: error,
        user: user?.uid,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });
      
      setUploading({
        fileName: file.name,
        progress: 0,
        status: 'error',
        error: errorMessage
      });
      
      // Show alert with specific error
      alert(`Audio upload failed: ${errorMessage}`);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeAudio = () => {
    onAudioUpload(null);
    setIsPlaying(false);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5 text-primary" />
          Audio Track
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Upload Progress */}
        {uploading && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {uploading.status === 'uploading' && (
                  <Cloud className="w-4 h-4 text-blue-500 animate-pulse" />
                )}
                {uploading.status === 'completed' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {uploading.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm font-medium">{uploading.fileName}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {uploading.status === 'uploading' && `${uploading.progress}%`}
                {uploading.status === 'completed' && 'Uploaded'}
                {uploading.status === 'error' && 'Failed'}
              </span>
            </div>
            {uploading.status === 'uploading' && (
              <Progress value={uploading.progress} className="h-2" />
            )}
            {uploading.status === 'error' && uploading.error && (
              <p className="text-xs text-red-500">{uploading.error}</p>
            )}
          </div>
        )}

        {!audioFile && !uploading ? (
          <div
            className={`upload-zone ${isDragOver ? 'dragover' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center space-y-3">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto">
                <Music className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold mb-1">Add Audio Track</p>
                <p className="text-sm text-muted-foreground">
                  Drop an audio file or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Supports MP3, WAV, M4A files • {user ? 'File will be saved to your account' : 'Sign in to save files'}
                </p>
                <Button
                  variant="ghost"
                  onClick={debugConnection}
                  className="mt-3 text-xs"
                  size="sm"
                >
                  <Bug className="w-3 h-3 mr-2" />
                  Debug Upload Issue
                </Button>
              </div>
            </div>
          </div>
        ) : audioFile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-primary/20">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{audioFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(audioFile.size)} • Uploaded to cloud
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const audio = document.querySelector('audio');
                    if (audio) {
                      if (isPlaying) {
                        audio.pause();
                      } else {
                        audio.play();
                      }
                      setIsPlaying(!isPlaying);
                    }
                  }}
                  className="hover:bg-primary/20"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeAudio}
                  className="hover:bg-destructive/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Audio Player */}
            <div className="space-y-3">
              <audio
                src={audioFile.url}
                controls
                className="w-full"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
            </div>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Replace Audio
            </Button>
            
            <Button
              variant="ghost"
              onClick={debugConnection}
              className="w-full mt-2 text-xs"
              size="sm"
            >
              <Bug className="w-3 h-3 mr-2" />
              Debug Upload Issue
            </Button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
};

export default AudioUpload;