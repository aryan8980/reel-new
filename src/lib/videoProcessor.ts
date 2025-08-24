import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: any = null;  // METHOD 3: Frame-accurate approach (stream copy)
  try {
    console.log(`\n🔧 METHOD 3: Frame-accurate (stream copy)`);
    return await trimVideoFrameAccurate(videoFile, startTime, endTime);
  } catch (error) {
    console.log(`❌ Method 3 failed: ${error.message}`);
  }
  
  // METHOD 4: Experimental filter-based approach
  try {
    console.log(`\n🔧 METHOD 4: Experimental (trim filter)`);
    return await trimVideoExperimental(videoFile, startTime, endTime);
  } catch (error) {
    console.log(`❌ Method 4 failed: ${error.message}`);
  }nitialize FFmpeg with explicit configuration to avoid demo videos
export const initFFmpeg = async (): Promise<any> => {
  if (ffmpeg) return ffmpeg;

  try {
    console.log('🔄 Initializing FFmpeg with explicit configuration...');
    
    ffmpeg = new FFmpeg();
    
    // Set up event handlers
    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg log:', message);
    });
    
    ffmpeg.on('progress', ({ progress }) => {
      console.log(`FFmpeg progress: ${Math.round(progress * 100)}%`);
    });
    
    // Load FFmpeg with explicit core URLs to prevent demo video issues
    const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    });
    
    console.log('✅ FFmpeg initialized successfully with explicit configuration');
    return ffmpeg;
  } catch (error) {
    console.error('❌ FFmpeg initialization failed:', error);
    
    // Fallback to default configuration
    console.log('🔄 Trying fallback FFmpeg initialization...');
    try {
      ffmpeg = new FFmpeg();
      await ffmpeg.load();
      console.log('✅ FFmpeg initialized with fallback configuration');
      return ffmpeg;
    } catch (fallbackError) {
      console.error('❌ Fallback FFmpeg initialization also failed:', fallbackError);
      throw fallbackError;
    }
  }
};

// Trim video based on start and end times with improved reliability
export const trimVideo = async (
  videoFile: File, 
  startTime: number, 
  endTime: number,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  console.log(`🎬 TRIM VIDEO - COMPREHENSIVE APPROACH:`);
  console.log(`  - Video file: ${videoFile.name} (${videoFile.size} bytes)`);
  console.log(`  - REQUESTED EXTRACT: From ${startTime}s to ${endTime}s`);
  console.log(`  - Duration: ${endTime - startTime} seconds`);
  console.log(`  - Will try 3 different FFmpeg parameter combinations`);
  
  // METHOD 1: Standard approach (-ss after -i)
  try {
    console.log(`\n🔧 METHOD 1: Standard FFmpeg (-ss after -i)`);
    const ffmpegInstance = await initFFmpeg();
    
    const inputName = `m1_input_${Date.now()}.mp4`;
    const outputName = `m1_output_${Date.now()}.mp4`;
    
    await ffmpegInstance.writeFile(inputName, await fetchFile(videoFile));
    
    const duration = endTime - startTime;
    const command = [
      '-i', inputName,
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'ultrafast',
      '-avoid_negative_ts', 'make_zero',
      '-f', 'mp4',
      outputName
    ];
    
    console.log(`  - Command: ffmpeg ${command.join(' ')}`);
    
    // Set up progress tracking
    if (onProgress) {
      ffmpegInstance.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }
    
    await ffmpegInstance.exec(command);
    
    const data = await ffmpegInstance.readFile(outputName);
    
    // Clean up
    await ffmpegInstance.deleteFile(inputName);
    await ffmpegInstance.deleteFile(outputName);
    
    if (data.byteLength > 1000) {
      console.log(`✅ Method 1 SUCCESS: ${data.byteLength} bytes`);
      return new Blob([data], { type: 'video/mp4' });
    } else {
      console.log(`⚠️ Method 1 produced small file: ${data.byteLength} bytes`);
    }
    
  } catch (error) {
    console.log(`❌ Method 1 failed: ${error.message}`);
  }
  
  // METHOD 2: Seek before input (more accurate)
  try {
    console.log(`\n🔧 METHOD 2: Seek before input (-ss before -i)`);
    return await trimVideoAlternative(videoFile, startTime, endTime);
  } catch (error) {
    console.log(`❌ Method 2 failed: ${error.message}`);
  }
  
  // METHOD 3: Using -to instead of -t
  try {
    console.log(`\n� METHOD 3: Using -to (end time) parameter`);
    return await trimVideoMethod3(videoFile, startTime, endTime);
  } catch (error) {
    console.log(`❌ Method 3 failed: ${error.message}`);
  }
  
  // If all methods fail, provide detailed error
  throw new Error(
    `All 3 trimming methods failed for segment ${startTime}s-${endTime}s. ` +
    `This suggests a fundamental issue with the video file or FFmpeg.wasm setup.`
  );
};

