// Temporary file cache to store original files during session
// This helps avoid CORS issues when re-downloading files from Firebase Storage

interface CachedFile {
  file: File;
  mediaFileId: string;
  timestamp: number;
}

class FileCache {
  private cache = new Map<string, CachedFile>();
  private readonly MAX_AGE = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_SIZE = 10; // Maximum number of files to cache

  // Store original file
  store(mediaFileId: string, file: File): void {
    // Clean old entries first
    this.cleanup();

    // If cache is full, remove oldest entry
    if (this.cache.size >= this.MAX_SIZE) {
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      
      if (oldest) {
        this.cache.delete(oldest[0]);
      }
    }

    this.cache.set(mediaFileId, {
      file,
      mediaFileId,
      timestamp: Date.now()
    });

    console.log(`📁 Cached original file for ${mediaFileId}:`, file.name, file.size);
  }

  // Retrieve original file
  get(mediaFileId: string): File | null {
    const cached = this.cache.get(mediaFileId);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > this.MAX_AGE) {
      this.cache.delete(mediaFileId);
      return null;
    }

    console.log(`📁 Retrieved cached file for ${mediaFileId}:`, cached.file.name);
    return cached.file;
  }

  // Check if file exists in cache
  has(mediaFileId: string): boolean {
    return this.cache.has(mediaFileId);
  }

  // Clean up expired entries
  private cleanup(): void {
    const now = Date.now();
    for (const [id, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.MAX_AGE) {
        this.cache.delete(id);
      }
    }
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats(): { count: number; totalSize: number } {
    let totalSize = 0;
    for (const cached of this.cache.values()) {
      totalSize += cached.file.size;
    }
    
    return {
      count: this.cache.size,
      totalSize
    };
  }
}

// Export singleton instance
export const fileCache = new FileCache();
