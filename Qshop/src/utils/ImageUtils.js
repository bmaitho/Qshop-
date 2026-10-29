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

// Widths Vercel is allowed to resize to (must match "images.sizes" in vercel.json).
const SIZES = [64, 128, 256, 384, 640, 828, 1080, 1200, 1920];
const SUPABASE_PUBLIC = /^https:\/\/vycftqpspmxdohfbkqjb\.supabase\.co\/storage\/v1\/object\/public\//;

/**
 * Serve a Supabase Storage image through Vercel's image CDN: resized to the
 * width it is shown at, converted to WebP and cached at the edge. Supabase then
 * serves each image once instead of to every visitor, which keeps us inside
 * Supabase's bandwidth quota. Anything that isn't a Supabase public URL is
 * returned untouched. If the CDN ever fails, main.jsx falls back to the
 * original URL (see restoreOriginalImage).
 *
 * @param {string} url - The raw Supabase public URL
 * @param {object|number} opts - { width, quality } or just a width
 */
export const getOptimisedUrl = (url, opts = {}) => {
  if (!url || typeof url !== 'string' || !SUPABASE_PUBLIC.test(url)) return url;
  if (!import.meta.env.PROD) return url;
  const { width = 640, quality = 75 } = typeof opts === 'number' ? { width: opts } : opts;
  const w = SIZES.find((s) => s >= width * 2) || SIZES[SIZES.length - 1];
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${w}&q=${quality}`;
};

/** Short alias for render sites: img(url, displayWidthInCssPx). */
export const img = (url, width = 320) => getOptimisedUrl(url, { width });

/** The original URL behind an optimised one (used for the error fallback). */
export const originalImageUrl = (src) => {
  if (!src || !src.includes('/_vercel/image?')) return null;
  try {
    return new URL(src, window.location.origin).searchParams.get('url');
  } catch {
    return null;
  }
};

// Preset helpers for common use cases
export const getProductCardUrl = (url) => getOptimisedUrl(url, { width: 320 });

export const getProductDetailUrl = (url) => getOptimisedUrl(url, { width: 600, quality: 80 });

// Shop cards show banners at ~220-430px wide; 640 here asked Vercel for 1920px files.
export const getBannerUrl = (url) => getOptimisedUrl(url, { width: 400, quality: 80 });

export const getThumbnailUrl = (url) => getOptimisedUrl(url, { width: 64 });
