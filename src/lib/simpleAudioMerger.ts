// Simple audio merger for video processing
export class SimpleAudioMerger {
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
    console.log('=== SIMPLE AUDIO MERGE START ===');
    console.log('Video size:', videoBlob.size);
    console.log('Audio size:', audioFile.size);
    
    try {
      if (onProgress) onProgress(10);
      
      // Create video element
      const videoUrl = URL.createObjectURL(videoBlob);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.muted = true;
      
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => {
          console.log('Video loaded:', video.videoWidth + 'x' + video.videoHeight, video.duration + 's');
          resolve();
        };
        video.onerror = () => reject(new Error('Failed to load video'));
      });
      
      if (onProgress) onProgress(30);
      
      // Create audio element
      const audioUrl = URL.createObjectURL(audioFile);
      const audioElement = document.createElement('audio');
      audioElement.src = audioUrl;
      
      await new Promise<void>((resolve, reject) => {
        audioElement.onloadedmetadata = () => {
          console.log('Audio loaded:', audioElement.duration + 's');
          resolve();
        };
        audioElement.onerror = () => reject(new Error('Failed to load audio'));
      });
      
      if (onProgress) onProgress(50);
      
      // Setup canvas
      this.canvas.width = video.videoWidth || 1920;
      this.canvas.height = video.videoHeight || 1080;
      
      // Create video stream
      const videoStream = this.canvas.captureStream(30);
      console.log('Video tracks:', videoStream.getVideoTracks().length);
      
      // Create audio context and stream
      const audioContext = new AudioContext();
      const audioSource = audioContext.createMediaElementSource(audioElement);
      const audioDestination = audioContext.createMediaStreamDestination();
      audioSource.connect(audioDestination);
      
      console.log('Audio tracks:', audioDestination.stream.getAudioTracks().length);
      
      // Combine streams
      const combinedStream = new MediaStream();
      videoStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
      audioDestination.stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
      
      console.log('Combined stream - Video:', combinedStream.getVideoTracks().length, 'Audio:', combinedStream.getAudioTracks().length);
      
      if (onProgress) onProgress(70);
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp8,opus'
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
          console.log('Recording complete:', result.size, 'bytes');
          resolve(result);
        };
      });
      
      // Start everything
      mediaRecorder.start(100);
      audioElement.currentTime = 0;
      audioElement.play();
      video.currentTime = 0;
      video.play();
      
      console.log('Recording started...');
      
      if (onProgress) onProgress(85);
      
      // Draw video frames
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
          console.log('Video ended, stopping recording');
          setTimeout(() => {
            mediaRecorder.stop();
            audioElement.pause();
            resolve();
          }, 200);
        };
      });
      
      const result = await recordingPromise;
      
      // Cleanup
      URL.revokeObjectURL(videoUrl);
      URL.revokeObjectURL(audioUrl);
      audioContext.close();
      combinedStream.getTracks().forEach(track => track.stop());
      
      console.log('=== AUDIO MERGE SUCCESS ===');
      console.log('Original:', videoBlob.size, '-> Final:', result.size);
      
      if (onProgress) onProgress(100);
      return result;
      
    } catch (error) {
      console.error('=== AUDIO MERGE FAILED ===', error);
      if (onProgress) onProgress(100);
      return videoBlob;
    }
  }
}
