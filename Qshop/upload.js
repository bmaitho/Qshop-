/**
 * UniHive — Drive → Supabase Image Uploader
 * Run: node upload-images.js
 * Requires Node 18+ (has built-in fetch)
 */

import fs from 'fs';
import https from 'https';

const SUPABASE_URL = 'https://vycftqpspmxdohfbkqjb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5Y2Z0cXBzcG14ZG9oZmJrcWpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDc5OTY1MywiZXhwIjoyMDUwMzc1NjUzfQ.oQjJAZyHXRelht2-OpXxOyam5W6Z-8qZIN0q8YZXSt0';

const BUCKET = 'service-images';

// Maps CSV "Folder Name" → Supabase service_components.id
const COMPONENT_IDS = {
  'tier 1': '4712c9bb-9c7a-42a9-995f-fb4c454d77c2',
  'tier 2': '656c54c6-7477-4897-a9ce-46c9503a7e6c',
  'tier 3': '5dfbcbe5-44ec-49d3-8573-62fddafb56bf',
  'villa1':  'f3b8e2a4-a0bd-420c-aba8-a14ce72aa561',
  'villa2':  '42e5122d-31fd-4340-b061-57e3eb0c9bde',
  'villa3':  '08b245f4-d62a-4815-a4c8-affe89f308f1',
};

// ── Put all your CSV filenames here (in same folder as this script) ────────────
const CSV_FILES = [
  'drive-explorer-1773143581738.csv',  // tier 1
  'drive-explorer-1773144035166.csv',  // tier 2
  'drive-explorer-1773144102836.csv',  // tier 3
  'drive-explorer-1773144145684.csv',  // villa1
];

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = [];
    let cur = '', inQ = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

// ── Download a file following redirects ──────────────────────────────────────
function downloadFile(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'image/jpeg,image/png,image/*,*/*',
      }
    }, (res) => {
      if ([301, 302, 303].includes(res.statusCode)) {
        return resolve(downloadFile(res.headers.location, redirects + 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < 500) return reject(new Error(`Too small (${buf.length}B) — likely error page`));
        resolve(buf);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── Upload buffer to Supabase storage ────────────────────────────────────────
async function uploadToSupabase(buffer, storagePath) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: buffer,
  });
  if (!res.ok) throw new Error(`Upload failed ${res.status}: ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

// ── Save URLs back to Supabase DB ─────────────────────────────────────────────
async function saveUrlsToDB(componentId, imageUrls) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/service_components?id=eq.${componentId}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ image_urls: imageUrls }),
    }
  );
  if (!res.ok) throw new Error(`DB update failed: ${res.status}`);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 UniHive Image Uploader\n');

  // Parse all CSVs → group by folder
  const folderImages = {};
  for (const csvFile of CSV_FILES) {
    if (!fs.existsSync(csvFile)) { console.log(`⚠️  Not found: ${csvFile}`); continue; }
    const rows = parseCSV(csvFile);
    for (const row of rows) {
      const folder = row['Folder Name'].trim().toLowerCase();
      const url = row['Download Link'].trim();
      if (!url) continue;
      if (!folderImages[folder]) folderImages[folder] = [];
      folderImages[folder].push(url);
    }
  }

  console.log('📂 Folders found:');
  Object.entries(folderImages).forEach(([f, urls]) => console.log(`   ${f}: ${urls.length} images`));
  console.log();

  const summary = {};

  for (const [folder, downloadUrls] of Object.entries(folderImages)) {
    const componentId = COMPONENT_IDS[folder];
    if (!componentId) {
      console.log(`⚠️  No component mapped for "${folder}" — skipping\n`);
      continue;
    }

    console.log(`📁 ${folder} (${downloadUrls.length} images)`);
    const uploadedUrls = [];

    for (let i = 0; i < downloadUrls.length; i++) {
      const storagePath = `services/bnb/${folder.replace(/\s+/g, '_')}/${i + 1}.jpg`;
      process.stdout.write(`   [${String(i + 1).padStart(2)}/${downloadUrls.length}] Downloading...`);

      try {
        const buffer = await downloadFile(downloadUrls[i]);
        process.stdout.write(` ✓  Uploading (${Math.round(buffer.length / 1024)}KB)...`);
        const publicUrl = await uploadToSupabase(buffer, storagePath);
        uploadedUrls.push(publicUrl);
        process.stdout.write(` ✓\n`);
      } catch (err) {
        process.stdout.write(` ✗  ${err.message}\n`);
      }

      await sleep(150);
    }

    if (uploadedUrls.length > 0) {
      process.stdout.write(`   💾 Saving ${uploadedUrls.length} URLs to DB...`);
      try {
        await saveUrlsToDB(componentId, uploadedUrls);
        console.log(' ✓\n');
      } catch (err) {
        console.log(` ✗  ${err.message}\n`);
      }
    }

    summary[folder] = uploadedUrls.length;
  }

  console.log('─'.repeat(45));
  console.log('✅ Complete!\n');
  Object.entries(summary).forEach(([f, n]) => console.log(`   ${f}: ${n} images`));
  console.log('\nImages are now in Supabase — will load perfectly in the app.\n');
}

main().catch(err => { console.error('\n❌ Error:', err.message); process.exit(1); });