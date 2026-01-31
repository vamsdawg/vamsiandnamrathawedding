import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Google Cloud Storage
const storage = new Storage({
  keyFilename: path.join(__dirname, '../gcs-service-account.json'),
});

const bucketName = 'vamsi-namratha-website-images';
const bucket = storage.bucket(bucketName);

async function uploadSingleImage(localFilePath, gcsDestination) {
  try {
    console.log(`📤 Uploading: ${localFilePath}`);
    console.log(`📍 Destination: ${gcsDestination}`);
    
    // Upload the file
    await bucket.upload(localFilePath, {
      destination: gcsDestination,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    const publicUrl = `https://storage.googleapis.com/${bucketName}/${gcsDestination}`;
    console.log(`✅ Upload successful!`);
    console.log(`🌐 Public URL: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    throw error;
  }
}

async function updateGcsConfig(imageKey, imageUrl) {
  try {
    const configPath = path.join(__dirname, 'gcs-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Update the backgrounds section
    config.galleries.backgrounds[imageKey] = imageUrl;
    config.lastUpdated = new Date().toISOString();
    
    // Write back to file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Updated gcs-config.json with key: "${imageKey}"`);
  } catch (error) {
    console.error('❌ Failed to update config:', error.message);
    throw error;
  }
}

async function main() {
  const localFile = path.join(__dirname, '../public/images/gallery/Registry/registrybackground1.jpg');
  const gcsPath = 'gallery/Registry/registrybackground1.jpg';
  const configKey = 'registrybackground1';
  
  // Check if file exists
  if (!fs.existsSync(localFile)) {
    console.error(`❌ File not found: ${localFile}`);
    process.exit(1);
  }
  
  console.log('🚀 Starting single image upload...\n');
  
  // Upload the image
  const publicUrl = await uploadSingleImage(localFile, gcsPath);
  
  // Update the config file
  await updateGcsConfig(configKey, publicUrl);
  
  console.log('\n✨ All done!');
  console.log(`\nTo use this image in your code, call:`);
  console.log(`getGCSBackground('registrybackground1')`);
}

main().catch(console.error);
