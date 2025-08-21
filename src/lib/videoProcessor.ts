import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: any = null;

// Initialize FFmpeg with the simplest working configuration
export const initFFmpeg = async (): Promise<any> => {
  if (ffmpeg) return ffmpeg;

  try {
    console.log('🔄 Initializing FFmpeg with default configuration...');
    
    ffmpeg = new FFmpeg();
    
    // Set up event handlers
    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg log:', message);
    });
    
    ffmpeg.on('progress', ({ progress }) => {
      console.log(`FFmpeg progress: ${Math.round(progress * 100)}%`);
    });
    
    // Load FFmpeg with default configuration - let it handle CDN automatically
    await ffmpeg.load();
    
    console.log('✅ FFmpeg initialized successfully');
    return ffmpeg;
  } catch (error) {
    console.error('❌ FFmpeg initialization failed:', error);
    throw error;
  }
};

// Trim video based on start and end times
export const trimVideo = async (
  videoFile: File, 
  startTime: number, 
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpegInstance = await initFFmpeg();
  
  try {
    // Write input file
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    
    console.log(`🎬 FFmpeg: Starting video trim:`);
    console.log(`  - Input file: ${videoFile.name} (${videoFile.size} bytes)`);
    console.log(`  - Start time: ${startTime}s`);
    console.log(`  - End time: ${endTime}s`);
    console.log(`  - Duration: ${endTime - startTime}s`);
    
    const inputData = await fetchFile(videoFile);
    console.log(`  - Input data size: ${inputData.byteLength} bytes`);
    
    await ffmpegInstance.writeFile(inputName, inputData);
    
    // Set up progress tracking
    if (onProgress) {
      ffmpegInstance.on('progress', ({ progress }) => {
        const progressPercent = Math.round(progress * 100);
        console.log(`  - FFmpeg progress: ${progressPercent}%`);
        onProgress(progressPercent);
      });
    }
    
    // Trim video command
    const duration = endTime - startTime;
    const command = [
      '-i', inputName,
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-c', 'copy', // Use stream copy for faster processing
      '-avoid_negative_ts', 'make_zero',
      outputName
    ];
    
    console.log(`  - FFmpeg command: ffmpeg ${command.join(' ')}`);
    
    await ffmpegInstance.exec(command);
    
    // Read output file
    const data = await ffmpegInstance.readFile(outputName);
    console.log(`  - Output data size: ${data.byteLength} bytes`);
    
    // Clean up files
    await ffmpegInstance.deleteFile(inputName);
    await ffmpegInstance.deleteFile(outputName);
    
    if (data.byteLength === 0) {
      throw new Error('FFmpeg produced empty output file');
    }
    
    console.log('✅ Video trimmed successfully');
    return new Blob([data], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('❌ Video trimming failed:', error);
    throw error;
  }
};

// Create segments based on beat points
export const createBeatSegments = async (
  videoFile: File,
  beatPoints: number[],
  segmentDuration: number = 2.0, // Default 2 seconds per segment
  onProgress?: (progress: number, currentSegment: number, totalSegments: number) => void
): Promise<Blob[]> => {
  const ffmpegInstance = await initFFmpeg();
  const segments: Blob[] = [];
  
  try {
    const inputName = 'input.mp4';
    await ffmpegInstance.writeFile(inputName, await fetchFile(videoFile));
    
    console.log(`🎵 Creating ${beatPoints.length} beat segments`);
    
    for (let i = 0; i < beatPoints.length; i++) {
      const startTime = beatPoints[i];
      const outputName = `segment_${i}.mp4`;
      
      if (onProgress) {
        onProgress(Math.round((i / beatPoints.length) * 100), i + 1, beatPoints.length);
      }
      
      // Create segment
      await ffmpegInstance.exec([
        '-i', inputName,
        '-ss', startTime.toString(),
        '-t', segmentDuration.toString(),
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        outputName
      ]);
      
      // Read segment
      const segmentData = await ffmpegInstance.readFile(outputName);
      segments.push(new Blob([segmentData], { type: 'video/mp4' }));
      
      // Clean up segment file
      await ffmpegInstance.deleteFile(outputName);
    }
    
    // Clean up input file
    await ffmpegInstance.deleteFile(inputName);
    
    console.log(`✅ Created ${segments.length} beat segments`);
    return segments;
    
  } catch (error) {
    console.error('❌ Beat segment creation failed:', error);
    throw error;
  }
};

// Concatenate video segments
export const concatenateVideos = async (
  videoSegments: Blob[],
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpegInstance = await initFFmpeg();
  
  try {
    console.log(`🎬 FFmpeg: Starting video concatenation:`);
    console.log(`  - Number of segments: ${videoSegments.length}`);
    console.log(`  - Segment sizes:`, videoSegments.map(s => s.size));
    
    // Write all segment files
    const inputFiles: string[] = [];
    for (let i = 0; i < videoSegments.length; i++) {
      const fileName = `segment_${i}.mp4`;
      const segmentData = await fetchFile(videoSegments[i]);
      console.log(`  - Writing segment ${i}: ${fileName} (${segmentData.byteLength} bytes)`);
      
      await ffmpegInstance.writeFile(fileName, segmentData);
      inputFiles.push(fileName);
    }
    
    // Create concat list file
    const concatList = inputFiles.map(file => `file '${file}'`).join('\n');
    console.log(`  - Concat list:\n${concatList}`);
    
    await ffmpegInstance.writeFile('concat.txt', concatList);
    
    if (onProgress) {
      ffmpegInstance.on('progress', ({ progress }) => {
        const progressPercent = Math.round(progress * 100);
        console.log(`  - FFmpeg concatenation progress: ${progressPercent}%`);
        onProgress(progressPercent);
      });
    }
    
    const outputName = 'final_reel.mp4';
    
    const command = [
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c', 'copy',
      outputName
    ];
    
    console.log(`  - FFmpeg command: ffmpeg ${command.join(' ')}`);
    
    // Concatenate videos
    await ffmpegInstance.exec(command);
    
    // Read final output
    const finalData = await ffmpegInstance.readFile(outputName);
    console.log(`  - Final output size: ${finalData.byteLength} bytes`);
    
    // Clean up all files
    for (const file of inputFiles) {
      await ffmpegInstance.deleteFile(file);
    }
    await ffmpegInstance.deleteFile('concat.txt');
    await ffmpegInstance.deleteFile(outputName);
    
    if (finalData.byteLength === 0) {
      throw new Error('FFmpeg produced empty concatenated output');
    }
    
    console.log('✅ Videos concatenated successfully');
    return new Blob([finalData], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('❌ Video concatenation failed:', error);
    throw error;
  }
};

// Get video duration
export const getVideoDuration = async (videoFile: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(videoFile);
  });
};

// Clean up FFmpeg resources
export const cleanupFFmpeg = () => {
  if (ffmpeg) {
    ffmpeg.terminate();
    ffmpeg = null;
  }
};
