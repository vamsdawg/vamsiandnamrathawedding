import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - Update these with your Google Cloud details
const BUCKET_NAME = 'vamsi-namratha-website-images'; // You'll create this bucket
const PROJECT_ID = 'wedding-website-470200'; // Replace with your project ID

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: PROJECT_ID,
   keyFilename: './gcs-service-account.json', // Uncomment when you have the service account key
});

const bucket = storage.bucket(BUCKET_NAME);

/**
 * Upload a single file to Google Cloud Storage
 */
async function uploadFile(localFilePath, destinationPath) {
  try {
    const options = {
      destination: destinationPath,
      metadata: {
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
        contentType: getContentType(localFilePath),
      },
    };

    console.log(`⏳ Uploading: ${localFilePath} → ${destinationPath}`);
    
    await bucket.upload(localFilePath, options);
    
    // File is automatically public due to bucket-level permissions
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destinationPath}`;
    console.log(`✅ Uploaded: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error(`❌ Error uploading ${localFilePath}:`, error.message);
    throw error;
  }
}

/**
 * Get content type based on file extension
 */
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Recursively find all images in a directory
 */
function findImages(dir, baseDir = dir) {
  let images = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    if (item === '.DS_Store') continue; // Skip macOS system files
    
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      images = images.concat(findImages(fullPath, baseDir));
    } else if (stat.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item)) {
      // Create clean relative path for GCS
      const relativePath = path.relative(baseDir, fullPath)
        .replace(/\\/g, '/') // Ensure forward slashes
        .replace(/\s+/g, '_'); // Replace spaces with underscores for better URLs
        
      images.push({
        localPath: fullPath,
        gcsPath: relativePath,
        fileName: item,
        size: stat.size,
        directory: path.dirname(relativePath),
      });
    }
  }
  
  return images;
}

/**
 * Main upload function
 */
