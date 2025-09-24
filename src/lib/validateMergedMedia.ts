// Utility to validate that a merged video blob actually has audible audio.
// Usage: validateMergedVideo(blob).then(result => console.log(result))

export interface AudioValidationResult {
  hasAudioTrack: boolean;
  rms: number;
  duration: number;
  mimeType: string;
  success: boolean;
  reason?: string;
}

export async function validateMergedVideo(blob: Blob, timeoutMs = 4000): Promise<AudioValidationResult> {
  const url = URL.createObjectURL(blob);
  const video = document.createElement('video');
  video.src = url;
  video.crossOrigin = 'anonymous';
  video.muted = false; // we want to inspect actual audio (may still be silent if autoplay restricts)
  video.playsInline = true;
  video.style.position = 'fixed';
  video.style.left = '-9999px';
  video.style.top = '-9999px';
  document.body.appendChild(video);

  try {
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error('Video metadata load failed'));
      setTimeout(() => rej(new Error('Video metadata timeout')), 3000);
    });

    const hasAudioTrack = video.mozHasAudio || (video as any).webkitAudioDecodedByteCount > 0 || video.audioTracks?.length > 0 || false;

    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;

    const source = ctx.createMediaElementSource(video);
    source.connect(analyser);
    analyser.connect(ctx.destination); // low volume output

    const data = new Float32Array(analyser.fftSize);
    let maxRms = 0;
    const start = Date.now();

    try { await video.play(); } catch {}

    while (Date.now() - start < timeoutMs) {
      analyser.getFloatTimeDomainData(data);
      let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i]*data[i];
      const rms = Math.sqrt(sum / data.length);
      if (rms > maxRms) maxRms = rms;
      if (maxRms > 0.003) break; // enough energy
      await new Promise(r => setTimeout(r, 120));
    }

    const result: AudioValidationResult = {
      hasAudioTrack,
      rms: maxRms,
      duration: video.duration || 0,
      mimeType: blob.type || 'unknown',
      success: hasAudioTrack && maxRms > 0.001,
      reason: !hasAudioTrack ? 'No audio track detected' : (maxRms <= 0.001 ? 'Audio track silent (low RMS)' : undefined)
    };

    return result;
  } catch (e:any) {
    return { hasAudioTrack: false, rms: 0, duration: 0, mimeType: blob.type || 'unknown', success: false, reason: e.message };
  } finally {
    try { URL.revokeObjectURL(url); } catch {}
    try { if (video.parentElement) video.parentElement.removeChild(video); } catch {}
  }
}
