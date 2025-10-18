import { Storage } from '@google-cloud/storage';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration - should match your upload script
const BUCKET_NAME = 'vamsi-namratha-website-images';
const PROJECT_ID = 'wedding-website-470200';

// Check if service account file exists
const serviceAccountPath = path.join(__dirname, '..', 'gcs-service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Service account file not found at:', serviceAccountPath);
  console.error('Please make sure gcs-service-account.json exists in the project root.');
  process.exit(1);
}

console.log('✅ Found service account file');

// Initialize Google Cloud Storage with service account
const storage = new Storage({
  projectId: PROJECT_ID,
  keyFilename: serviceAccountPath,
});

const bucket = storage.bucket(BUCKET_NAME);

/**
 * Delete all files in a specific folder/prefix
 */
async function deleteFolder(folderPath) {
  try {
    console.log(`🗑️  Deleting all files in: ${folderPath}\n`);
    
    // List all files with the prefix
    const [files] = await bucket.getFiles({ prefix: folderPath });
    
    if (files.length === 0) {
      console.log(`ℹ️  No files found in ${folderPath}`);
      return { deleted: 0, failed: 0 };
    }
    
    console.log(`📋 Found ${files.length} files to delete\n`);
    
    let deleted = 0;
    let failed = 0;
    
    // Delete each file
    for (const file of files) {
      try {
        await file.delete();
        console.log(`✅ Deleted: ${file.name}`);
        deleted++;
      } catch (error) {
        console.error(`❌ Failed to delete ${file.name}: ${error.message}`);
        failed++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully deleted: ${deleted} files`);
    console.log(`❌ Failed: ${failed} files`);
    
    return { deleted, failed };
  } catch (error) {
    console.error('❌ Error deleting folder:', error.message);
    throw error;
  }
}

/**
 * Delete specific galleries or all images
 */
async function deleteImages(options = {}) {
  console.log('🗑️  GCS Image Deletion Script\n');
  console.log(`📋 Configuration:`);
  console.log(`   Bucket: ${BUCKET_NAME}`);
  console.log(`   Project: ${PROJECT_ID}\n`);
  
  try {
    // Verify bucket access
    const [exists] = await bucket.exists();
    if (!exists) {
      throw new Error(`Bucket '${BUCKET_NAME}' does not exist`);
    }
    console.log(`✅ Connected to bucket\n`);
    
    const results = {};
    
    // Delete based on options
    if (options.nischithartham) {
      console.log('🎯 Deleting Nischithartham gallery...\n');
      results.nischithartham = await deleteFolder('gallery/Nischithartham_Pics/');
    }
    
    if (options.proposal) {
      console.log('\n🎯 Deleting Proposal gallery...\n');
      results.proposal = await deleteFolder('gallery/Proposal_Pics/');
    }
    
    if (options.all) {
      console.log('🎯 Deleting ALL images...\n');
      results.all = await deleteFolder('');
    }
    
    console.log('\n🎉 Deletion completed!');
    console.log('\nNext steps:');
    console.log('1. Curate your local images (delete unwanted ones)');
    console.log('2. Run: npm run upload-images');
    console.log('3. Your website will show only the images you kept\n');
    
    return results;
  } catch (error) {
    console.error('\n💥 Deletion failed:', error.message);
    console.log('\nPlease check:');
    console.log('1. Your service account key file exists');
    console.log('2. The service account has Storage Object Admin permissions');
    console.log('3. The bucket name is correct\n');
    throw error;
  }
}

/**
 * Interactive prompt to choose what to delete
 */
async function interactiveDelete() {
  console.log('🗑️  GCS Image Deletion Tool\n');
  console.log('What would you like to delete?\n');
  console.log('1. Nischithartham gallery only');
  console.log('2. Proposal gallery only');
  console.log('3. Both galleries');
  console.log('4. ALL images (including backgrounds, etc.)');
  console.log('5. Cancel\n');
  
  // For now, we'll default to Nischithartham only
  // You can modify this or pass command line arguments
  const choice = process.argv[2] || '1';
  console.log(`Selected option: ${choice}\n`);
  
  switch (choice) {
    case '1':
      console.log('Calling deleteImages with nischithartham option...');
      await deleteImages({ nischithartham: true });
      break;
    case '2':
      await deleteImages({ proposal: true });
      break;
    case '3':
      await deleteImages({ nischithartham: true, proposal: true });
      break;
    case '4':
      console.log('⚠️  WARNING: This will delete ALL images from the bucket!');
      console.log('⚠️  Type "yes" to confirm or run script with argument "4-confirm"\n');
      if (process.argv[2] === '4-confirm') {
        await deleteImages({ all: true });
      } else {
        console.log('❌ Deletion cancelled. Use "npm run delete-images 4-confirm" to proceed.');
      }
      break;
    case '5':
    default:
      console.log('❌ Deletion cancelled');
      process.exit(0);
  }
}

// Run the script
console.log('🚀 Starting deletion script...');
console.log('Arguments:', process.argv);

interactiveDelete().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});

export { deleteImages, deleteFolder };