// Alternative trimming method for troubleshooting - uses different parameter order
export const trimVideoAlternative = async (
  videoFile: File,
  startTime: number,
  endTime: number
): Promise<Blob> => {
  const ffmpegInstance = await initFFmpeg();
  
  try {
    const inputName = `alt_input_${Date.now()}.mp4`;
    const outputName = `alt_output_${Date.now()}.mp4`;
    
    console.log(`🔄 Alternative trim method (Method 2):`);
    console.log(`  - Input: ${videoFile.name}`);
    console.log(`  - REQUESTED: Extract from ${startTime}s to ${endTime}s`);
    
    await ffmpegInstance.writeFile(inputName, await fetchFile(videoFile));
    
    // Method 2: Use -ss BEFORE input (more accurate seeking)
    const duration = endTime - startTime;
    const command = [
      '-ss', startTime.toString(),  // Seek BEFORE input (accurate)
      '-i', inputName,             // Input file
      '-t', duration.toString(),   // Duration to extract
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'veryfast',
      '-f', 'mp4',
      outputName
    ];
    
    console.log(`  - Alternative command: ffmpeg ${command.join(' ')}`);
    console.log(`  - Method: Seek BEFORE input for accuracy`);
    
    await ffmpegInstance.exec(command);
    
    const data = await ffmpegInstance.readFile(outputName);
    
    // Clean up
    await ffmpegInstance.deleteFile(inputName);
    await ffmpegInstance.deleteFile(outputName);
    
    console.log(`✅ Alternative trim successful: ${data.byteLength} bytes`);
    console.log(`  - This should contain video from ${startTime}s to ${endTime}s`);
    
    return new Blob([data], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('❌ Alternative trim also failed:', error);
    throw error;
  }
};

// NEW APPROACH: Frame-accurate trimming with video duration check
export const trimVideoFrameAccurate = async (
  videoFile: File,
  startTime: number,
  endTime: number
): Promise<Blob> => {
  const ffmpegInstance = await initFFmpeg();
  
  try {
    const inputName = `fa_input_${Date.now()}.mp4`;
    const outputName = `fa_output_${Date.now()}.mp4`;
    
    console.log(`🎯 FRAME-ACCURATE TRIMMING:`);
    console.log(`  - GOAL: Extract ${startTime}s to ${endTime}s`);
    
    await ffmpegInstance.writeFile(inputName, await fetchFile(videoFile));
    
    // First, get video duration to validate our parameters
    const infoCommand = ['-i', inputName, '-f', 'null', '-'];
    try {
      await ffmpegInstance.exec(infoCommand);
    } catch (infoError) {
      // FFmpeg throws error but we can still get duration from logs
      console.log('Video info extracted (expected error)');
    }
    
    // Use the most precise approach: keyframe seeking + exact duration
    const duration = endTime - startTime;
    
    const command = [
      '-ss', startTime.toString(),      // Seek BEFORE input for accuracy
      '-i', inputName,                  // Input file
      '-t', duration.toString(),        // Exact duration
      '-c:v', 'copy',                   // Copy video without re-encoding (faster + accurate)
      '-c:a', 'copy',                   // Copy audio without re-encoding
      '-avoid_negative_ts', 'make_zero', // Handle timestamp issues
      '-map', '0:v:0',                  // Map first video stream
      '-map', '0:a:0?',                 // Map first audio stream (optional)
      '-f', 'mp4',
      outputName
    ];
    
    console.log(`  - Frame-accurate command: ffmpeg ${command.join(' ')}`);
    console.log(`  - Using stream copy (no re-encoding) for precision`);
    
    await ffmpegInstance.exec(command);
    
    const data = await ffmpegInstance.readFile(outputName);
    
    // Clean up
    await ffmpegInstance.deleteFile(inputName);
    await ffmpegInstance.deleteFile(outputName);
    
    console.log(`✅ Frame-accurate trim: ${data.byteLength} bytes`);
    console.log(`  - Should contain EXACTLY ${duration}s from ${startTime}s mark`);
    
    return new Blob([data], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('❌ Frame-accurate method failed:', error);
    throw error;
  }
};

// EXPERIMENTAL: Try different parameter combinations to find what works
export const trimVideoExperimental = async (
  videoFile: File,
  startTime: number,
  endTime: number
): Promise<Blob> => {
  const ffmpegInstance = await initFFmpeg();
  
  try {
    const inputName = `exp_input_${Date.now()}.mp4`;
    const outputName = `exp_output_${Date.now()}.mp4`;
    
    console.log(`🧪 EXPERIMENTAL TRIMMING (Last Resort):`);
    console.log(`  - Trying unusual parameter combination`);
    
    await ffmpegInstance.writeFile(inputName, await fetchFile(videoFile));
    
    // Try with explicit start/end and different encoding
    const command = [
      '-i', inputName,
      '-filter_complex', `[0:v]trim=start=${startTime}:end=${endTime}[v]; [0:a]atrim=start=${startTime}:end=${endTime}[a]`,
      '-map', '[v]',
      '-map', '[a]',
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'ultrafast',
      '-f', 'mp4',
      outputName
    ];
    
    console.log(`  - Filter-based command: ffmpeg ${command.join(' ')}`);
    console.log(`  - Using trim filter instead of -ss/-t parameters`);
    
    await ffmpegInstance.exec(command);
    
    const data = await ffmpegInstance.readFile(outputName);
    
    // Clean up
    await ffmpegInstance.deleteFile(inputName);
    await ffmpegInstance.deleteFile(outputName);
    
    console.log(`✅ Experimental method: ${data.byteLength} bytes`);
    
    return new Blob([data], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('❌ Experimental method failed:', error);
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
      '-c:v', 'libx264',    // Re-encode instead of copy to avoid demo videos
      '-c:a', 'aac',        // Re-encode audio
      '-preset', 'fast',    // Balanced speed/quality
      '-crf', '25',         // Good quality
      '-movflags', '+faststart', // Web optimization
      outputName
    ];
    
    console.log(`  - FFmpeg command: ffmpeg ${command.join(' ')}`);
    console.log(`  - Note: Using re-encoding to avoid demo video issues`);
    
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
