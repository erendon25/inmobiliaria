/**
 * Script to compress existing property images in Firebase Storage.
 * 
 * This uses a simpler approach: it downloads images via their public URLs,
 * compresses them with sharp, and re-uploads them using Firebase Admin SDK.
 * 
 * Usage: 
 *   1. Download your service account key from Firebase Console > Project Settings > Service Accounts
 *   2. Save it as: scripts/serviceAccountKey.json
 *   3. Run: node scripts/compress-images.mjs
 * 
 * If you don't have a service account key, you can generate one:
 *   Firebase Console > Project Settings > Service Accounts > Generate New Private Key
 */

import admin from 'firebase-admin';
import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Check for service account key
const serviceAccountPath = join(__dirname, 'serviceAccountKey.json');
if (!existsSync(serviceAccountPath)) {
    console.error('❌ Service account key not found!');
    console.error('');
    console.error('Please download it from Firebase Console:');
    console.error('  1. Go to: https://console.firebase.google.com/project/inmobiliaria-89dca/settings/serviceaccounts/adminsdk');
    console.error('  2. Click "Generate New Private Key"');
    console.error(`  3. Save the file as: ${serviceAccountPath}`);
    console.error('');
    process.exit(1);
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'inmobiliaria-89dca.firebasestorage.app',
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Compression settings
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 80;
const MIN_SIZE_TO_COMPRESS = 200 * 1024; // 200KB

// Stats
let totalImages = 0;
let compressedImages = 0;
let skippedImages = 0;
let errorImages = 0;
let totalSavedBytes = 0;

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function extractStoragePath(imageUrl) {
    try {
        const urlObj = new URL(imageUrl);

        if (urlObj.hostname.includes('firebasestorage.googleapis.com')) {
            // https://firebasestorage.googleapis.com/v0/b/BUCKET/o/ENCODED_PATH?alt=media&token=...
            const pathPart = urlObj.pathname.split('/o/')[1];
            if (pathPart) {
                return decodeURIComponent(pathPart.split('?')[0]);
            }
        }

        // storage.googleapis.com URLs
        if (urlObj.hostname.includes('storage.googleapis.com')) {
            const pathSegments = urlObj.pathname.split('/');
            // Remove leading empty string and bucket name
            const bucketIdx = pathSegments.findIndex(s => s.includes('inmobiliaria'));
            if (bucketIdx >= 0) {
                return pathSegments.slice(bucketIdx + 1).join('/');
            }
        }

        return null;
    } catch {
        return null;
    }
}

async function compressImage(imageUrl, propertyId, imageIndex) {
    try {
        // 1. Download image via public URL
        const response = await fetch(imageUrl);
        if (!response.ok) {
            console.log(`    ⚠️  HTTP ${response.status}, skipping`);
            skippedImages++;
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const originalBuffer = Buffer.from(arrayBuffer);
        const originalSize = originalBuffer.length;

        // 2. Skip small images
        if (originalSize < MIN_SIZE_TO_COMPRESS) {
            console.log(`    ✓ Already small (${formatBytes(originalSize)}), skip`);
            skippedImages++;
            return null;
        }

        // 3. Compress
        const compressedBuffer = await sharp(originalBuffer)
            .resize(MAX_WIDTH, null, {
                withoutEnlargement: true,
                fit: 'inside',
            })
            .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
            .toBuffer();

        const compressedSize = compressedBuffer.length;
        const savedBytes = originalSize - compressedSize;
        const savedPercent = ((savedBytes / originalSize) * 100).toFixed(1);

        // 4. Skip if not much savings
        if (savedBytes < originalSize * 0.1) {
            console.log(`    ✓ Already optimized (${formatBytes(originalSize)}), skip`);
            skippedImages++;
            return null;
        }

        console.log(`    📦 ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (-${savedPercent}%)`);

        // 5. Extract storage path and re-upload
        const storagePath = extractStoragePath(imageUrl);
        if (!storagePath) {
            console.log(`    ⚠️  Cannot extract path from URL, skipping`);
            skippedImages++;
            return null;
        }

        // 6. Upload compressed version (overwrites original)
        const file = bucket.file(storagePath);
        await file.save(compressedBuffer, {
            metadata: {
                contentType: 'image/jpeg',
                cacheControl: 'public, max-age=31536000',
            },
        });

        // 7. Make the file publicly readable and get URL
        // Firebase Storage URLs with tokens continue to work, 
        // but let's generate a fresh download URL
        await file.makePublic().catch(() => { }); // May fail for private buckets, that's OK

        // The original URL should still work since we overwrote the file at the same path
        // Token-based URLs don't change when file content changes
        totalSavedBytes += savedBytes;
        compressedImages++;

        // Return null to keep the original URL (which still works since path is the same)
        return 'keep-original-url';

    } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
        errorImages++;
        return null;
    }
}

async function main() {
    console.log('');
    console.log('🖼️  Firebase Image Compression Tool');
    console.log('━'.repeat(50));
    console.log(`Max width: ${MAX_WIDTH}px | Quality: ${JPEG_QUALITY}% | Min size: ${formatBytes(MIN_SIZE_TO_COMPRESS)}`);
    console.log('');
    console.log('🔄 Fetching properties from Firestore...\n');

    const snapshot = await db.collection('properties').get();
    const properties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`📋 Found ${properties.length} properties\n`);

    let propertyIndex = 0;

    for (const property of properties) {
        if (!property.images || property.images.length === 0) continue;

        propertyIndex++;
        console.log(`\n🏠 [${propertyIndex}] "${property.title || 'Sin título'}" (${property.images.length} imgs)`);

        for (let i = 0; i < property.images.length; i++) {
            totalImages++;
            console.log(`  📷 Image ${i + 1}/${property.images.length}`);
            await compressImage(property.images[i], property.id, i);
        }
    }

    // Final report
    console.log('\n');
    console.log('━'.repeat(50));
    console.log('📊 COMPRESSION REPORT');
    console.log('━'.repeat(50));
    console.log(`  Total images:     ${totalImages}`);
    console.log(`  ✅ Compressed:    ${compressedImages}`);
    console.log(`  ⏭️  Skipped:       ${skippedImages}`);
    console.log(`  ❌ Errors:        ${errorImages}`);
    console.log(`  💾 Space saved:   ${formatBytes(totalSavedBytes)}`);
    console.log('━'.repeat(50));
    console.log('');

    if (compressedImages > 0) {
        console.log('✅ Images were compressed in-place. Original URLs still work.');
        console.log('   No Firestore updates needed since file paths remain the same.');
    }
}

main().catch(console.error).finally(() => process.exit());
