import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replace with your service account path or use GOOGLE_APPLICATION_CREDENTIALS
// For local run, you can download a service account JSON from Firebase Console
const serviceAccountPath = path.join(__dirname, '../service-account.json');
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // If running in GitHub Actions
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else if (fs.existsSync(serviceAccountPath)) {
    // If running locally
    serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
} else {
    console.error('❌ No service account found. Set FIREBASE_SERVICE_ACCOUNT env var or add service-account.json');
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function generateSitemap() {
    console.log('🚀 Generating sitemap...');
    
    const baseUrl = 'https://inmueveteperu.com';
    const staticPages = [
        '',
        '/properties',
        '/search',
        '/contact',
        '/login'
    ];

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static Pages
    staticPages.forEach(page => {
        sitemap += `  <url>\n`;
        sitemap += `    <loc>${baseUrl}${page}</loc>\n`;
        sitemap += `    <changefreq>weekly</changefreq>\n`;
        sitemap += `    <priority>${page === '' ? '1.0' : '0.8'}</priority>\n`;
        sitemap += `  </url>\n`;
    });

    // Dynamic Property Pages
    const snapshot = await db.collection('properties')
        .where('status', '==', 'disponible')
        .select('updatedAt') // Optimization: Only fetch IDs and updatedAt
        .get();
    
    snapshot.forEach(doc => {
        const property = doc.data();
        sitemap += `  <url>\n`;
        sitemap += `    <loc>${baseUrl}/property/${doc.id}</loc>\n`;
        sitemap += `    <lastmod>${property.updatedAt?.toDate ? property.updatedAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>\n`;
        sitemap += `    <changefreq>monthly</changefreq>\n`;
        sitemap += `    <priority>0.6</priority>\n`;
        sitemap += `  </url>\n`;
    });

    sitemap += '</urlset>';

    const outputPath = path.join(__dirname, '../public/sitemap.xml');
    fs.writeFileSync(outputPath, sitemap);
    
    console.log(`✅ Sitemap generated at ${outputPath}`);
}

generateSitemap().catch(console.error);
