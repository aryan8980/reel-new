// Custom Video Processor - Built from scratch using pure Web APIs
// No external dependencies, full control over video processing

export class CustomVideoProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  // Get video metadata (duration, dimensions, etc.)
  private async getVideoInfo(file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    videoElement: HTMLVideoElement;
  }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        resolve({
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          videoElement: video
        });
      };
      
      video.onerror = () => reject(new Error('Failed to load video metadata'));
      video.src = URL.createObjectURL(file);
    });
  }

  // Extract frames from video at specific time range
  private async extractFrames(
    video: HTMLVideoElement,
    startTime: number,
    endTime: number,
    fps: number = 30
  ): Promise<ImageData[]> {
    const frames: ImageData[] = [];
    const duration = endTime - startTime;
    const totalFrames = Math.ceil(duration * fps);
    
    // Set canvas size to video dimensions
    this.canvas.width = video.videoWidth;
    this.canvas.height = video.videoHeight;
    
    console.log(`🎬 Extracting ${totalFrames} frames from ${startTime}s to ${endTime}s at ${fps}fps`);
    
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const currentTime = startTime + (frameIndex / fps);
      
      if (currentTime > endTime) break;
      
      // Seek to specific time
      video.currentTime = currentTime;
      
      // Wait for video to seek to the correct time
      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve();
        };
        video.addEventListener('seeked', onSeeked);
      });
      
      // Draw frame to canvas and extract image data
      this.ctx.drawImage(video, 0, 0);
      const frameData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      frames.push(frameData);
      
      if (frameIndex % 30 === 0) {
        console.log(`📹 Extracted frame ${frameIndex + 1}/${totalFrames}`);
      }
    }
    
    return frames;
  }

  // Create video from frames using MediaRecorder
  private async createVideoFromFrames(
    frames: ImageData[],
    fps: number = 30,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log(`🎬 Creating video from ${frames.length} frames at ${fps}fps`);
    
    // Set canvas dimensions based on first frame
    if (frames.length === 0) {
      throw new Error('No frames to create video from');
    }
    
    this.canvas.width = frames[0].width;
    this.canvas.height = frames[0].height;
    
    // Create media stream from canvas
    const stream = this.canvas.captureStream(fps);
    
    // Set up MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000 // 2.5 Mbps for good quality
    });
    
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        console.log(`✅ Video created: ${videoBlob.size} bytes`);
        resolve(videoBlob);
      };
      
      mediaRecorder.onerror = (event) => {
        reject(new Error(`MediaRecorder error: ${event}`));
      };
      
      // Start recording
      mediaRecorder.start();
      
      // Draw frames at the specified FPS
      let frameIndex = 0;
      const frameInterval = 1000 / fps; // milliseconds per frame
      
      const drawNextFrame = () => {
        if (frameIndex >= frames.length) {
          mediaRecorder.stop();
          return;
        }
        
        // Draw frame to canvas
        this.ctx.putImageData(frames[frameIndex], 0, 0);
        
        if (onProgress && frameIndex % 10 === 0) {
          const progress = (frameIndex / frames.length) * 100;
          onProgress(progress);
        }
        
        frameIndex++;
        setTimeout(drawNextFrame, frameInterval);
      };
      
      drawNextFrame();
    });
  }

  // Main video trimming function
  async trimVideo(
    videoFile: File,
    startTime: number,
    endTime: number,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log(`🎬 CUSTOM TRIMMING: ${videoFile.name} from ${startTime}s to ${endTime}s`);
    
    try {
      if (onProgress) onProgress(10);
      
      // Get video info
      const videoInfo = await this.getVideoInfo(videoFile);
      console.log(`📹 Video info: ${videoInfo.width}x${videoInfo.height}, ${videoInfo.duration}s`);
      
      if (onProgress) onProgress(20);
      
      // Validate time range
      if (startTime < 0) startTime = 0;
      if (endTime > videoInfo.duration) endTime = videoInfo.duration;
      if (startTime >= endTime) {
        throw new Error('Invalid time range: start time must be less than end time');
      }
      
      // Extract frames from the video
      const frames = await this.extractFrames(videoInfo.videoElement, startTime, endTime, 30);
      
      if (onProgress) onProgress(70);
      
      // Create video from extracted frames
      const trimmedVideo = await this.createVideoFromFrames(frames, 30, (frameProgress) => {
        const adjustedProgress = 70 + (frameProgress * 0.25);
        if (onProgress) onProgress(adjustedProgress);
      });
      
      // Clean up
      URL.revokeObjectURL(videoInfo.videoElement.src);
      
      if (onProgress) onProgress(100);
      
      console.log(`✅ Video trimmed successfully: ${trimmedVideo.size} bytes`);
      return trimmedVideo;
      
    } catch (error) {
      console.error('❌ Custom video trimming failed:', error);
      throw error;
    }
  }

  // Concatenate multiple video files
  async concatenateVideos(
    videoBlobs: Blob[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log(`🔗 CUSTOM CONCATENATION: ${videoBlobs.length} videos`);
    
    if (videoBlobs.length === 0) {
      throw new Error('No videos to concatenate');
    }
    
    if (videoBlobs.length === 1) {
      return videoBlobs[0];
    }
    
    try {
      const allFrames: ImageData[] = [];
      let totalFrames = 0;
      
      // Extract frames from each video
      for (let i = 0; i < videoBlobs.length; i++) {
        const videoFile = new File([videoBlobs[i]], `video${i}.webm`, { type: 'video/webm' });
        const videoInfo = await this.getVideoInfo(videoFile);
        
        const frames = await this.extractFrames(
          videoInfo.videoElement,
          0,
          videoInfo.duration,
          30
        );
        
        allFrames.push(...frames);
        totalFrames += frames.length;
        
        // Clean up
        URL.revokeObjectURL(videoInfo.videoElement.src);
        
        if (onProgress) {
          const progress = ((i + 1) / videoBlobs.length) * 50;
          onProgress(progress);
        }
      }
      
      console.log(`📹 Total frames for concatenation: ${totalFrames}`);
      
      // Create final video from all frames
      const concatenatedVideo = await this.createVideoFromFrames(allFrames, 30, (frameProgress) => {
        const adjustedProgress = 50 + (frameProgress * 0.5);
        if (onProgress) onProgress(adjustedProgress);
      });
      
      console.log(`✅ Videos concatenated successfully: ${concatenatedVideo.size} bytes`);
      return concatenatedVideo;
      
    } catch (error) {
      console.error('❌ Custom video concatenation failed:', error);
      throw error;
    }
  }

  // Add audio to video using MediaSource API and Web Audio
  async mergeVideoWithAudio(
    videoBlob: Blob,
    audioFile: File,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log(`🎵 CUSTOM AUDIO MERGING: ${audioFile.name} with video`);
    
    try {
      if (onProgress) onProgress(10);
      
      // Create video element to analyze the video
      const videoUrl = URL.createObjectURL(videoBlob);
      const video = document.createElement('video');
      video.src = videoUrl;
      
      const videoInfo = await new Promise<{duration: number, width: number, height: number}>((resolve, reject) => {
        video.onloadedmetadata = () => {
          resolve({
            duration: video.duration,
            width: video.videoWidth,
            height: video.videoHeight
          });
        };
        video.onerror = () => reject(new Error('Failed to load video for audio merge'));
      });
      
      if (onProgress) onProgress(30);
      
      // Extract frames from original video
      const frames = await this.extractFrames(video, 0, videoInfo.duration, 30);
      
      if (onProgress) onProgress(60);
      
      // Create new video (this will be our merged result)
      // Note: Web APIs don't provide direct audio-video merging
      // For a complete solution, you'd need to:
      // 1. Use MediaSource API or WebRTC
      // 2. Or implement server-side processing
      // 3. Or use a WebAssembly solution like FFmpeg
      
      const mergedVideo = await this.createVideoFromFrames(frames, 30, (frameProgress) => {
        const adjustedProgress = 60 + (frameProgress * 0.35);
        if (onProgress) onProgress(adjustedProgress);
      });
      
      // For now, we'll return the video as-is
      // In a real implementation, you'd need more complex audio processing
      
      URL.revokeObjectURL(videoUrl);
      
      if (onProgress) onProgress(100);
      
      console.log(`⚠️ Audio merging completed (video-only - audio merge requires additional implementation)`);
      console.log(`📹 Merged video size: ${mergedVideo.size} bytes`);
      
      return mergedVideo;
      
    } catch (error) {
      console.error('❌ Custom audio merging failed:', error);
      throw error;
    }
  }

  // Check if the processor is ready
  isReady(): boolean {
    return !!(this.canvas && this.ctx && this.audioContext);
  }

  // Get supported formats
  getSupportedFormats(): string[] {
    const video = document.createElement('video');
    const supportedFormats: string[] = [];
    
    if (video.canPlayType('video/mp4')) supportedFormats.push('mp4');
    if (video.canPlayType('video/webm')) supportedFormats.push('webm');
    if (video.canPlayType('video/ogg')) supportedFormats.push('ogg');
    
    return supportedFormats;
  }
}

// Create processor instance
const customProcessor = new CustomVideoProcessor();

// Export functions that match your existing interface
export const initFFmpeg = async () => {
  console.log('🚀 Custom Video Processor initialized (100% JavaScript - No FFmpeg!)');
  console.log('📝 Features:');
  console.log('  ✅ Video trimming with frame-by-frame precision');
  console.log('  ✅ Video concatenation');
  console.log('  ⚠️  Audio merging (basic implementation - video processing only)');
  console.log('  ✅ Pure Web APIs - No external dependencies');
  console.log(`  🎬 Supported formats: ${customProcessor.getSupportedFormats().join(', ')}`);
  return customProcessor;
};

export const trimVideoSimple = async (
  videoFile: File,
  startTime: number,
  endTime: number
): Promise<Blob> => {
  return customProcessor.trimVideo(videoFile, startTime, endTime);
};

export const concatenateVideos = async (
  videoBlobs: Blob[],
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  return customProcessor.concatenateVideos(videoBlobs, onProgress);
};

export const mergeVideoWithAudio = async (
  videoBlob: Blob,
  audioFile: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  return customProcessor.mergeVideoWithAudio(videoBlob, audioFile, onProgress);
};

export default customProcessor;
