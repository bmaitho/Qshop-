import React, { useMemo } from 'react';

/**
 * Minimal QR Code generator using SVG.
 * Encodes alphanumeric/byte data into a QR code matrix.
 * For production, consider swapping with a library like `qrcode.react`.
 * This is a self-contained implementation for quick deployment.
 */

// ── Galois Field math for QR error correction ──
const GF256 = {
  exp: new Uint8Array(512),
  log: new Uint8Array(256),
  init() {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      this.exp[i] = x;
      this.log[x] = i;
      x = x << 1;
      if (x & 256) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) this.exp[i] = this.exp[i - 255];
  },
  mul(a, b) {
    if (a === 0 || b === 0) return 0;
    return this.exp[this.log[a] + this.log[b]];
  },
};
GF256.init();

function polyMul(a, b) {
  const result = new Uint8Array(a.length + b.length - 1);
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < b.length; j++) {
      result[i + j] ^= GF256.mul(a[i], b[j]);
    }
  }
  return result;
}

function polyDiv(msg, gen) {
  const result = new Uint8Array(msg.length + gen.length - 1);
  result.set(msg);
  for (let i = 0; i < msg.length; i++) {
    const coef = result[i];
    if (coef !== 0) {
      for (let j = 1; j < gen.length; j++) {
        result[i + j] ^= GF256.mul(gen[j], coef);
      }
    }
  }
  return result.slice(msg.length);
}

function generatorPoly(n) {
  let g = new Uint8Array([1]);
  for (let i = 0; i < n; i++) {
    g = polyMul(g, new Uint8Array([1, GF256.exp[i]]));
  }
  return g;
}

// ── QR Code encoding (Version 2-6, ECC Level L) ──
const VERSION_INFO = [
  null,
  null,
  { size: 25, dataCodewords: 34, ecCodewords: 10, ecBlocks: [{ count: 1, dataCodewords: 34 }] },
  { size: 29, dataCodewords: 55, ecCodewords: 15, ecBlocks: [{ count: 1, dataCodewords: 55 }] },
  { size: 33, dataCodewords: 80, ecCodewords: 20, ecBlocks: [{ count: 1, dataCodewords: 80 }] },
  { size: 37, dataCodewords: 108, ecCodewords: 26, ecBlocks: [{ count: 1, dataCodewords: 108 }] },
  { size: 41, dataCodewords: 136, ecCodewords: 18, ecBlocks: [{ count: 2, dataCodewords: 68 }] },
];

