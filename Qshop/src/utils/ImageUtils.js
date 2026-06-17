// src/utils/imageUtils.js
// Image compression before upload + Supabase image transform helpers

const jpgName = (name) =>
  name && name.includes('.') ? name.replace(/\.[^.]+$/, '.jpg') : `${name || 'image'}.jpg`;

/**
 * Compress an image file before uploading using the Canvas API.
 *
 * - Resizes so the longest side is at most `maxSize` px (default 1200),
 *   maintaining aspect ratio.
 * - Converts any input format (HEIC, PNG, WEBP, JPG, ...) to JPEG.
 * - Encodes at `quality` (default 0.82 / 82%).
 *
 * @param {File} file - The image file to compress.
 * @param {object} [options]
 * @param {number} [options.maxSize=1200] - Max length of the longest side in px.
 * @param {number} [options.quality=0.82] - JPEG quality (0-1).
 * @param {number} [options.maxSizeKB] - Optional target size; quality is
 *   progressively reduced until the output is below this size.
 * @returns {Promise<File>} A new File with a `.jpg` extension and `image/jpeg` type.
 */
export const compressImage = (file, options = {}) => {
  // Accept legacy `maxWidth`/`maxHeight` options; the longest side wins.
  const { maxWidth, maxHeight, maxSize, quality = 0.82, maxSizeKB } = options;
  const longestSide =
    maxSize || Math.max(maxWidth || 0, maxHeight || 0) || 1200;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize so the longest side is at most `longestSide`, keeping aspect ratio.
        let { width, height } = img;
        if (width > longestSide || height > longestSide) {
          const ratio = longestSide / Math.max(width, height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // White background so transparent PNGs don't turn black as JPEG.
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const tryCompress = (q) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas toBlob failed'));
                return;
              }
              const sizeKB = blob.size / 1024;
              if (maxSizeKB && sizeKB > maxSizeKB && q > 0.4) {
                tryCompress(Math.round((q - 0.1) * 10) / 10);
                return;
              }
              resolve(
                new File([blob], jpgName(file.name), { type: 'image/jpeg' })
              );
            },
            'image/jpeg',
            q
          );
        };

        tryCompress(quality);
      };

      img.onerror = () => {
        // If the image can't be decoded (e.g. HEIC on an unsupported browser),
        // fall back to uploading the original file rather than failing the upload.
        console.warn('Could not compress image, uploading original:', file.name);
        resolve(file);
      };
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Compress multiple images in parallel.
 * @returns {Promise<File[]>}
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
