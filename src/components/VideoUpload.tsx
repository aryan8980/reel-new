import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Video, Upload, X, Plus, Cloud, CheckCircle, AlertCircle } from "lucide-react";
import { uploadVideoFile, UploadProgress, MediaFile, testStorageConnection } from "@/lib/firebaseService";
import { useAuth } from "@/contexts/AuthContext";
import { fileCache } from "@/lib/fileCache";

interface VideoUploadProps {
  onVideoUpload: (files: MediaFile[]) => void;
  uploadedVideos: MediaFile[];
  projectId?: string;
}

const VideoUpload = ({ onVideoUpload, uploadedVideos, projectId }: VideoUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState<{[key: string]: UploadProgress}>({});
  const { user } = useAuth();

  console.log('🎬 VideoUpload render - uploadedVideos:', uploadedVideos.length, uploadedVideos);

  const handleFileSelect = async (newFiles: FileList) => {
    console.log('🎬 handleFileSelect called with files:', newFiles.length);
    
    if (!user) {
      console.error('❌ No user found - please sign in');
      alert('Please sign in to upload videos');
      return;
    }
    
    console.log('✅ User authenticated:', user.uid, user.email);

    const validFiles = Array.from(newFiles).filter(file => 
      file.type.startsWith('video/')
    );
    
    console.log('📹 Valid video files:', validFiles.length, 'out of', newFiles.length);

    if (validFiles.length === 0) {
      alert('Please select valid video files');
      return;
    }

    for (const file of validFiles) {
      const uploadId = `${Date.now()}_${file.name}`;
      
      try {
        setUploading(prev => ({
          ...prev,
          [uploadId]: {
            fileName: file.name,
            progress: 0,
            status: 'uploading'
          }
        }));

        const uploadedFile = await uploadVideoFile(
          file,
          (progress) => {
            setUploading(prev => ({
              ...prev,
              [uploadId]: progress
            }));
          },
          projectId
        );

        console.log('✅ Video uploaded successfully:', uploadedFile);
        
        // Cache the original file for processing
        fileCache.store(uploadedFile.id, file);
        console.log('📁 Cached original file for processing:', uploadedFile.id);

        // Add to uploaded videos
        const updatedVideos = [...uploadedVideos, uploadedFile];
        console.log('📹 Updated videos array:', updatedVideos);
        onVideoUpload(updatedVideos);

        // Remove from uploading state after a brief delay
        setTimeout(() => {
          setUploading(prev => {
            const updated = { ...prev };
            delete updated[uploadId];
            return updated;
          });
        }, 2000);

      } catch (error) {
        console.error('❌ Upload failed for file:', file.name);
        console.error('❌ Error details:', error);
        
        // Check if it's a Firebase Storage error
        if (error && typeof error === 'object' && 'code' in error) {
          const firebaseError = error as any;
          console.error('❌ Firebase error code:', firebaseError.code);
          console.error('❌ Firebase error message:', firebaseError.message);
          
          // Show user-friendly error messages
          let userMessage = 'Upload failed. ';
          switch (firebaseError.code) {
            case 'storage/unauthorized':
              userMessage += 'Please make sure you are signed in and have permission to upload files.';
              break;
            case 'storage/canceled':
              userMessage += 'Upload was canceled.';
              break;
            case 'storage/unknown':
              userMessage += 'An unknown error occurred. Please try again.';
              break;
            case 'storage/invalid-format':
              userMessage += 'Invalid file format. Please upload a video file.';
              break;
            case 'storage/invalid-argument':
              userMessage += 'Invalid file. Please check the file and try again.';
              break;
            default:
              userMessage += `Error: ${firebaseError.message}`;
          }
          
          alert(userMessage);
        }
        
        setUploading(prev => ({
          ...prev,
          [uploadId]: {
            fileName: file.name,
            progress: 0,
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed'
          }
        }));
        
        // Remove error state after delay
        setTimeout(() => {
          setUploading(prev => {
            const updated = { ...prev };
            delete updated[uploadId];
            return updated;
          });
        }, 5000);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const removeVideo = (index: number) => {
    const newFiles = uploadedVideos.filter((_, i) => i !== index);
    onVideoUpload(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUploadingEntries = () => Object.entries(uploading);
  const hasActiveUploads = getUploadingEntries().some(([, progress]) => progress.status === 'uploading');

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="w-5 h-5 text-secondary" />
          Video Clips
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        <div
          className={`upload-zone ${isDragOver ? 'dragover' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center space-y-3">
            <div className="p-4 rounded-full bg-secondary/10 w-fit mx-auto">
              <Plus className="w-8 h-8 text-secondary" />
            </div>
            <div>
              <p className="text-lg font-semibold mb-1">Add Video Clips</p>
              <p className="text-sm text-muted-foreground">
                Drop multiple videos or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports MP4, MOV, AVI files
              </p>
            </div>
          </div>
        </div>

        {/* Video List */}
        {uploadedVideos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              {uploadedVideos.length} video{uploadedVideos.length !== 1 ? 's' : ''} added
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadedVideos.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-secondary/20">
                      <Video className="w-4 h-4 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(1)} MB • {file.mimeType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Uploaded
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeVideo(index)}
                      className="hover:bg-destructive/20"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Previews */}
        {uploadedVideos.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Previews ({uploadedVideos.length} video{uploadedVideos.length !== 1 ? 's' : ''})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {uploadedVideos.map((file, index) => (
                <div 
                  key={`preview-${file.id}-${index}`} 
                  className="relative rounded-lg overflow-hidden bg-black/20 aspect-video group"
                >
                  <video
                    src={file.url}
                    className="w-full h-full object-contain"
                    controls
                    muted
                    preload="metadata"
                    onLoadStart={() => console.log('🎬 Video loading:', file.name, file.url)}
                    onError={(e) => {
                      console.error('❌ Video load error:', file.name, e, 'URL:', file.url);
                    }}
                    onLoadedData={() => console.log('✅ Video loaded:', file.name)}
                    onCanPlay={() => console.log('🎯 Video can play:', file.name)}
                  />
                  
                  {/* Debug info overlay */}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <div>{file.name}</div>
                    <div>ID: {file.id}</div>
                    <div>URL: {file.url.substring(0, 30)}...</div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => removeVideo(index)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files) handleFileSelect(files);
          }}
        />
      </CardContent>
    </Card>
  );
};

export default VideoUpload;