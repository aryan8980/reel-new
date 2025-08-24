import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: any = null;

// Initialize FFmpeg with explicit configuration
export const initFFmpeg = async (): Promise<any> => {
  if (ffmpeg) return ffmpeg;

  try {
    console.log('🔄 Initializing FFmpeg...');
    
    ffmpeg = new FFmpeg();
    
    ffmpeg.on('log', ({ message }) => {
      console.log('FFmpeg log:', message);
    });

    await ffmpeg.load({
      coreURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js', 'text/javascript'),
      wasmURL: await toBlobURL('https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm', 'application/wasm'),
    });

    console.log('✅ FFmpeg initialized successfully');
    return ffmpeg;
  } catch (error) {
    console.error('❌ FFmpeg initialization failed:', error);
    throw error;
  }
};

// COMPLETELY NEW APPROACH: Test with simple parameters first
export const trimVideoSimple = async (
  videoFile: File,
  startTime: number,
  endTime: number
): Promise<Blob> => {
  console.log(`🎯 SIMPLE TRIM TEST - Finding the issue`);
  console.log(`  - Target: ${startTime}s to ${endTime}s (duration: ${endTime - startTime}s)`);
  
  const ffmpegInstance = await initFFmpeg();
  
  const inputName = `test_input.mp4`;
  const outputName = `test_output.mp4`;
  
  await ffmpegInstance.writeFile(inputName, await fetchFile(videoFile));
  
  // METHOD 1: Basic approach
  console.log(`\n🔧 METHOD 1: Basic -ss and -t`);
  try {
    const duration = endTime - startTime;
    const command1 = ['-i', inputName, '-ss', startTime.toString(), '-t', duration.toString(), '-c', 'copy', outputName];
    console.log(`  Command: ffmpeg ${command1.join(' ')}`);
    
    await ffmpegInstance.exec(command1);
    const data1 = await ffmpegInstance.readFile(outputName);
    
    if (data1.byteLength > 1000) {
      console.log(`✅ Method 1 worked: ${data1.byteLength} bytes`);
      await ffmpegInstance.deleteFile(inputName);
      await ffmpegInstance.deleteFile(outputName);
      return new Blob([data1], { type: 'video/mp4' });
    } else {
      console.log(`❌ Method 1 failed: ${data1.byteLength} bytes`);
      await ffmpegInstance.deleteFile(outputName);
    }
  } catch (error) {
    console.log(`❌ Method 1 error:`, error);
  }
  
  // METHOD 2: Seek before input
  console.log(`\n🔧 METHOD 2: Seek before input`);
  try {
    const duration = endTime - startTime;
    const command2 = ['-ss', startTime.toString(), '-i', inputName, '-t', duration.toString(), '-c', 'copy', outputName];
    console.log(`  Command: ffmpeg ${command2.join(' ')}`);
    
    await ffmpegInstance.exec(command2);
    const data2 = await ffmpegInstance.readFile(outputName);
    
    if (data2.byteLength > 1000) {
      console.log(`✅ Method 2 worked: ${data2.byteLength} bytes`);
      await ffmpegInstance.deleteFile(inputName);
      await ffmpegInstance.deleteFile(outputName);
      return new Blob([data2], { type: 'video/mp4' });
    } else {
      console.log(`❌ Method 2 failed: ${data2.byteLength} bytes`);
      await ffmpegInstance.deleteFile(outputName);
    }
  } catch (error) {
    console.log(`❌ Method 2 error:`, error);
  }
  
  // METHOD 3: Using -to instead of -t
  console.log(`\n🔧 METHOD 3: Using -to (end time)`);
  try {
    const command3 = ['-i', inputName, '-ss', startTime.toString(), '-to', endTime.toString(), '-c', 'copy', outputName];
    console.log(`  Command: ffmpeg ${command3.join(' ')}`);
    
    await ffmpegInstance.exec(command3);
    const data3 = await ffmpegInstance.readFile(outputName);
    
    if (data3.byteLength > 1000) {
      console.log(`✅ Method 3 worked: ${data3.byteLength} bytes`);
      await ffmpegInstance.deleteFile(inputName);
      await ffmpegInstance.deleteFile(outputName);
      return new Blob([data3], { type: 'video/mp4' });
    } else {
      console.log(`❌ Method 3 failed: ${data3.byteLength} bytes`);
      await ffmpegInstance.deleteFile(outputName);
    }
  } catch (error) {
    console.log(`❌ Method 3 error:`, error);
  }
  
  // METHOD 4: Using filter 
  console.log(`\n🔧 METHOD 4: Using trim filter`);
  try {
    const command4 = [
      '-i', inputName,
      '-vf', `trim=start=${startTime}:end=${endTime}`,
      '-af', `atrim=start=${startTime}:end=${endTime}`,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-preset', 'ultrafast',
      outputName
    ];
    console.log(`  Command: ffmpeg ${command4.join(' ')}`);
    
    await ffmpegInstance.exec(command4);
    const data4 = await ffmpegInstance.readFile(outputName);
    
    if (data4.byteLength > 1000) {
      console.log(`✅ Method 4 worked: ${data4.byteLength} bytes`);
      await ffmpegInstance.deleteFile(inputName);
      await ffmpegInstance.deleteFile(outputName);
      return new Blob([data4], { type: 'video/mp4' });
    } else {
      console.log(`❌ Method 4 failed: ${data4.byteLength} bytes`);
      await ffmpegInstance.deleteFile(outputName);
    }
  } catch (error) {
    console.log(`❌ Method 4 error:`, error);
  }
  
  // Clean up and fail
  await ffmpegInstance.deleteFile(inputName);
  console.log(`\n❌ ALL METHODS FAILED - This suggests a deeper issue`);
  console.log(`   Please check if the video has content at ${startTime}s-${endTime}s range`);
  
  throw new Error(`All trimming methods failed for ${startTime}s-${endTime}s`);
};

// Simple concatenation function
export const concatenateVideos = async (
  videoBlobs: Blob[], 
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const ffmpegInstance = await initFFmpeg();
  
  console.log(`🔗 Concatenating ${videoBlobs.length} video segments...`);
  
  // Write all input files
  const inputNames: string[] = [];
  for (let i = 0; i < videoBlobs.length; i++) {
    const inputName = `segment_${i}.mp4`;
    await ffmpegInstance.writeFile(inputName, await fetchFile(videoBlobs[i]));
    inputNames.push(inputName);
  }
  
  // Create concat file list
  const concatContent = inputNames.map(name => `file '${name}'`).join('\n');
  await ffmpegInstance.writeFile('concat_list.txt', concatContent);
  
  const outputName = 'final_output.mp4';
  
  try {
    const command = [
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat_list.txt',
      '-c', 'copy',
      outputName
    ];
    
    console.log(`Concatenation command: ffmpeg ${command.join(' ')}`);
    
    await ffmpegInstance.exec(command);
    const finalData = await ffmpegInstance.readFile(outputName);
    
    // Clean up
    for (const inputName of inputNames) {
      await ffmpegInstance.deleteFile(inputName);
    }
    await ffmpegInstance.deleteFile('concat_list.txt');
    await ffmpegInstance.deleteFile(outputName);
    
    console.log(`✅ Concatenation complete: ${finalData.byteLength} bytes`);
    return new Blob([finalData], { type: 'video/mp4' });
    
  } catch (error) {
    console.error('❌ Concatenation failed:', error);
    throw error;
  }
};
