import sharp from 'sharp';
import { Storage } from '@google-cloud/storage';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const copyFile = promisify(fs.copyFile);

// Configuration
const BUCKET_NAME = 'vamsi-namratha-website-images';
const PROJECT_ID = 'wedding-website-470200';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'gcs-service-account.json');

// Optimization settings
const OPTIMIZATION_CONFIG = {
  maxWidth: 1920,           // Max width for desktop
  maxHeight: 1920,          // Max height
  quality: 85,              // JPEG quality (85 is sweet spot - great quality, much smaller)
  format: 'jpeg',           // Output format
  progressive: true,        // Progressive JPEGs load faster perceptually
};

// Initialize GCS
const storage = new Storage({
  projectId: PROJECT_ID,
  keyFilename: SERVICE_ACCOUNT_PATH,
});
const bucket = storage.bucket(BUCKET_NAME);

/**
 * Get all image files from a directory recursively
 */
async function getImageFiles(dir, fileList = []) {
  const files = await readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileStat = await stat(filePath);
    
    if (fileStat.isDirectory()) {
      await getImageFiles(filePath, fileList);
    } else if (/\.(jpg|jpeg|png|webp)$/i.test(file)) {
      fileList.push(filePath);
    }
  }
  
  // Sort numerically by filename (natural sort)
  fileList.sort((a, b) => {
    const filenameA = path.basename(a);
    const filenameB = path.basename(b);
    return filenameA.localeCompare(filenameB, undefined, { 
      numeric: true, 
      sensitivity: 'base' 
    });
  });
  
  return fileList;
}

/**
 * Optimize a single image
 */
