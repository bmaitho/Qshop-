import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

router.get('/sitemap.xml', async (req, res) => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // Fetch active products
    const { data: products } = await supabase
      .from('products')
      .select('id, updated_at')
      .eq('status', 'active')
      .limit(10000);

    // Fetch shops
    const { data: shops } = await supabase
      .from('shops')
      .select('id, updated_at')
      .limit(10000);

    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://unihive.shop/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://unihive.shop/products</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://unihive.shop/shops</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
`;

    // Add products
    if (products) {
      products.forEach(product => {
        const lastmod = new Date(product.updated_at).toISOString().split('T')[0];
        sitemap += `  <url>
    <loc>https://unihive.shop/products/${product.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      });
    }

    // Add shops
    if (shops) {
      shops.forEach(shop => {
        const lastmod = new Date(shop.updated_at).toISOString().split('T')[0];
        sitemap += `  <url>
    <loc>https://unihive.shop/shops/${shop.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      });
    }

    sitemap += `</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Sitemap error:', error);
    res.status(500).send('Error generating sitemap');
  }
});

export default router;