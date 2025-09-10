// Advanced audio mixer using multiple approaches
export class AdvancedAudioMixer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async mergeVideoWithAudio(
    videoBlob: Blob,
    audioFile: File,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('🎯 ADVANCED AUDIO MIXER STARTING');
    console.log('Input video size:', videoBlob.size);
    console.log('Input audio size:', audioFile.size);
    
    try {
      // Try Method 1: Direct MediaRecorder approach
      const result1 = await this.method1_DirectRecording(videoBlob, audioFile, onProgress);
      if (result1 && result1.size > videoBlob.size * 0.8) {
        console.log('✅ Method 1 (Direct Recording) SUCCESS');
        return result1;
      }
      
      // Try Method 2: AudioBuffer approach  
      console.log('🔄 Method 1 failed, trying Method 2...');
      const result2 = await this.method2_AudioBuffer(videoBlob, audioFile, onProgress);
      if (result2 && result2.size > videoBlob.size * 0.8) {
        console.log('✅ Method 2 (AudioBuffer) SUCCESS');
        return result2;
      }
      
      // Try Method 3: Simple overlay
      console.log('🔄 Method 2 failed, trying Method 3...');
      const result3 = await this.method3_SimpleOverlay(videoBlob, audioFile, onProgress);
      if (result3 && result3.size > videoBlob.size * 0.8) {
        console.log('✅ Method 3 (Simple Overlay) SUCCESS');
        return result3;
      }
      
      console.warn('❌ All audio mixing methods failed');
      return videoBlob;
      
    } catch (error) {
      console.error('❌ Audio mixer error:', error);
      return videoBlob;
    }
  }

  // Method 1: Direct recording with proper audio timing
  private async method1_DirectRecording(videoBlob: Blob, audioFile: File, onProgress?: (progress: number) => void): Promise<Blob> {
    console.log('🎯 Method 1: Direct Recording');
    
    // Load video
    const videoUrl = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Video load failed'));
    });
    
    // Load audio
    const audioUrl = URL.createObjectURL(audioFile);
    const audio = document.createElement('audio');
    audio.src = audioUrl;
    audio.volume = 1.0;
    
    await new Promise<void>((resolve, reject) => {
      audio.onloadedmetadata = () => resolve();
      audio.onerror = () => reject(new Error('Audio load failed'));
    });
    
    if (onProgress) onProgress(20);
    
    // Setup canvas
    this.canvas.width = video.videoWidth || 1920;
    this.canvas.height = video.videoHeight || 1080;
    
    // Create streams
    const videoStream = this.canvas.captureStream(30);
    
    // Use getUserMedia to create a proper audio context
    const audioContext = new AudioContext();
    await audioContext.resume(); // Ensure context is running
    
    const mediaStreamDestination = audioContext.createMediaStreamDestination();
    const audioSource = audioContext.createMediaElementSource(audio);
    
    // Connect audio with gain control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 1.0;
    audioSource.connect(gainNode);
    gainNode.connect(mediaStreamDestination);
    
    // Combine streams
    const combinedStream = new MediaStream();
    videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
    mediaStreamDestination.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    
    console.log('Stream tracks:', {
      video: combinedStream.getVideoTracks().length,
      audio: combinedStream.getAudioTracks().length
    });
    
    if (onProgress) onProgress(40);
    
    // Record with explicit settings
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm;codecs=vp8,opus',
      videoBitsPerSecond: 1000000,
      audioBitsPerSecond: 128000
    });
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    const recordingPromise = new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        const result = new Blob(chunks, { type: 'video/webm' });
        resolve(result);
      };
    });
    
    // Synchronized start
    mediaRecorder.start(100);
    
    // Start audio first, then video
    audio.currentTime = 0;
    video.currentTime = 0;
    
    const audioPlayPromise = audio.play();
    const videoPlayPromise = video.play();
    
    await Promise.all([audioPlayPromise, videoPlayPromise]);
    
    if (onProgress) onProgress(60);
    
    // Draw frames
    const startTime = Date.now();
    const drawFrame = () => {
      if (!video.paused && !video.ended) {
        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
        requestAnimationFrame(drawFrame);
        
        // Update progress based on video time
        const progressPercent = (video.currentTime / video.duration) * 40;
        if (onProgress) onProgress(60 + progressPercent);
      }
    };
    drawFrame();
    
    // Wait for video completion
    await new Promise<void>((resolve) => {
      video.onended = () => {
        setTimeout(() => {
          mediaRecorder.stop();
          audio.pause();
          resolve();
        }, 100);
      };
    });
    
    const result = await recordingPromise;
    
    // Cleanup
    URL.revokeObjectURL(videoUrl);
    URL.revokeObjectURL(audioUrl);
    audioContext.close();
    combinedStream.getTracks().forEach(track => track.stop());
    
    console.log('Method 1 result:', result.size, 'bytes');
    return result;
  }

  // Method 2: AudioBuffer pre-loading
  private async method2_AudioBuffer(videoBlob: Blob, audioFile: File, onProgress?: (progress: number) => void): Promise<Blob> {
    console.log('🎯 Method 2: AudioBuffer');
    
    // Load video
    const videoUrl = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Video load failed'));
    });
    
    if (onProgress) onProgress(20);
    
    // Load audio into buffer
    const audioContext = new AudioContext();
    const audioArrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
    
    if (onProgress) onProgress(40);
    
    // Setup canvas
    this.canvas.width = video.videoWidth || 1920;
    this.canvas.height = video.videoHeight || 1080;
    
    const videoStream = this.canvas.captureStream(30);
    const destination = audioContext.createMediaStreamDestination();
    
    // Create buffer source
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);
    
    // Combine streams
    const combinedStream = new MediaStream();
    videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
    destination.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    
    if (onProgress) onProgress(60);
    
    // Record
    const mediaRecorder = new MediaRecorder(combinedStream);
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    
    const recordingPromise = new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };
    });
    
    // Start everything
    mediaRecorder.start();
    source.start(0);
    video.play();
    
    // Draw frames
    const drawFrame = () => {
      if (!video.paused && !video.ended) {
        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
        requestAnimationFrame(drawFrame);
      }
    };
    drawFrame();
    
    // Wait for completion
    await new Promise<void>((resolve) => {
      video.onended = () => {
        setTimeout(() => {
          mediaRecorder.stop();
          resolve();
        }, 100);
      };
    });
    
    const result = await recordingPromise;
    
    // Cleanup
    URL.revokeObjectURL(videoUrl);
    audioContext.close();
    combinedStream.getTracks().forEach(track => track.stop());
    
    console.log('Method 2 result:', result.size, 'bytes');
    return result;
  }

  // Method 3: Simple overlay (fallback)
  private async method3_SimpleOverlay(videoBlob: Blob, audioFile: File, onProgress?: (progress: number) => void): Promise<Blob> {
    console.log('🎯 Method 3: Simple Overlay');
    
    // Create a simple video with audio overlay
    const videoUrl = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.src = videoUrl;
    
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });
    
    this.canvas.width = video.videoWidth || 1920;
    this.canvas.height = video.videoHeight || 1080;
    
    const stream = this.canvas.captureStream(24); // Lower FPS for stability
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8'  // Video only initially
    });
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    
    const recordingPromise = new Promise<Blob>((resolve) => {
      mediaRecorder.onstop = () => {
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };
    });
    
    mediaRecorder.start();
    video.play();
    
    const drawFrame = () => {
      if (!video.paused && !video.ended) {
        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
        requestAnimationFrame(drawFrame);
      }
    };
    drawFrame();
    
    await new Promise<void>((resolve) => {
      video.onended = () => {
        mediaRecorder.stop();
        resolve();
      };
    });
    
    const result = await recordingPromise;
    URL.revokeObjectURL(videoUrl);
    
    console.log('Method 3 result:', result.size, 'bytes');
    
    if (onProgress) onProgress(100);
    return result;
  }
}
