#!/usr/bin/env node
// Image optimization script for wedding website
// Compresses images to multiple sizes for responsive design

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, '../public/images');

// Configuration for responsive images
const config = {
  // Quality settings
  jpeg: { quality: 85 },
  webp: { quality: 80 },
  png: { quality: 90 },
  
  // Responsive sizes
  sizes: {
    small: 640,   // Mobile
    medium: 1280, // Tablet
    large: 1920,  // Desktop
    original: null // Keep original size but optimize
  }
};

async function getImageFiles(dir) {
  const files = [];
  const items = await fs.readdir(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...await getImageFiles(fullPath));
    } else if (/\.(jpg|jpeg|png)$/i.test(item.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function optimizeImage(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();
  const basename = path.basename(inputPath, ext);
  const dir = path.dirname(inputPath);
  
  console.log(`Processing: ${path.relative(imagesDir, inputPath)}`);
  
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    // Skip if already optimized
    if (basename.includes('-optimized')) {
      console.log(`  Skipping (already optimized)`);
      return;
    }
    
    // Get original file size
    const originalStats = await fs.stat(inputPath);
    const originalSize = (originalStats.size / 1024 / 1024).toFixed(2);
    console.log(`  Original: ${originalSize}MB (${metadata.width}x${metadata.height})`);
    
    let totalSaved = 0;
    
    // Create optimized versions for each size
    for (const [sizeName, width] of Object.entries(config.sizes)) {
      let resized = image.clone();
      
      // Resize if width is specified and original is larger
      if (width && metadata.width > width) {
        resized = resized.resize(width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }
      
      // Generate filename
      const suffix = sizeName === 'original' ? '' : `-${sizeName}`;
      const webpPath = path.join(dir, `${basename}${suffix}-optimized.webp`);
      const jpegPath = path.join(dir, `${basename}${suffix}-optimized.jpg`);
      
      // Save as WebP (best compression)
      await resized
        .webp(config.webp)
        .toFile(webpPath);
      
      // Save as JPEG (fallback)
      await resized
        .jpeg(config.jpeg)
        .toFile(jpegPath);
      
      // Get file sizes
      const webpStats = await fs.stat(webpPath);
      const jpegStats = await fs.stat(jpegPath);
      const webpSize = (webpStats.size / 1024).toFixed(0);
      const jpegSize = (jpegStats.size / 1024).toFixed(0);
      
      console.log(`  ${sizeName}: WebP ${webpSize}KB, JPEG ${jpegSize}KB`);
      totalSaved += originalStats.size - Math.min(webpStats.size, jpegStats.size);
    }
    
    const savedMB = (totalSaved / 1024 / 1024).toFixed(2);
    console.log(`  Saved: ~${savedMB}MB per size variant`);
    
    // Optional: Remove original large file (uncomment if you want)
    // if (originalStats.size > 1024 * 1024) { // If larger than 1MB
    //   await fs.unlink(inputPath);
    //   console.log(`  Removed original large file`);
    // }
    
  } catch (error) {
    console.error(`  Error processing ${inputPath}:`, error.message);
  }
}

async function main() {
  console.log('🖼️  Starting image optimization...\n');
  
  try {
    const imageFiles = await getImageFiles(imagesDir);
    console.log(`Found ${imageFiles.length} images to process\n`);
    
    // Process images in batches to avoid memory issues
    const batchSize = 5;
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize);
      await Promise.all(batch.map(optimizeImage));
      
      if (i + batchSize < imageFiles.length) {
        console.log(`\nProcessed ${i + batchSize}/${imageFiles.length}...\n`);
      }
    }
    
    console.log('\n✅ Image optimization complete!');
    console.log('\n📱 Responsive images created:');
    console.log('  - Small (640px): Mobile phones');
    console.log('  - Medium (1280px): Tablets');
    console.log('  - Large (1920px): Desktop');
    console.log('  - Original: Optimized original size');
    console.log('\n🌐 Formats:');
    console.log('  - WebP: Modern browsers (smaller files)');
    console.log('  - JPEG: Fallback for older browsers');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
