/**
 * Client-side beat detection using Web Audio API
 * This provides immediate AI functionality without Firebase Functions
 */

export interface BeatDetectionResult {
  beats: number[];
  confidence: number;
  tempo: number;
  energy: number;
}

export class ClientBeatDetector {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;

  /**
   * Initialize beat detection with audio file
   */
  async initializeAudio(audioFile: File): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      const arrayBuffer = await audioFile.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error('Error initializing audio for beat detection:', error);
      throw error;
    }
  }

  /**
   * Detect beats in the audio file
   */
  async detectBeats(): Promise<BeatDetectionResult> {
    if (!this.audioContext || !this.audioBuffer) {
      throw new Error('Audio not initialized');
    }

    try {
      const beats = await this.analyzeAudioForBeats();
      const tempo = this.calculateTempo(beats);
      const energy = this.calculateEnergyLevel();
      
      return {
        beats,
        confidence: beats.length > 0 ? 0.85 : 0.3, // Higher confidence with more beats
        tempo,
        energy
      };
    } catch (error) {
      console.error('Error detecting beats:', error);
      throw error;
    }
  }

  /**
   * Analyze audio buffer for beat patterns
   */
  private async analyzeAudioForBeats(): Promise<number[]> {
    if (!this.audioBuffer) return [];

    const beats: number[] = [];
    const sampleRate = this.audioBuffer.sampleRate;
    const channelData = this.audioBuffer.getChannelData(0);
    
    // Simple beat detection algorithm based on energy peaks
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
    const hopSize = Math.floor(windowSize / 4);
    const energyThreshold = 0.3;
    
    let lastBeatTime = 0;
    const minBeatInterval = 0.3; // Minimum 300ms between beats
    
    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      const energy = this.calculateWindowEnergy(channelData, i, windowSize);
      const time = i / sampleRate;
      
      // Look for energy peaks that could be beats
      if (energy > energyThreshold && (time - lastBeatTime) > minBeatInterval) {
        // Check if this is a local maximum
        const prevEnergy = i > hopSize ? 
          this.calculateWindowEnergy(channelData, i - hopSize, windowSize) : 0;
        const nextEnergy = i + windowSize + hopSize < channelData.length ?
          this.calculateWindowEnergy(channelData, i + hopSize, windowSize) : 0;
        
        if (energy > prevEnergy && energy > nextEnergy) {
          beats.push(time);
          lastBeatTime = time;
        }
      }
    }
    
    return beats.slice(0, 20); // Limit to 20 beats for performance
  }

  /**
   * Calculate energy in a window of audio samples
   */
  private calculateWindowEnergy(data: Float32Array, start: number, size: number): number {
    let energy = 0;
    const end = Math.min(start + size, data.length);
    
    for (let i = start; i < end; i++) {
      energy += data[i] * data[i];
    }
    
    return Math.sqrt(energy / size);
  }

  /**
   * Calculate approximate tempo from beat intervals
   */
  private calculateTempo(beats: number[]): number {
    if (beats.length < 2) return 120; // Default tempo
    
    const intervals: number[] = [];
    for (let i = 1; i < beats.length; i++) {
      intervals.push(beats[i] - beats[i - 1]);
    }
    
    // Calculate median interval
    intervals.sort((a, b) => a - b);
    const medianInterval = intervals[Math.floor(intervals.length / 2)];
    
    // Convert to BPM
    return Math.round(60 / medianInterval);
  }

  /**
   * Calculate overall energy level of the audio
   */
  private calculateEnergyLevel(): number {
    if (!this.audioBuffer) return 0.5;
    
    const channelData = this.audioBuffer.getChannelData(0);
    let totalEnergy = 0;
    
    for (let i = 0; i < channelData.length; i++) {
      totalEnergy += Math.abs(channelData[i]);
    }
    
    return Math.min(totalEnergy / channelData.length * 10, 1.0);
  }

  /**
   * Clean up audio context
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.audioBuffer = null;
  }
}

/**
 * Quick beat detection function for immediate use
 */
export async function detectBeatsFromAudio(audioFile: File): Promise<BeatDetectionResult> {
  const detector = new ClientBeatDetector();
  
  try {
    await detector.initializeAudio(audioFile);
    const result = await detector.detectBeats();
    detector.dispose();
    return result;
  } catch (error) {
    detector.dispose();
    throw error;
  }
}

/**
 * Generate smart beat points based on video duration
 */
export function generateSmartBeats(videoDuration: number, tempo: number = 120): number[] {
  const beatInterval = 60 / tempo; // seconds per beat
  const beats: number[] = [];
  
  // Start after a small delay
  let currentTime = 0.5;
  
  while (currentTime < videoDuration - 1) {
    beats.push(currentTime);
    currentTime += beatInterval;
    
    // Add some variation to make it feel more natural
    currentTime += (Math.random() - 0.5) * 0.1;
  }
  
  return beats.slice(0, 15); // Limit beats for performance
}
