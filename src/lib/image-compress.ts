// Client-side image compression before upload
// Reduces upload time and bandwidth, especially on mobile

import imageCompression from "browser-image-compression";

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxSizeMB: 1,              // Target ~1MB
  maxWidthOrHeight: 1600,    // Max dimension
  quality: 0.8,              // 80% quality
};

/**
 * Compresses an image file before upload.
 * Returns the original if compression fails or file is already small.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // Skip non-images
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Skip if already small (< 500KB)
  if (file.size < 500 * 1024) {
    return file;
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: opts.maxSizeMB!,
      maxWidthOrHeight: opts.maxWidthOrHeight!,
      initialQuality: opts.quality!,
      useWebWorker: true,
      preserveExif: false,  // Strip EXIF to save space
    });

    // Only use compressed if it's actually smaller
    if (compressed.size < file.size) {
      console.log(
        `Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`
      );
      return compressed;
    }

    return file;
  } catch (error) {
    console.warn("Image compression failed, using original:", error);
    return file;
  }
}

/**
 * Compresses image from File input before adding to FormData.
 * Usage: formData.append("foto", await compressImageForUpload(file));
 */
export async function compressImageForUpload(file: File | null): Promise<File | null> {
  if (!file) return null;
  return compressImage(file);
}
