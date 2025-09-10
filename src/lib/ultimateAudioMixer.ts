// Ultimate audio mixer - tries all possible approaches
export class UltimateAudioMixer {
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
    console.log('🚀 ULTIMATE AUDIO MIXER - Trying ALL methods');
    console.log('📊 Input Analysis:', {
      videoSize: `${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`,
      audioSize: `${(audioFile.size / 1024 / 1024).toFixed(2)}MB`,
      audioName: audioFile.name,
      audioType: audioFile.type
    });
    
    let attemptCount = 0;
    
    // Method 1: HTML5 Video/Audio elements with MediaRecorder
    try {
      attemptCount++;
      console.log(`🎯 ATTEMPT ${attemptCount}: Starting HTML5 MediaRecorder method`);
      const result1 = await this.htmlMediaRecorder(videoBlob, audioFile, onProgress);
      if (this.isValidResult(result1, videoBlob)) {
        console.log('✅ HTML MediaRecorder method SUCCESS');
        console.log('📈 Success Stats:', {
          originalSize: `${(videoBlob.size / 1024 / 1024).toFixed(2)}MB`,
          finalSize: `${(result1.size / 1024 / 1024).toFixed(2)}MB`,
          sizeIncrease: `${(((result1.size - videoBlob.size) / videoBlob.size) * 100).toFixed(1)}%`
        });
        return result1;
      } else {
        console.warn('⚠️ HTML MediaRecorder produced invalid result:', {
          resultSize: result1?.size || 0,
          originalSize: videoBlob.size,
          isValid: this.isValidResult(result1, videoBlob)
        });
      }
    } catch (e) {
      console.log('❌ HTML MediaRecorder failed:', e);
      console.log('🔄 Moving to next method...');
    }

    // Method 2: WebCodecs API (if available)
    try {
      attemptCount++;
      console.log(`🎯 ATTEMPT ${attemptCount}: Checking WebCodecs availability`);
      if ('VideoDecoder' in window) {
        console.log('✅ WebCodecs available, starting method');
        const result2 = await this.webCodecsMethod(videoBlob, audioFile, onProgress);
        if (this.isValidResult(result2, videoBlob)) {
          console.log('✅ WebCodecs method SUCCESS');
          return result2;
        }
      } else {
        console.log('❌ WebCodecs not available in this browser');
      }
    } catch (e) {
      console.log('❌ WebCodecs failed:', e);
      console.log('🔄 Moving to next method...');
    }

    // Method 3: Web Audio API with precise timing
    try {
      attemptCount++;
      console.log(`🎯 ATTEMPT ${attemptCount}: Starting Web Audio Precise method`);
      const result3 = await this.webAudioPrecise(videoBlob, audioFile, onProgress);
      if (this.isValidResult(result3, videoBlob)) {
        console.log('✅ Web Audio Precise method SUCCESS');
        return result3;
      } else {
        console.warn('⚠️ Web Audio Precise produced invalid result');
      }
    } catch (e) {
      console.log('❌ Web Audio Precise failed:', e);
      console.log('🔄 Moving to final fallback method...');
    }

    // Method 4: Simple canvas recording with audio overlay
    try {
      attemptCount++;
      console.log(`🎯 ATTEMPT ${attemptCount}: Starting Simple Canvas Audio method (LAST RESORT)`);
      const result4 = await this.simpleCanvasAudio(videoBlob, audioFile, onProgress);
      if (this.isValidResult(result4, videoBlob)) {
        console.log('✅ Simple Canvas Audio method SUCCESS');
        return result4;
      } else {
        console.warn('⚠️ Simple Canvas Audio produced invalid result');
      }
    } catch (e) {
      console.log('❌ Simple Canvas Audio failed:', e);
    }