const ALIGNMENT_PATTERNS = [null, null, [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];

function encodeData(text) {
  const bytes = new TextEncoder().encode(text);
  // Find minimum version that fits
  let version = 2;
  while (version <= 6 && bytes.length + 3 > VERSION_INFO[version].dataCodewords) {
    version++;
  }
  if (version > 6) throw new Error('Text too long for QR versions 2-6');

  const info = VERSION_INFO[version];
  const data = [];

  // Mode indicator: byte mode = 0100
  data.push(0, 1, 0, 0);

  // Character count (8 bits for byte mode, versions 1-9)
  for (let i = 7; i >= 0; i--) data.push((bytes.length >> i) & 1);

  // Data
  for (const b of bytes) {
    for (let i = 7; i >= 0; i--) data.push((b >> i) & 1);
  }

  // Terminator
  const totalBits = info.dataCodewords * 8;
  for (let i = 0; i < 4 && data.length < totalBits; i++) data.push(0);

  // Pad to byte boundary
  while (data.length % 8 !== 0) data.push(0);

  // Pad codewords
  const pads = [0xec, 0x11];
  let padIdx = 0;
  while (data.length < totalBits) {
    for (let i = 7; i >= 0; i--) data.push((pads[padIdx] >> i) & 1);
    padIdx = (padIdx + 1) % 2;
  }

  // Convert to bytes
  const codewords = new Uint8Array(info.dataCodewords);
  for (let i = 0; i < info.dataCodewords; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (data[i * 8 + j] || 0);
    codewords[i] = byte;
  }

  // Error correction
  const ecCount = info.ecCodewords;
  const gen = generatorPoly(ecCount);
  let allData = new Uint8Array(0);
  let allEc = new Uint8Array(0);

  let offset = 0;
  for (const block of info.ecBlocks) {
    for (let b = 0; b < block.count; b++) {
      const blockData = codewords.slice(offset, offset + block.dataCodewords);
      offset += block.dataCodewords;
      const ec = polyDiv(blockData, gen);
      allData = concat(allData, blockData);
      allEc = concat(allEc, ec);
    }
  }

  const finalData = concat(allData, allEc);

  return { version, info, finalData };
}

function concat(a, b) {
  const c = new Uint8Array(a.length + b.length);
  c.set(a);
  c.set(b, a.length);
  return c;
}

function createMatrix(version, info, finalData) {
  const size = info.size;
  const matrix = Array.from({ length: size }, () => new Int8Array(size)); // 0=white, 1=black, -1=unset
  const reserved = Array.from({ length: size }, () => new Uint8Array(size));

  // Place finder patterns
  function placeFinder(row, col) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r, cc = col + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const inOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const inInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[rr][cc] = (inOuter || inInner) ? 1 : 0;
        reserved[rr][cc] = 1;
      }
    }
  }
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = matrix[i][6] = i % 2 === 0 ? 1 : 0;
    reserved[6][i] = reserved[i][6] = 1;
  }

  // Alignment patterns
  const ap = ALIGNMENT_PATTERNS[version];
  if (ap) {
    for (const r of ap) {
      for (const c of ap) {
        if (reserved[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const inBorder = Math.abs(dr) === 2 || Math.abs(dc) === 2;
            const isCenter = dr === 0 && dc === 0;
            matrix[r + dr][c + dc] = (inBorder || isCenter) ? 1 : 0;
            reserved[r + dr][c + dc] = 1;
          }
        }
      }
    }
  }

  // Reserve format info areas
  for (let i = 0; i < 8; i++) {
    reserved[8][i] = reserved[i][8] = 1;
    reserved[8][size - 1 - i] = reserved[size - 1 - i][8] = 1;
  }
  reserved[8][8] = 1;
  matrix[size - 8][8] = 1; // dark module
  reserved[size - 8][8] = 1;

  // Place data bits
  const bits = [];
  for (const byte of finalData) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }

  let bitIdx = 0;
  let right = size - 1;
  let upward = true;

  while (right >= 0) {
    if (right === 6) right--; // skip timing column
    const colPair = [right, right - 1];

    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const row of rows) {
      for (const col of colPair) {
        if (col < 0) continue;
        if (reserved[row][col]) continue;
        matrix[row][col] = bitIdx < bits.length ? bits[bitIdx++] : 0;
      }
    }

    upward = !upward;
    right -= 2;
  }

  // Apply mask 0 (checkerboard) and format info
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c]) {
        if ((r + c) % 2 === 0) matrix[r][c] ^= 1;
      }
    }
  }

  // Write format info for mask 0, ECC L
  // Pre-computed: L + mask 0 = 0x77c0 → format bits = 111011111000010
  const formatBits = [1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0];

  // Horizontal
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i];
  matrix[8][7] = formatBits[6];
  matrix[8][8] = formatBits[7];
  matrix[7][8] = formatBits[8];
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i];

  // Vertical
  for (let i = 0; i < 8; i++) matrix[8][size - 1 - i] = formatBits[i];
  for (let i = 8; i < 15; i++) matrix[size - 1 - (14 - i)][8] = formatBits[i];

  return matrix;
}

const QRCode = ({ value, size = 160, fgColor = 'currentColor', bgColor = 'transparent' }) => {
  const svgContent = useMemo(() => {
    try {
      const { version, info, finalData } = encodeData(value);
      const matrix = createMatrix(version, info, finalData);
      const moduleCount = matrix.length;
      const quiet = 2; // quiet zone modules
      const total = moduleCount + quiet * 2;
      const moduleSize = size / total;

      let paths = '';
      for (let r = 0; r < moduleCount; r++) {
        for (let c = 0; c < moduleCount; c++) {
          if (matrix[r][c] === 1) {
            const x = (c + quiet) * moduleSize;
            const y = (r + quiet) * moduleSize;
            paths += `M${x},${y}h${moduleSize}v${moduleSize}h-${moduleSize}z`;
          }
        }
      }

      return { viewBox: `0 0 ${size} ${size}`, paths, valid: true };
    } catch (e) {
      console.error('QR generation error:', e);
      return { valid: false };
    }
  }, [value, size]);

  if (!svgContent.valid) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-muted rounded-lg text-xs text-foreground/40"
      >
        QR Error
      </div>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={svgContent.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      className="rounded-lg"
    >
      {bgColor !== 'transparent' && (
        <rect width={size} height={size} fill={bgColor} />
      )}
      <path d={svgContent.paths} fill={fgColor} />
    </svg>
  );
};

export default QRCode;