// DirectElementMixer: attempts the most direct merge path:
// 1. Create HTMLVideoElement from input Blob and play it.
// 2. Use videoEl.captureStream() to get the original encoded frames (avoids canvas re-encode quality + timing issues).
// 3. Create HTMLAudioElement from audio File and try:
//    a) audioEl.captureStream() (if available) OR
//    b) WebAudio MediaElementSource -> MediaStreamDestination
// 4. Combine tracks into one MediaStream. Start MediaRecorder only once playback & at least one audio track are confirmed.
// 5. Validate result size and return Blob. Throws on clear failure so caller can fallback.

export class DirectElementMixer {
  async merge(videoBlob: Blob, audioFile: File, onProgress?: (p:number)=>void): Promise<Blob> {
    if (onProgress) onProgress(5);
    console.log('[DirectElementMixer] starting merge', { videoSize: videoBlob.size, audioSize: audioFile.size });

    const videoUrl = URL.createObjectURL(videoBlob);
    const audioUrl = URL.createObjectURL(audioFile);

    const videoEl = document.createElement('video');
    videoEl.src = videoUrl;
    videoEl.muted = true; // allow autoplay
    videoEl.playsInline = true;
    videoEl.crossOrigin = 'anonymous';
    videoEl.style.position = 'fixed';
    videoEl.style.left = '-9999px';
    videoEl.style.top = '-9999px';
    document.body.appendChild(videoEl);

    const audioEl = document.createElement('audio');
    audioEl.src = audioUrl;
    audioEl.playsInline = true;
    audioEl.crossOrigin = 'anonymous';
    audioEl.preload = 'auto';
    audioEl.style.position = 'fixed';
    audioEl.style.left = '-9999px';
    audioEl.style.top = '-9999px';
    document.body.appendChild(audioEl);

    await Promise.all([
      new Promise<void>((res, rej)=>{ videoEl.onloadedmetadata = ()=>res(); videoEl.onerror = ()=>rej(new Error('Video load failed')); }),
      new Promise<void>((res, rej)=>{ audioEl.onloadedmetadata = ()=>res(); audioEl.onerror = ()=>rej(new Error('Audio load failed')); })
    ]);

    if (onProgress) onProgress(15);

    // Acquire video stream directly
    let videoStream: MediaStream;
    try {
      videoStream = (videoEl as any).captureStream ? (videoEl as any).captureStream() : (videoEl as any).mozCaptureStream ? (videoEl as any).mozCaptureStream() : null;
      if (!videoStream) throw new Error('captureStream not supported on video element');
    } catch (e) {
      throw new Error('Video captureStream failed: ' + e);
    }

    let audioStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let bufferSource: AudioBufferSourceNode | null = null;

    // Try audioEl.captureStream first
    try {
      const cap = (audioEl as any).captureStream ? (audioEl as any).captureStream() : null;
      if (cap && cap.getAudioTracks().length > 0) {
        audioStream = cap;
        console.log('[DirectElementMixer] Using audioEl.captureStream()');
      }
    } catch (e) {
      console.warn('[DirectElementMixer] audioEl.captureStream failed', e);
    }

    // WebAudio fallback if captureStream not successful
    if (!audioStream) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') await audioContext.resume();
        const srcNode = audioContext.createMediaElementSource(audioEl);
        const dest = audioContext.createMediaStreamDestination();
        srcNode.connect(dest);
        audioStream = dest.stream;
        console.log('[DirectElementMixer] Using WebAudio MediaElementSource fallback');
      } catch (e) {
        console.warn('[DirectElementMixer] WebAudio fallback failed', e);
      }
    }

    if (!audioStream || audioStream.getAudioTracks().length === 0) {
      // Final decode fallback
      try {
        audioContext = audioContext || new (window.AudioContext || (window as any).webkitAudioContext)();
        const buf = await audioFile.arrayBuffer();
        const decoded = await audioContext.decodeAudioData(buf.slice(0));
        const bs = audioContext.createBufferSource();
        const dest = audioContext.createMediaStreamDestination();
        bs.buffer = decoded;
        bs.connect(dest);
        bs.start(0);
        audioStream = dest.stream;
        bufferSource = bs;
        console.log('[DirectElementMixer] Using decoded AudioBuffer fallback');
      } catch (e) {
        console.warn('[DirectElementMixer] Decoded AudioBuffer fallback failed', e);
      }
    }

    if (!audioStream || audioStream.getAudioTracks().length === 0) {
      console.warn('[DirectElementMixer] No audio tracks obtainable; throwing so caller can fallback');
      this.cleanup(videoEl, audioEl, videoUrl, audioUrl, audioContext, bufferSource);
      throw new Error('No audio tracks captured');
    }

    if (onProgress) onProgress(30);

    // Start playback before we combine and start recording
    try {
      await Promise.all([videoEl.play(), audioEl.play()]);
    } catch (e) {
      console.warn('[DirectElementMixer] Playback start issue (autoplay?):', e);
    }

    // Combine
    const combined = new MediaStream();
    videoStream.getVideoTracks().forEach(t => combined.addTrack(t));
    audioStream.getAudioTracks().forEach(t => combined.addTrack(t));

    console.log('[DirectElementMixer] Track summary', {
      videoTracks: combined.getVideoTracks().length,
      audioTracks: combined.getAudioTracks().length
    });

    if (combined.getAudioTracks().length === 0) {
      this.cleanup(videoEl, audioEl, videoUrl, audioUrl, audioContext, bufferSource);
      throw new Error('Combined stream has no audio tracks');
    }

    // Optional: short wait to let audio actually generate samples
    await new Promise(r => setTimeout(r, 300));

    // MediaRecorder
    const mimeCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    const mime = mimeCandidates.find(m => (window as any).MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm';
    console.log('[DirectElementMixer] Using mimeType', mime);

    const recorder = new MediaRecorder(combined, { mimeType: mime });
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };

    const resultPromise = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        if (!chunks.length) {
          reject(new Error('No chunks recorded'));
          return;
        }
        const out = new Blob(chunks, { type: 'video/webm' });
        resolve(out);
      };
      setTimeout(() => {
        if (recorder.state === 'recording') {
          try { recorder.stop(); } catch {}
        }
      }, Math.min(videoEl.duration * 1000 + 2000, 30000));
    });

    recorder.start(250);

    // Stop when video ends (or audio shorter)
    videoEl.onended = () => {
      if (recorder.state === 'recording') {
        try { recorder.stop(); } catch {}
      }
      if (bufferSource) { try { bufferSource.stop(); } catch {} }
    };

    if (onProgress) onProgress(70);

    const output = await resultPromise;
    if (onProgress) onProgress(95);

    console.log('[DirectElementMixer] Output size', output.size);

    this.cleanup(videoEl, audioEl, videoUrl, audioUrl, audioContext, bufferSource);

    if (output.size < videoBlob.size * 0.2) {
      console.warn('[DirectElementMixer] Output unexpectedly small; throwing for fallback');
      throw new Error('Merged output suspiciously small');
    }

    if (onProgress) onProgress(100);
    return output;
  }

  private cleanup(videoEl: HTMLVideoElement, audioEl: HTMLAudioElement, videoUrl: string, audioUrl: string, ctx: AudioContext | null, bufferSource: AudioBufferSourceNode | null) {
    try { URL.revokeObjectURL(videoUrl); } catch {}
    try { URL.revokeObjectURL(audioUrl); } catch {}
    try { videoEl.pause(); } catch {}
    try { audioEl.pause(); } catch {}
    try { if (videoEl.parentElement) videoEl.parentElement.removeChild(videoEl); } catch {}
    try { if (audioEl.parentElement) audioEl.parentElement.removeChild(audioEl); } catch {}
    try { if (bufferSource) bufferSource.stop(); } catch {}
    try { if (ctx) ctx.close(); } catch {}
  }
}
