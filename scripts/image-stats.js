#!/usr/bin/env node
// Image cleanup and statistics script

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, '../public/images');

async function getImageStats() {
  const stats = {
    original: { count: 0, totalSize: 0 },
    optimized: { count: 0, totalSize: 0 },
    totalSavings: 0
  };

  async function scanDirectory(dir) {
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (/\.(jpg|jpeg|png)$/i.test(item.name)) {
        const stat = await fs.stat(fullPath);
        
        if (item.name.includes('-optimized')) {
          stats.optimized.count++;
          stats.optimized.totalSize += stat.size;
        } else {
          stats.original.count++;
          stats.original.totalSize += stat.size;
        }
      }
    }
  }
  
  await scanDirectory(imagesDir);
  stats.totalSavings = stats.original.totalSize - (stats.optimized.totalSize / 4); // Divide by 4 for different sizes
  
  return stats;
}

async function main() {
  console.log('📊 Image Optimization Statistics\n');
  
  const stats = await getImageStats();
  
  console.log(`Original Images: ${stats.original.count}`);
  console.log(`Original Size: ${(stats.original.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`\nOptimized Images: ${stats.optimized.count}`);
  console.log(`Optimized Size: ${(stats.optimized.totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  const compressionRatio = ((stats.totalSavings / stats.original.totalSize) * 100);
  console.log(`\n💾 Space Saved: ${(stats.totalSavings / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📉 Compression: ${compressionRatio.toFixed(1)}%`);
  
  // Deployment readiness check
  const totalDeploySize = stats.optimized.totalSize / 1024 / 1024;
  console.log(`\n🚀 Deployment Status:`);
  
  if (totalDeploySize < 50) {
    console.log(`✅ Ready for deployment (${totalDeploySize.toFixed(2)} MB < 50 MB limit)`);
  } else if (totalDeploySize < 100) {
    console.log(`⚠️  Acceptable for deployment (${totalDeploySize.toFixed(2)} MB, monitor loading times)`);
  } else {
    console.log(`❌ Too large for optimal deployment (${totalDeploySize.toFixed(2)} MB > 100 MB)`);
    console.log(`   Consider reducing image count or quality further`);
  }
}

main().catch(console.error);
