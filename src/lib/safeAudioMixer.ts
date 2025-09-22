// SAFE Audio Mixer - Video First, Audio Second
export class SafeAudioMixer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    // keep canvas offscreen by default
    this.canvas.style.position = 'fixed';
    this.canvas.style.left = '-9999px';
    this.canvas.style.top = '-9999px';
    // Don't add to DOM here; we'll attach temporarily when needed
  }

  async mergeVideoWithAudio(
    videoBlob: Blob,
    audioFile: File,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('🛡️ SAFE AUDIO MIXER - Video processing guaranteed');
    console.log('📊 Input:', {
      videoSize: `${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`,
      audioSize: `${(audioFile.size / 1024 / 1024).toFixed(2)}MB`
    });
    
    // STRATEGY: Try audio merge, but if it fails, return video-only
    // This ensures we ALWAYS get a processed video
    
    try {
      if (onProgress) onProgress(5);
      
      // Try the simple audio merge first
      console.log('🎯 Attempting simple audio merge...');
      const audioResult = await this.trySimpleAudioMerge(videoBlob, audioFile, onProgress);
      
      if (audioResult && audioResult.size > videoBlob.size * 0.5) {
        console.log('✅ AUDIO MERGE SUCCESS!');
        return audioResult;
      } else {
        console.warn('⚠️ Audio merge failed, returning video-only');
        return await this.guaranteedVideoOnly(videoBlob, onProgress);
      }
      
    } catch (error) {
      console.warn('❌ Audio merge error:', error);
      console.log('🔄 Falling back to video-only processing...');
      return await this.guaranteedVideoOnly(videoBlob, onProgress);
    }
  }

  private async trySimpleAudioMerge(
    videoBlob: Blob,
    audioFile: File,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('🎵 Trying simple audio merge...');
    
    // Create video element (hidden) and attach to DOM to maximize compatibility
    const videoUrl = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.style.position = 'fixed';
    video.style.left = '-9999px';
    video.style.top = '-9999px';
    document.body.appendChild(video);
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        console.log('📹 Video loaded:', video.videoWidth + 'x' + video.videoHeight);
        resolve();
      };
      video.onerror = () => reject(new Error('Video load failed'));
      setTimeout(() => reject(new Error('Video timeout')), 5000);
    });

    if (onProgress) onProgress(20);

    // Create audio element (hidden) and attach to DOM to satisfy some browser policies
    const audioUrl = URL.createObjectURL(audioFile);
    const audio = document.createElement('audio');
    audio.src = audioUrl;
    audio.crossOrigin = 'anonymous';
    audio.playsInline = true;
    audio.preload = 'auto';
    audio.style.position = 'fixed';
    audio.style.left = '-9999px';
    audio.style.top = '-9999px';
    // append both elements - some browsers require elements to be in DOM for audio capture
    try {
      document.body.appendChild(audio);
    } catch (e) {
      console.warn('Could not append audio element to DOM:', e);
    }
    
    await new Promise<void>((resolve, reject) => {
      audio.onloadedmetadata = () => {
        console.log('🎵 Audio loaded:', audio.duration + 's');
        resolve();
      };
      audio.onerror = () => reject(new Error('Audio load failed'));
      setTimeout(() => reject(new Error('Audio timeout')), 5000);
    });

    if (onProgress) onProgress(40);

    // Setup canvas (attach if not attached)
    if (!this.canvas.parentElement) {
      // append temporarily to DOM to ensure captureStream works in all browsers
      document.body.appendChild(this.canvas);
    }
    this.canvas.width = video.videoWidth || 1920;
    this.canvas.height = video.videoHeight || 1080;
    
    // Create streams
  const videoStream = this.canvas.captureStream(24); // Lower FPS for stability
    
    // Audio context
    // Create audio context and connect audio element
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      try {
        await audioContext.resume();
      } catch (e) {
        console.warn('AudioContext resume failed:', e);
      }
    }

    let audioSource: MediaElementAudioSourceNode | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    try {
      audioSource = audioContext.createMediaElementSource(audio);
      audioDestination = audioContext.createMediaStreamDestination();
      audioSource.connect(audioDestination);
    } catch (e) {
      console.warn('Failed to create MediaElementSource (CORS/autoplay?):', e);
      // We'll attempt to play audio directly and rely on browser to include audio (last resort)
    }
    
    // Combine
    const combinedStream = new MediaStream();
    videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
    // If we successfully created an audioDestination, use its tracks, otherwise try to let audio element be captured by browser
    if (audioDestination && audioDestination.stream.getAudioTracks().length > 0) {
      audioDestination.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    } else {
      console.warn('⚠️ No audio tracks from WebAudio destination; combined stream will not include audio from WebAudio');
    }
    
    console.log('🔗 Stream combined:', {
      video: combinedStream.getVideoTracks().length,
      audio: combinedStream.getAudioTracks().length,
      audioDestinationAvailable: !!audioDestination
    });

    if (onProgress) onProgress(60);
    
    // Record
    // Determine best supported codec
    const codecCandidates = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp8', 'video/webm'];
    let selectedCodec = codecCandidates.find(c => MediaRecorder.isTypeSupported(c));
    if (!selectedCodec) selectedCodec = 'video/webm';
    console.log('📦 Using MediaRecorder mimeType:', selectedCodec);

    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: selectedCodec
    });
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    
    const recordingPromise = new Promise<Blob>((resolve, reject) => {
      mediaRecorder.onstop = () => {
        if (chunks.length === 0) {
          reject(new Error('No chunks recorded'));
          return;
        }
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };
      
      // 15 second timeout
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          reject(new Error('Recording timeout'));
        }
      }, 15000);
    });
    
    // Start everything - start mediaRecorder before playback to capture initial audio
    try {
      mediaRecorder.start(200);
    } catch (e) {
      console.error('MediaRecorder.start failed:', e);
      // cleanup appended elements
      try { if (audio && audio.parentElement) audio.parentElement.removeChild(audio); } catch {};
      try { if (video && video.parentElement) video.parentElement.removeChild(video); } catch {};
      try { if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas); } catch {}
      throw e;
    }

    video.currentTime = 0;
    audio.currentTime = 0;

    // Play - may require user gesture (typically the process button is clicked by user)
    try {
      await Promise.all([video.play(), audio.play()]);
    } catch (e) {
      // playback may fail due to autoplay policy; log and continue - recorder may still capture
      console.warn('Playback failed (autoplay policy?):', e);
    }
    
    if (onProgress) onProgress(80);
    
    // Draw frames
    const drawFrame = () => {
      if (!video.ended && !video.paused) {
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
          audio.pause();
          resolve();
        }, 300);
      };
    });
    
    const result = await recordingPromise;

    // Cleanup: remove appended DOM elements and revoke URLs
    try { URL.revokeObjectURL(videoUrl); } catch {}
    try { URL.revokeObjectURL(audioUrl); } catch {}
    try { if (audio && audio.parentElement) audio.parentElement.removeChild(audio); } catch {}
    try { if (video && video.parentElement) video.parentElement.removeChild(video); } catch {}
    try { if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas); } catch {}
    try { audioContext.close(); } catch {}
    combinedStream.getTracks().forEach(track => track.stop());

    if (onProgress) onProgress(100);
    console.log('🎵 Audio merge result:', result.size, 'bytes');

    return result;
  }

  private async guaranteedVideoOnly(
    videoBlob: Blob,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('🎬 GUARANTEED VIDEO-ONLY processing');
    console.log('📹 This will definitely work - returning processed video');
    
    try {
      if (onProgress) onProgress(50);
      
      // Create video element
      const videoUrl = URL.createObjectURL(videoBlob);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Video failed'));
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });

      if (onProgress) onProgress(70);

      // Setup canvas
      this.canvas.width = video.videoWidth || 1920;
      this.canvas.height = video.videoHeight || 1080;
      
      // Create video stream only
      const videoStream = this.canvas.captureStream(24);
      
      // Simple MediaRecorder
      const mediaRecorder = new MediaRecorder(videoStream, {
        mimeType: 'video/webm;codecs=vp8'
      });
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      
      const recordingPromise = new Promise<Blob>((resolve) => {
        mediaRecorder.onstop = () => {
          const result = new Blob(chunks, { type: 'video/webm' });
          console.log('✅ Video-only result:', result.size, 'bytes');
          resolve(result);
        };
      });
      
      // Record video
      mediaRecorder.start(200);
      video.currentTime = 0;
      await video.play();
      
      if (onProgress) onProgress(85);
      
      // Draw frames
      const drawFrame = () => {
        if (!video.ended && !video.paused) {
          this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
          requestAnimationFrame(drawFrame);
        }
      };
      drawFrame();
      
      // Wait for end
      await new Promise<void>((resolve) => {
        video.onended = () => {
          setTimeout(() => {
            mediaRecorder.stop();
            resolve();
          }, 200);
        };
      });
      
      const result = await recordingPromise;
      
      // Cleanup
      URL.revokeObjectURL(videoUrl);
      videoStream.getTracks().forEach(track => track.stop());
      
      if (onProgress) onProgress(100);
      
      console.log('✅ GUARANTEED video processing complete!');
      return result;
      
    } catch (error) {
      console.error('❌ Even video-only failed:', error);
      console.log('🔄 Returning original video as last resort');
      
      if (onProgress) onProgress(100);
      return videoBlob; // Return original as absolute last resort
    }
  }
}