async function uploadAllImages() {
  console.log('🚀 Starting wedding image upload to Google Cloud Storage...\n');
  console.log(`📋 Configuration:`);
  console.log(`   Bucket: ${BUCKET_NAME}`);
  console.log(`   Project: ${PROJECT_ID}\n`);
  
  const imagesDir = path.join(__dirname, '..', 'public', 'images');
  
  if (!fs.existsSync(imagesDir)) {
    throw new Error(`Images directory not found: ${imagesDir}`);
  }
  
  const images = findImages(imagesDir);
  
  console.log(`📸 Found ${images.length} images to upload`);
  const totalSize = images.reduce((sum, img) => sum + img.size, 0);
  console.log(`📦 Total size: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB\n`);
  
  // Group images by directory for organized output
  const imagesByDir = images.reduce((acc, img) => {
    const dir = img.directory || 'root';
    if (!acc[dir]) acc[dir] = [];
    acc[dir].push(img);
    return acc;
  }, {});
  
  console.log(`📁 Directories found:`);
  Object.keys(imagesByDir).forEach(dir => {
    console.log(`   ${dir}: ${imagesByDir[dir].length} images`);
  });
  console.log();
  
  const uploadedUrls = {};
  const failedUploads = [];
  let successCount = 0;
  
  for (const image of images) {
    try {
      const url = await uploadFile(image.localPath, image.gcsPath);
      uploadedUrls[image.gcsPath] = {
        url,
        originalPath: image.localPath,
        fileName: image.fileName,
        directory: image.directory,
        size: image.size,
      };
      successCount++;
    } catch (error) {
      console.error(`Failed to upload ${image.localPath}: ${error.message}`);
      failedUploads.push({
        path: image.localPath,
        error: error.message,
      });
    }
  }
  
  console.log(`\n📊 Upload Summary:`);
  console.log(`✅ Successfully uploaded: ${successCount} images`);
  console.log(`❌ Failed uploads: ${failedUploads.length} images`);
  
  if (failedUploads.length > 0) {
    console.log(`\n❌ Failed uploads:`);
    failedUploads.forEach(fail => {
      console.log(`   ${fail.path}: ${fail.error}`);
    });
  }
  
  // Save the URL mapping for the application to use
  const mappingPath = path.join(__dirname, 'gcs-image-mapping.json');
  fs.writeFileSync(mappingPath, JSON.stringify(uploadedUrls, null, 2));
  console.log(`\n💾 Image URL mapping saved to: ${mappingPath}`);
  
  // Generate organized configuration for the app
  const config = generateImageConfig(uploadedUrls);
  const configPath = path.join(__dirname, 'gcs-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`📋 App configuration saved to: ${configPath}`);
  
  return { uploadedUrls, config, failedUploads };
}

/**
 * Generate organized configuration for the wedding website
 */
function generateImageConfig(uploadedUrls) {
  const config = {
    baseUrl: `https://storage.googleapis.com/${BUCKET_NAME}`,
    bucketName: BUCKET_NAME,
    totalImages: Object.keys(uploadedUrls).length,
    lastUpdated: new Date().toISOString(),
    galleries: {
      nischithartham: [],
      proposal: [],
      ceremony: [],
      backgrounds: {},
      logo: null,
    },
    allImages: uploadedUrls,
  };
  
  // Organize images by type for easy access
  Object.keys(uploadedUrls).forEach(gcsPath => {
    const imageData = uploadedUrls[gcsPath];
    const url = imageData.url;
    const lowerPath = gcsPath.toLowerCase();
    
    if (lowerPath.includes('nischithartham')) {
      config.galleries.nischithartham.push({
        url,
        path: gcsPath,
        fileName: imageData.fileName,
      });
    } else if (lowerPath.includes('proposal')) {
      config.galleries.proposal.push({
        url,
        path: gcsPath,
        fileName: imageData.fileName,
      });
    } else if (lowerPath.includes('ceremony')) {
      config.galleries.ceremony.push({
        url,
        path: gcsPath,
        fileName: imageData.fileName,
      });
    } else if (lowerPath.includes('background') || lowerPath.includes('mandapam')) {
      const bgKey = imageData.fileName.replace(/\.(jpg|png|gif|webp)$/i, '').toLowerCase();
      config.galleries.backgrounds[bgKey] = url;
    } else if (lowerPath.includes('logo')) {
      config.galleries.logo = url;
    }
  });
  
  // Sort gallery arrays by filename for consistent ordering
  config.galleries.nischithartham.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));
  config.galleries.proposal.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));
  config.galleries.ceremony.sort((a, b) => a.fileName.localeCompare(b.fileName, undefined, { numeric: true }));
  
  return config;
}

/**
 * Verify bucket access and configuration
 */
async function verifySetup() {
  try {
    console.log('🔍 Verifying Google Cloud Storage setup...');
    
    // Check if bucket exists
    const [exists] = await bucket.exists();
    if (!exists) {
      console.log(`❌ Bucket '${BUCKET_NAME}' does not exist. Please create it first.`);
      return false;
    }
    
    console.log(`✅ Bucket '${BUCKET_NAME}' exists and is accessible`);
    return true;
  } catch (error) {
    console.error('❌ Setup verification failed:', error.message);
    console.log('\nPlease check:');
    console.log('1. Your Google Cloud project ID is correct');
    console.log('2. The service account key file exists and path is correct');
    console.log('3. The bucket name is correct and you have access');
    return false;
  }
}

// Run the upload if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log('🎭 Wedding Image Upload to Google Cloud Storage\n');
      
      // Verify setup before starting upload
      const setupOk = await verifySetup();
      if (!setupOk) {
        console.log('\n❌ Setup verification failed. Please fix the issues above before uploading.');
        process.exit(1);
      }
      
      console.log('\n🚀 Starting upload...\n');
      const result = await uploadAllImages();
      
      console.log('\n🎉 Upload completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Your images are now hosted on Google Cloud Storage');
      console.log('2. The application will automatically use the new URLs');
      console.log('3. Test your website locally to verify everything works');
      console.log('4. Deploy to Vercel (should be much faster now!)');
      console.log(`\n💰 Estimated monthly cost: ~$1.25 for ${result.config.totalImages} images`);
      
    } catch (error) {
      console.error('\n💥 Upload failed:', error.message);
      console.log('\nPlease check the error above and try again.');
      process.exit(1);
    }
  })();
}

export { uploadAllImages, generateImageConfig, verifySetup };