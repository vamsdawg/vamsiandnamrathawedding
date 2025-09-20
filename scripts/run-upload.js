import { uploadAllImages, verifySetup } from './upload-to-gcs.js';

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