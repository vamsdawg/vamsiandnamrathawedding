import { Storage } from '@google-cloud/storage';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = new Storage({
  projectId: 'wedding-website-470200',
  keyFilename: path.join(__dirname, '..', 'gcs-service-account.json'),
});

const bucket = storage.bucket('vamsi-namratha-website-images');

async function uploadFAQImage() {
  const localPath = path.join(__dirname, '..', 'public', 'images', 'gallery', 'FAQ', 'faqpictemple.jpg');
  const destination = 'gallery/FAQ/faqpictemple.jpg';
  
  console.log('Uploading FAQ temple image to GCS...');
  
  await bucket.upload(localPath, {
    destination: destination,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });
  
  const url = `https://storage.googleapis.com/vamsi-namratha-website-images/${destination}`;
  console.log('✅ Uploaded successfully:', url);
  return url;
}

uploadFAQImage().catch(error => {
  console.error('❌ Upload failed:', error);
  process.exit(1);
});
