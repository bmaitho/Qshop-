// src/utils/imageUtils.js
// Image compression before upload + Supabase image transform helpers

/**
 * Compress an image file before uploading.
 * Converts HEIC/PNG to JPEG, resizes if oversized, reduces quality.
 * Target: < 800KB for product images, < 600KB for banners
 */
export const compressImage = (file, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.82,
    maxSizeKB = 800,
  } = options;

  return new Promise((resolve, reject) => {
    const isHeic =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') ||
      file.name.toLowerCase().endsWith('.heif');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // White background for PNGs with transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try progressively lower quality until we hit target size
        const tryCompress = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas toBlob failed'));
                return;
              }
              const sizeKB = blob.size / 1024;
              if (sizeKB > maxSizeKB && q > 0.4) {
                tryCompress(Math.round((q - 0.1) * 10) / 10);
              } else {
                const compressedFile = new File(
                  [blob],
                  file.name.replace(/\.[^.]+$/, '.jpg'),
                  { type: 'image/jpeg' }
                );
                resolve({
                  file: compressedFile,
                  originalSizeKB: Math.round(file.size / 1024),
                  compressedSizeKB: Math.round(blob.size / 1024),
                  wasCompressed: blob.size < file.size,
                });
              }
            },
            'image/jpeg',
            q
          );
        };

        tryCompress(quality);
      };

      img.onerror = () => {
        // If image fails to load (e.g. HEIC on unsupported browser), pass through original
        console.warn('Could not compress image, uploading original:', file.name);
        resolve({
          file,
          originalSizeKB: Math.round(file.size / 1024),
          compressedSizeKB: Math.round(file.size / 1024),
          wasCompressed: false,
        });
      };
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Compress multiple images in parallel
 */
export const compressImages = async (files, options = {}) => {
  return Promise.all(files.map((f) => compressImage(f, options)));
};

/**
 * Get an optimised Supabase storage URL using image transformations.
 * Works only for images stored in Supabase Storage.
 *
 * @param {string} url - The raw Supabase public URL
 * @param {object} opts
 */
export const getOptimisedUrl = (url, opts = {}) => {
  if (!url) return url;

  // Only transform Supabase storage URLs
  if (!url.includes('/storage/v1/object/public/')) return url;

  // Convert to render endpoint for transformations
  const transformUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  const params = new URLSearchParams();
  if (opts.width) params.set('width', opts.width);
  if (opts.height) params.set('height', opts.height);
  params.set('quality', opts.quality ?? 75);
  params.set('resize', opts.resize ?? 'cover');

  return `${transformUrl}?${params.toString()}`;
};

// Preset helpers for common use cases
export const getProductCardUrl = (url) =>
  getOptimisedUrl(url, { width: 400, quality: 75 });

export const getProductDetailUrl = (url) =>
  getOptimisedUrl(url, { width: 900, quality: 85 });

export const getBannerUrl = (url) =>
  getOptimisedUrl(url, { width: 1200, height: 400, quality: 80 });

export const getThumbnailUrl = (url) =>
  getOptimisedUrl(url, { width: 120, height: 120, quality: 70 });