async function optimizeImage(inputPath, outputPath) {
  const inputStats = await stat(inputPath);
  const inputSize = inputStats.size;
  
  try {
    // Optimize the image
    await sharp(inputPath)
      .resize(OPTIMIZATION_CONFIG.maxWidth, OPTIMIZATION_CONFIG.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true, // Don't upscale small images
      })
      .jpeg({
        quality: OPTIMIZATION_CONFIG.quality,
        progressive: OPTIMIZATION_CONFIG.progressive,
        mozjpeg: true, // Use mozjpeg for better compression
      })
      .toFile(outputPath);
    
    const outputStats = await stat(outputPath);
    const outputSize = outputStats.size;
    const savings = ((inputSize - outputSize) / inputSize * 100).toFixed(1);
    
    return {
      success: true,
      inputSize,
      outputSize,
      savings: parseFloat(savings),
    };
  } catch (error) {
    console.error(`❌ Failed to optimize ${path.basename(inputPath)}: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Upload file to GCS
 */
async function uploadToGCS(filePath, destination) {
  try {
    await bucket.upload(filePath, {
      destination: destination,
      metadata: {
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
    });
    
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
    return { success: true, url: publicUrl };
  } catch (error) {
    console.error(`❌ Failed to upload ${destination}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Process gallery images
 */
async function processGallery(galleryName, localPath, gcsPath) {
  console.log(`\n📸 Processing ${galleryName}...`);
  console.log(`   Local: ${localPath}`);
  console.log(`   GCS: ${gcsPath}\n`);
  
  // Create backup directory
  const backupDir = path.join(path.dirname(localPath), `${path.basename(localPath)}_originals`);
  try {
    await mkdir(backupDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  // Create optimized directory
  const optimizedDir = path.join(path.dirname(localPath), `${path.basename(localPath)}_optimized`);
  try {
    await mkdir(optimizedDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
  
  // Get all image files
  const imageFiles = await getImageFiles(localPath);
  console.log(`📋 Found ${imageFiles.length} images to process\n`);
  
  if (imageFiles.length === 0) {
    console.log('⚠️  No images found in directory\n');
    return { processed: 0, uploaded: 0, urls: [] };
  }
  
  const results = {
    processed: 0,
    uploaded: 0,
    totalInputSize: 0,
    totalOutputSize: 0,
    urls: [],
  };
  
  // Process each image
  for (let i = 0; i < imageFiles.length; i++) {
    const inputPath = imageFiles[i];
    const filename = path.basename(inputPath, path.extname(inputPath)) + '.jpg';
    const outputPath = path.join(optimizedDir, filename);
    const backupPath = path.join(backupDir, path.basename(inputPath));
    
    console.log(`[${i + 1}/${imageFiles.length}] Processing: ${path.basename(inputPath)}`);
    
    // Backup original
    try {
      await copyFile(inputPath, backupPath);
    } catch (error) {
      console.log(`   ⚠️  Backup skipped (may already exist)`);
    }
    
    // Optimize image
    const optimizeResult = await optimizeImage(inputPath, outputPath);
    
    if (optimizeResult.success) {
      results.totalInputSize += optimizeResult.inputSize;
      results.totalOutputSize += optimizeResult.outputSize;
      results.processed++;
      
      const inputMB = (optimizeResult.inputSize / 1024 / 1024).toFixed(2);
      const outputMB = (optimizeResult.outputSize / 1024 / 1024).toFixed(2);
      
      console.log(`   ✅ Optimized: ${inputMB}MB → ${outputMB}MB (${optimizeResult.savings}% savings)`);
      
      // Upload to GCS
      const gcsDestination = `${gcsPath}${filename}`;
      console.log(`   ⬆️  Uploading to GCS: ${gcsDestination}`);
      
      const uploadResult = await uploadToGCS(outputPath, gcsDestination);
      
      if (uploadResult.success) {
        results.uploaded++;
        results.urls.push({
          url: uploadResult.url,
          path: gcsDestination,
          fileName: filename,
        });
        console.log(`   ✅ Uploaded successfully`);
      }
    }
    
    console.log('');
  }
  
  // Summary
  console.log(`\n📊 ${galleryName} Summary:`);
  console.log(`   Images processed: ${results.processed}/${imageFiles.length}`);
  console.log(`   Images uploaded: ${results.uploaded}/${results.processed}`);
  
  const totalInputMB = (results.totalInputSize / 1024 / 1024).toFixed(2);
  const totalOutputMB = (results.totalOutputSize / 1024 / 1024).toFixed(2);
  const totalSavings = ((results.totalInputSize - results.totalOutputSize) / results.totalInputSize * 100).toFixed(1);
  
  console.log(`   Total size: ${totalInputMB}MB → ${totalOutputMB}MB`);
  console.log(`   Total savings: ${totalSavings}%`);
  console.log(`   Originals backed up to: ${backupDir}`);
  console.log(`   Optimized files in: ${optimizedDir}\n`);
  
  return results;
}

/**
 * Update GCS config file
 */
async function updateGCSConfig(galleries) {
  const configPath = path.join(__dirname, 'gcs-config.json');
  
  // Try to load existing config to preserve other galleries
  let existingConfig = {
    galleries: {
      backgrounds: {},
      logo: null,
    },
  };
  
  try {
    const configData = await fs.promises.readFile(configPath, 'utf8');
    existingConfig = JSON.parse(configData);
  } catch (error) {
    console.log('   ℹ️  Creating new config file');
  }
  
  const config = {
    baseUrl: `https://storage.googleapis.com/${BUCKET_NAME}`,
    bucketName: BUCKET_NAME,
    totalImages: 0,
    lastUpdated: new Date().toISOString(),
    galleries: {
      ...existingConfig.galleries, // Preserve existing galleries like backgrounds, logo
    },
  };
  
  // Update processed galleries
  for (const [name, data] of Object.entries(galleries)) {
    if (data.urls.length > 0) {
      config.galleries[name] = data.urls;
      config.totalImages += data.urls.length;
    }
  }
  
  // Count all images
  if (config.galleries.nischithartham) {
    config.totalImages = config.galleries.nischithartham.length;
  }
  if (config.galleries.proposal) {
    config.totalImages += config.galleries.proposal.length;
  }
  
  await fs.promises.writeFile(configPath, JSON.stringify(config, null, 2));
  console.log(`✅ Updated config file: ${configPath}`);
  console.log(`   Total images in config: ${config.totalImages}\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Image Optimization & Upload Script\n');
  console.log('This script will:');
  console.log('1. Backup your original images');
  console.log('2. Optimize images (resize + compress)');
  console.log('3. Upload optimized images to GCS');
  console.log('4. Update gcs-config.json\n');
  
  // Check if sharp is installed
  try {
    // Simple check - just try to import sharp
    const testImage = sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    });
    await testImage.jpeg().toBuffer();
    console.log('✅ Sharp library loaded successfully');
  } catch (error) {
    console.error('❌ Sharp not installed or not working properly.');
    console.error('   Error:', error.message);
    console.error('   Run: npm install sharp');
    process.exit(1);
  }
  
  // Check service account
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error('❌ Service account file not found:', SERVICE_ACCOUNT_PATH);
    process.exit(1);
  }
  
  console.log('✅ All dependencies ready\n');
  
  const galleries = {};
  
  // Process Nischithartham gallery
  const nischitharthamPath = path.join(__dirname, '..', 'public', 'images', 'gallery', 'Nischithartham Pics');
  if (fs.existsSync(nischitharthamPath)) {
    galleries.nischithartham = await processGallery(
      'Nischithartham Gallery',
      nischitharthamPath,
      'gallery/Nischithartham_Pics/'
    );
  } else {
    console.log('⚠️  Nischithartham gallery not found, skipping...\n');
  }
  
  // Process Proposal gallery
  const proposalPath = path.join(__dirname, '..', 'public', 'images', 'gallery', 'Proposal Pics');
  if (fs.existsSync(proposalPath)) {
    galleries.proposal = await processGallery(
      'Proposal Gallery',
      proposalPath,
      'gallery/Proposal_Pics/'
    );
  } else {
    console.log('⚠️  Proposal gallery not found, skipping...\n');
  }
  
  // Update config
  if (galleries.nischithartham || galleries.proposal) {
    await updateGCSConfig(galleries);
  }
  
  // Final summary
  console.log('🎉 Optimization and upload complete!\n');
  console.log('Next steps:');
  console.log('1. Your original photos are backed up in *_originals folders');
  console.log('2. Optimized photos are in *_optimized folders');
  console.log('3. All optimized photos are uploaded to GCS');
  console.log('4. Your website will now load MUCH faster!');
  console.log('5. Test on both desktop and mobile\n');
  console.log('💡 Tip: You can delete the original large files from your local');
  console.log('   Nischithartham Pics folder and keep only the optimized ones.\n');
}

// Run the script
console.log('✅ Script loaded successfully');

main().catch(error => {
  console.error('\n💥 Script failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
