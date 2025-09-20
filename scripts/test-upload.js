import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUCKET_NAME = 'vamsi-namratha-website-images';
const PROJECT_ID = 'wedding-website-470200';

const storage = new Storage({
  projectId: PROJECT_ID,
  keyFilename: './gcs-service-account.json',
});

const bucket = storage.bucket(BUCKET_NAME);

console.log('🚀 Starting test upload...');
console.log(`📋 Bucket: ${BUCKET_NAME}`);
console.log(`📋 Project: ${PROJECT_ID}`);

// Test with just one image first
const imagesDir = path.join(__dirname, '..', 'public', 'images');
console.log(`📁 Images directory: ${imagesDir}`);

if (!fs.existsSync(imagesDir)) {
  console.error(`❌ Images directory not found: ${imagesDir}`);
  process.exit(1);
}

// Find first image
function findFirstImage(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === '.DS_Store') continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(item)) {
      return fullPath;
    } else if (stat.isDirectory()) {
      const found = findFirstImage(fullPath);
      if (found) return found;
    }
  }
  return null;
}

const testImage = findFirstImage(imagesDir);
if (!testImage) {
  console.error('❌ No images found to test with');
  process.exit(1);
}

console.log(`📸 Testing with: ${testImage}`);

async function testUpload() {
  try {
    const fileName = 'test-' + path.basename(testImage);
    console.log(`⏳ Uploading ${fileName}...`);
    
    await bucket.upload(testImage, {
      destination: fileName,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
    
    console.log(`✅ Upload successful!`);
    
    // File is automatically public due to bucket-level permissions
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
    console.log(`🌐 Public URL: ${publicUrl}`);
    
    // Clean up test file
    await bucket.file(fileName).delete();
    console.log(`🗑️ Cleaned up test file`);
    
    console.log('\n🎉 Test successful! Your setup is working correctly.');
    console.log('You can now run the full upload script.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testUpload();