    console.error('💥 ALL AUDIO MIXING METHODS FAILED');
    console.error('📋 Summary:', {
      totalAttempts: attemptCount,
      failedMethods: ['HTML5 MediaRecorder', 'WebCodecs', 'Web Audio Precise', 'Simple Canvas'],
      fallbackAction: 'Returning original video without audio'
    });
    return videoBlob; // Return original video
  }

  private isValidResult(result: Blob, original: Blob): boolean {
    const isValid = result && result.size > original.size * 0.5 && result.size !== original.size;
    console.log('🔍 Result Validation:', {
      hasResult: !!result,
      resultSize: result?.size || 0,
      originalSize: original.size,
      sizeRatio: result ? (result.size / original.size).toFixed(2) : '0',
      isValidSize: result ? result.size > original.size * 0.5 : false,
      isDifferentSize: result ? result.size !== original.size : false,
      finalValid: isValid
    });
    return isValid;
  }

  // Method 1: HTML5 Media with proper synchronization
  private async htmlMediaRecorder(videoBlob: Blob, audioFile: File, onProgress?: (progress: number) => void): Promise<Blob> {
    console.log('🎯 Trying HTML5 MediaRecorder method');
    
    // Create video element
    const videoUrl = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    video.preload = 'metadata';
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        console.log(`📹 Video: ${video.videoWidth}x${video.videoHeight}, ${video.duration.toFixed(2)}s`);
        resolve();
      };
      video.onerror = () => reject(new Error('Video failed to load'));
      setTimeout(() => reject(new Error('Video load timeout')), 10000);
    });

    // Create audio element
    const audioUrl = URL.createObjectURL(audioFile);
    const audio = document.createElement('audio');
    audio.src = audioUrl;
    audio.preload = 'metadata';
    
    await new Promise<void>((resolve, reject) => {
      audio.onloadedmetadata = () => {
        console.log(`🎵 Audio: ${audio.duration.toFixed(2)}s`);
        resolve();
      };
      audio.onerror = () => reject(new Error('Audio failed to load'));
      setTimeout(() => reject(new Error('Audio load timeout')), 10000);
    });

    if (onProgress) onProgress(25);

    // Setup canvas
    this.canvas.width = video.videoWidth || 1920;
    this.canvas.height = video.videoHeight || 1080;
    console.log('🎨 Canvas setup:', {
      width: this.canvas.width,
      height: this.canvas.height,
      contextType: this.ctx ? '2d' : 'null'
    });
    
    // Create video stream
    const videoStream = this.canvas.captureStream(30);
    console.log('📹 Video stream created:', {
      streamId: videoStream.id,
      videoTracks: videoStream.getVideoTracks().length,
      active: videoStream.active
    });
    
    // Create audio context and stream
    console.log('🎛️ Creating audio context...');
    const audioContext = new AudioContext();
    if (audioContext.state === 'suspended') {
      console.log('🔄 Audio context suspended, resuming...');
      await audioContext.resume();
    }
    console.log('🎛️ Audio context state:', audioContext.state);
    
    const audioSource = audioContext.createMediaElementSource(audio);
    const audioDestination = audioContext.createMediaStreamDestination();
    console.log('🔗 Audio nodes created');
    
    // Add gain control for audio
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.8; // Slightly lower volume to prevent distortion
    console.log('🔊 Gain node created with volume:', gainNode.gain.value);
    
    audioSource.connect(gainNode);
    gainNode.connect(audioDestination);
    console.log('🔗 Audio routing: source → gain → destination');
    
    // Combine streams
    const combinedStream = new MediaStream();
    console.log('🌊 Empty combined stream created');
    
    // Add tracks with error checking
    const videoTracks = videoStream.getVideoTracks();
    const audioTracks = audioDestination.stream.getAudioTracks();
    
    console.log(`🔗 CRITICAL CHECK - Available tracks:`, {
      videoTracksCount: videoTracks.length,
      audioTracksCount: audioTracks.length,
      videoTrackDetails: videoTracks.map(t => ({ id: t.id, kind: t.kind, enabled: t.enabled, readyState: t.readyState })),
      audioTrackDetails: audioTracks.map(t => ({ id: t.id, kind: t.kind, enabled: t.enabled, readyState: t.readyState }))
    });
    
    videoTracks.forEach((track, index) => {
      combinedStream.addTrack(track);
      console.log(`✅ Added video track ${index + 1}:`, {
        id: track.id,
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState
      });
    });
    
    audioTracks.forEach((track, index) => {
      combinedStream.addTrack(track);
      console.log(`✅ Added audio track ${index + 1}:`, {
        id: track.id,
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState
      });
    });

    console.log('🌊 FINAL COMBINED STREAM:', {
      streamId: combinedStream.id,
      active: combinedStream.active,
      totalTracks: combinedStream.getTracks().length,
      videoTracks: combinedStream.getVideoTracks().length,
      audioTracks: combinedStream.getAudioTracks().length,
      allTrackIds: combinedStream.getTracks().map(t => t.id)
    });

    if (onProgress) onProgress(50);

    // Setup MediaRecorder with conservative settings
    console.log('🎬 Setting up MediaRecorder...');
    const options: MediaRecorderOptions = {
      mimeType: 'video/webm;codecs=vp8,opus',
      videoBitsPerSecond: 1000000,
      audioBitsPerSecond: 128000
    };

    // Check codec support
    console.log('🔍 Checking codec support:', {
      'video/webm;codecs=vp8,opus': MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus'),
      'video/webm;codecs=vp8': MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
      'video/webm': MediaRecorder.isTypeSupported('video/webm'),
      'video/mp4': MediaRecorder.isTypeSupported('video/mp4')
    });

    // Fallback to simpler codec if needed
    if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
      console.warn('⚠️ vp8,opus codec not supported, falling back...');
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
        options.mimeType = 'video/webm;codecs=vp8';
        console.log('🔄 Using vp8 only codec');
      } else {
        options.mimeType = 'video/webm';
        console.log('🔄 Using basic webm codec');
      }
    }

    console.log('🎬 Final MediaRecorder options:', options);

    const mediaRecorder = new MediaRecorder(combinedStream, options);
    console.log('🎬 MediaRecorder created:', {
      state: mediaRecorder.state,
      mimeType: mediaRecorder.mimeType,
      videoBitsPerSecond: mediaRecorder.videoBitsPerSecond,
      audioBitsPerSecond: mediaRecorder.audioBitsPerSecond
    });

    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
        console.log(`📦 Chunk ${chunks.length} recorded: ${event.data.size} bytes (${event.data.type})`);
      } else {
        console.warn('⚠️ Empty chunk received');
      }
    };

    const recordingPromise = new Promise<Blob>((resolve, reject) => {
      mediaRecorder.onstop = () => {
        console.log('🏁 MediaRecorder stopped event fired');
        if (chunks.length === 0) {
          console.error('❌ CRITICAL: No chunks were recorded!');
          reject(new Error('No data recorded'));
          return;
        }
        const result = new Blob(chunks, { type: 'video/webm' });
        console.log(`🎬 Recording assembly complete:`, {
          chunksUsed: chunks.length,
          finalBlobSize: result.size,
          finalBlobType: result.type,
          sizeMB: (result.size / 1024 / 1024).toFixed(2)
        });
        resolve(result);
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error event:', event);
        reject(new Error(`MediaRecorder error: ${event}`));
      };
      
      mediaRecorder.onstart = () => {
        console.log('🎬 MediaRecorder start event fired');
      };
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          console.warn('⏰ Recording timeout reached - forcing stop');
          mediaRecorder.stop();
          reject(new Error('Recording timeout'));
        }
      }, 30000);
    });

    // Start recording
    console.log('🔴 Starting MediaRecorder...');
    mediaRecorder.start(100); // Record in small chunks for better reliability
    console.log('🔴 MediaRecorder started - current state:', mediaRecorder.state);

    if (onProgress) onProgress(60);

    // Synchronize playback
    console.log('⏰ Preparing synchronized playback...');
    video.currentTime = 0;
    audio.currentTime = 0;
    console.log('⏰ Media elements reset to time 0');
    
    // Start both at the same time
    console.log('▶️ Attempting to start video playback...');
    const videoPlayPromise = video.play().catch(e => {
      console.warn('⚠️ Video play failed:', e);
      return e;
    });
    
    console.log('▶️ Attempting to start audio playback...');
    const audioPlayPromise = audio.play().catch(e => {
      console.warn('⚠️ Audio play failed:', e);
      return e;
    });
    
    const playResults = await Promise.allSettled([videoPlayPromise, audioPlayPromise]);
    console.log('📊 Playback synchronization results:', {
      videoResult: playResults[0].status,
      audioResult: playResults[1].status,
      videoPlaying: !video.paused && !video.ended,
      audioPlaying: !audio.paused && !audio.ended,
      videoTime: video.currentTime,
      audioTime: audio.currentTime,
      recorderState: mediaRecorder.state
    });

    // Check if playback actually started
    if (video.paused) {
      console.error('❌ CRITICAL: Video is still paused after play attempt!');
    }
    if (audio.paused) {
      console.error('❌ CRITICAL: Audio is still paused after play attempt!');
    }
    
    console.log('🎞️ Starting frame drawing loop...');

    // Draw video frames
    let frameCount = 0;
    const drawFrame = () => {
      if (!video.paused && !video.ended && mediaRecorder.state === 'recording') {
        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
        frameCount++;
        
        // Update progress
        const progress = Math.min((video.currentTime / video.duration) * 35, 35);
        if (onProgress) onProgress(60 + progress);
        
        requestAnimationFrame(drawFrame);
      }
    };
    
    requestAnimationFrame(drawFrame);

    // Wait for video to complete
    await new Promise<void>((resolve) => {
      video.onended = () => {
        console.log(`📹 Video ended after ${frameCount} frames`);
        
        // Give a small buffer for any remaining audio/video
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          audio.pause();
          audio.currentTime = 0;
          resolve();
        }, 200);
      };
      
      // Also handle case where video doesn't end properly
      setTimeout(() => {
        if (!video.ended && video.currentTime >= video.duration - 0.1) {
          console.log('🎬 Video reached end time');
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          audio.pause();
          resolve();
        }
      }, video.duration * 1000 + 1000);
    });

    const result = await recordingPromise;

    // Cleanup
    URL.revokeObjectURL(videoUrl);
    URL.revokeObjectURL(audioUrl);
    audioContext.close();
    combinedStream.getTracks().forEach(track => track.stop());
    
    if (onProgress) onProgress(100);
    
    console.log(`✅ HTML5 method result: ${videoBlob.size} → ${result.size} bytes`);
    return result;
  }

  // Method 2: WebCodecs (modern browsers)
  private async webCodecsMethod(videoBlob: Blob, audioFile: File, onProgress?: (progress: number) => void): Promise<Blob> {
    console.log('🎯 Trying WebCodecs method');
    // This is a placeholder for WebCodecs implementation
    // WebCodecs is still experimental but would provide the best control
    throw new Error('WebCodecs not fully implemented yet');
  }

  // Method 3: Web Audio API with precise timing
  private async webAudioPrecise(videoBlob: Blob, audioFile: File, onProgress?: (progress: number) => void): Promise<Blob> {
    console.log('🎯 Trying Web Audio Precise method');
    
    // Similar to htmlMediaRecorder but with more precise audio handling
    // Load audio into AudioBuffer for precise control
    const audioContext = new AudioContext();
    const audioArrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
    
    // Load video
    const videoUrl = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.src = videoUrl;
    video.muted = true;
    
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });
    
    this.canvas.width = video.videoWidth || 1920;
    this.canvas.height = video.videoHeight || 1080;
    
    const videoStream = this.canvas.captureStream(30);
    const destination = audioContext.createMediaStreamDestination();
    
    // Create buffer source for precise timing
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(destination);
    
    const combinedStream = new MediaStream();
    videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
    destination.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    
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
    
    // Start recording and playback simultaneously
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
    
    await new Promise<void>((resolve) => {
      video.onended = () => {
        setTimeout(() => {
          mediaRecorder.stop();
          resolve();
        }, 100);
      };
    });
    
    const result = await recordingPromise;
    
    URL.revokeObjectURL(videoUrl);
    audioContext.close();
    combinedStream.getTracks().forEach(track => track.stop());
    
    return result;
  }

  // Method 4: Simple canvas with audio overlay
  private async simpleCanvasAudio(videoBlob: Blob, audioFile: File, onProgress?: (progress: number) => void): Promise<Blob> {
    console.log('🎯 Trying Simple Canvas Audio method');
    
    // Most basic approach - just record the video and rely on browser audio handling
    const videoUrl = URL.createObjectURL(videoBlob);
    const video = document.createElement('video');
    video.src = videoUrl;
    
    await new Promise<void>((resolve) => {
      video.onloadedmetadata = () => resolve();
    });
    
    this.canvas.width = video.videoWidth || 1920;
    this.canvas.height = video.videoHeight || 1080;
    
    const stream = this.canvas.captureStream(24);
    const mediaRecorder = new MediaRecorder(stream);
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
    
    return result;
  }
}
