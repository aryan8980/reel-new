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
    console.log(`🔗 FIXED CONCATENATION: ${videoBlobs.length} videos`);
    
    if (videoBlobs.length === 0) {
      throw new Error('No videos to concatenate');
    }
    
    if (videoBlobs.length === 1) {
      console.log(`📹 Single video provided, returning as-is: ${videoBlobs[0].size} bytes`);
      return videoBlobs[0];
    }
    
    try {
      // Setup canvas for concatenation
      let targetWidth = 1920;
      let targetHeight = 1080;
      let targetFPS = 30;
      
      // Analyze first video to get dimensions
      const firstVideoUrl = URL.createObjectURL(videoBlobs[0]);
      const firstVideo = document.createElement('video');
      firstVideo.src = firstVideoUrl;
      
      await new Promise<void>((resolve, reject) => {
        firstVideo.onloadedmetadata = () => {
          targetWidth = firstVideo.videoWidth || 1920;
          targetHeight = firstVideo.videoHeight || 1080;
          resolve();
        };
        firstVideo.onerror = () => reject(new Error('Failed to load first video for analysis'));
      });
      
      URL.revokeObjectURL(firstVideoUrl);
      
      if (onProgress) onProgress(10);
      
      console.log(`📐 Target dimensions: ${targetWidth}x${targetHeight} @ ${targetFPS}fps`);
      
      // Setup recording
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
      
      const stream = this.canvas.captureStream(targetFPS);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000
      });
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const concatenatedBlob = new Blob(chunks, { type: 'video/webm' });
          resolve(concatenatedBlob);
        };
      });
      
      mediaRecorder.start(100);
      
      if (onProgress) onProgress(20);
      
      // Play each video sequentially and record
      for (let i = 0; i < videoBlobs.length; i++) {
        console.log(`🎬 Processing video ${i + 1}/${videoBlobs.length}`);
        
        const videoUrl = URL.createObjectURL(videoBlobs[i]);
        const video = document.createElement('video');
        video.src = videoUrl;
        video.muted = true;
        
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => resolve();
          video.onerror = () => reject(new Error(`Failed to load video ${i + 1}`));
        });
        
        // Play video and draw frames
        video.currentTime = 0;
        video.play();
        
        const drawVideoFrames = () => {
          if (!video.paused && !video.ended) {
            this.ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            requestAnimationFrame(drawVideoFrames);
          }
        };
        
        drawVideoFrames();
        
        // Wait for video to finish
        await new Promise<void>((resolve) => {
          video.onended = () => {
            setTimeout(resolve, 50); // Small delay to ensure last frame is captured
          };
        });
        
        URL.revokeObjectURL(videoUrl);
        
        const progress = 20 + ((i + 1) / videoBlobs.length) * 70;
        if (onProgress) onProgress(progress);
        
        console.log(`✅ Video ${i + 1} added to concatenation`);
      }
      
      // Stop recording
      mediaRecorder.stop();
      stream.getTracks().forEach(track => track.stop());
      
      const result = await recordingPromise;
      
      if (onProgress) onProgress(100);
      
      console.log(`✅ Concatenation completed successfully!`);
      console.log(`📊 Input videos: ${videoBlobs.length}`);
      console.log(`📊 Total input size: ${videoBlobs.reduce((sum, blob) => sum + blob.size, 0)} bytes`);
      console.log(`📊 Final video size: ${result.size} bytes`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Video concatenation failed:', error);
      throw new Error(`Concatenation failed: ${error.message}`);
    }
  }

  // Add audio to video using MediaSource API and Web Audio
  async mergeVideoWithAudio(
    videoBlob: Blob,
    audioFile: File,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log(`🎵 FIXED AUDIO MERGING: ${audioFile.name} with video`);
    
    try {
      if (onProgress) onProgress(10);
      
      // Create video element
      const videoUrl = URL.createObjectURL(videoBlob);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = false; // Allow original audio to be replaced
      
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Failed to load video'));
      });
      
      if (onProgress) onProgress(20);
      
      // Create audio element  
      const audioUrl = URL.createObjectURL(audioFile);
      const audio = document.createElement('audio');
      audio.src = audioUrl;
      audio.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => reject(new Error('Failed to load audio'));
      });
      
      if (onProgress) onProgress(40);
      
      // Setup canvas for video processing
      this.canvas.width = video.videoWidth || 1920;
      this.canvas.height = video.videoHeight || 1080;
      
      // Create MediaStream for recording
      const stream = this.canvas.captureStream(30); // 30 FPS
      
      // Create AudioContext for audio processing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();
      
      // Load audio into AudioContext
      const audioBuffer = await audioFile.arrayBuffer();
      const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
      
      if (onProgress) onProgress(60);
      
      // Create audio source
      const audioSource = audioContext.createBufferSource();
      audioSource.buffer = decodedAudio;
      audioSource.connect(destination);
      
      // Add audio track to stream
      const audioTrack = destination.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000
      });
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      if (onProgress) onProgress(70);
      
      // Start recording
      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const finalBlob = new Blob(chunks, { type: 'video/webm' });
          resolve(finalBlob);
        };
      });
      
      mediaRecorder.start(100); // Record in 100ms chunks
      
      // Start audio
      audioSource.start(0);
      
      // Play video and draw frames
      video.currentTime = 0;
      video.play();
      
      const drawFrame = () => {
        if (!video.paused && !video.ended) {
          this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
          requestAnimationFrame(drawFrame);
        }
      };
      
      drawFrame();
      
      if (onProgress) onProgress(85);
      
      // Wait for video to finish
      await new Promise<void>((resolve) => {
        video.onended = () => {
          setTimeout(() => {
            mediaRecorder.stop();
            audioSource.stop();
            resolve();
          }, 200);
        };
      });
      
      const result = await recordingPromise;
      
      if (onProgress) onProgress(100);
      
      // Cleanup
      URL.revokeObjectURL(videoUrl);
      URL.revokeObjectURL(audioUrl);
      audioContext.close();
      stream.getTracks().forEach(track => track.stop());
      
      console.log(`✅ Audio merge completed successfully!`);
      console.log(`� Original video: ${videoBlob.size} bytes`);
      console.log(`📊 Final video: ${result.size} bytes`);
      console.log(`� Audio: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(1)}MB)`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Audio merging failed:', error);
      console.log('� Returning original video as fallback');
      
      if (onProgress) onProgress(100);
      return videoBlob;
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
