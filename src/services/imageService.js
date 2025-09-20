import fs from 'fs';import fs from 'fs'import fs from 'fs';// Image configuration service for Google Cloud Storage

import path from 'path';

import { fileURLToPath } from 'url';import path from 'path'



const __filename = fileURLToPath(import.meta.url);import { fileURLToPath } from 'url'import path from 'path';// This will be populated after running the upload script

const __dirname = path.dirname(__filename);



class ImageService {

  constructor() {const __filename = fileURLToPath(import.meta.url)import { fileURLToPath } from 'url';

    this.isConfigured = false;

    this.config = null;const __dirname = path.dirname(__filename)

    this.baseUrl = '';

    this.galleries = {class ImageService {

      nischithartham: [],

      proposal: [],/**

      ceremony: [],

      backgrounds: {}, * Image Service for managing Google Cloud Storage URLsconst __filename = fileURLToPath(import.meta.url);  constructor() {

      logo: null,

    }; * Provides fallbacks for local development and organized access to images

    

    this.loadGCSConfiguration(); */const __dirname = path.dirname(__filename);    this.baseUrl = 'https://storage.googleapis.com/vamsi-namratha-wedding-images';

  }

class ImageService {

  loadGCSConfiguration() {

    try {  constructor() {    this.images = {};

      const configPath = path.join(__dirname, '../../scripts/gcs-config.json');

          this.isConfigured = false

      if (fs.existsSync(configPath)) {

        this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));    this.config = null/**    this.galleries = {

        this.baseUrl = this.config.baseUrl;

        this.galleries = this.config.galleries;    this.baseUrl = ''

        this.isConfigured = true;

            this.galleries = { * Image Service for managing Google Cloud Storage URLs      nischithartham: [],

        console.log(`✅ GCS Image Service: Loaded ${this.config.totalImages} images`);

      } else {      nischithartham: [],

        console.log('ℹ️  GCS configuration not found. Using local fallbacks.');

        this.setupLocalFallbacks();      proposal: [], * Provides fallbacks for local development and organized access to images      proposal: [],

      }

    } catch (error) {      ceremony: [],

      console.error('❌ Error loading GCS configuration:', error.message);

      this.setupLocalFallbacks();      backgrounds: {}, */      ceremony: [],

    }

  }      logo: null,



  setupLocalFallbacks() {    }class ImageService {      backgrounds: {},

    this.isConfigured = false;

    this.baseUrl = '';    

    this.galleries = {

      nischithartham: [],    this.loadGCSConfiguration()  constructor() {      logo: null

      proposal: [],

      ceremony: [],  }

      backgrounds: {

        'faqbackground': '/images/gallery/FAQ/faqbackground.png',    this.isConfigured = false;    };

        'background': '/images/gallery/Event_Schedule/background.png',

        'mandapam': '/images/gallery/Ceremony/mandapam.jpg',  /**

        'registrybackground': '/images/gallery/Registry/registrybackground.jpg',

      },   * Load GCS configuration from the upload script output    this.config = null;    

      logo: '/images/gallery/Wedding%20Logo.png',

    };   */

  }

  loadGCSConfiguration() {    this.baseUrl = '';    // Load configuration if available

  getNischitharthamImages() {

    if (this.isConfigured && this.galleries.nischithartham.length > 0) {    try {

      return this.galleries.nischithartham.map(img => img.url);

    }      const configPath = path.join(__dirname, '../../scripts/gcs-config.json')    this.galleries = {    this.loadConfiguration();

    return this.generateLocalImageList('Nischithartham Pics');

  }      



  getProposalImages() {      if (fs.existsSync(configPath)) {      nischithartham: [],  }

    if (this.isConfigured && this.galleries.proposal.length > 0) {

      return this.galleries.proposal.map(img => img.url);        this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'))

    }

    return this.generateLocalImageList('Proposal Pics');        this.baseUrl = this.config.baseUrl      proposal: [],  

  }

        this.galleries = this.config.galleries

  getBackgroundImage(imageName) {

    if (this.isConfigured) {        this.isConfigured = true      ceremony: [],  loadConfiguration() {

      if (this.galleries.backgrounds[imageName]) {

        return this.galleries.backgrounds[imageName];        

      }

              console.log(`✅ GCS Image Service: Loaded ${this.config.totalImages} images from Google Cloud Storage`)      backgrounds: {},    try {

      const lowerName = imageName.toLowerCase();

      for (const [key, url] of Object.entries(this.galleries.backgrounds)) {      } else {

        if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {

          return url;        console.log('ℹ️  GCS configuration not found. Using local fallbacks.')      logo: null,      // Try to load the generated configuration

        }

      }        this.setupLocalFallbacks()

    }

          }    };      const config = require('../../scripts/gcs-image-config.json');

    return this.galleries.backgrounds[imageName] || null;

  }    } catch (error) {



  getLogo() {      console.error('❌ Error loading GCS configuration:', error.message)          this.baseUrl = config.baseUrl;

    return this.galleries.logo || '/images/gallery/Wedding%20Logo.png';

  }      this.setupLocalFallbacks()



  getHeroImage() {    }    this.loadGCSConfiguration();      this.images = config.images;

    if (this.isConfigured) {

      const heroImage = this.getBackgroundImage('hero');  }

      if (heroImage) return heroImage;

    }  }      this.galleries = config.galleries;

    return '/images/hero.jpg';

  }  /**



  getFaqBackground() {   * Setup fallback URLs for local development    } catch (error) {

    return this.getBackgroundImage('faq') || 

           this.getBackgroundImage('faqbackground') ||   */

           '/images/gallery/FAQ/faqbackground.png';

  }  setupLocalFallbacks() {  /**      console.log('GCS image configuration not found. Using placeholder URLs.');



  getCeremonyBackground() {    this.isConfigured = false

    return this.getBackgroundImage('mandapam') ||

           this.getBackgroundImage('ceremony') ||    this.baseUrl = ''   * Load GCS configuration from the upload script output      // Fallback to local paths for development

           '/images/gallery/Ceremony/mandapam.jpg';

  }    this.galleries = {



  getRegistryBackground() {      nischithartham: [],   */      this.setupFallbackUrls();

    return this.getBackgroundImage('registry') ||

           this.getBackgroundImage('registrybackground') ||      proposal: [],

           null;

  }      ceremony: [],  loadGCSConfiguration() {    }



  generateLocalImageList(directory) {      backgrounds: {

    try {

      const localPath = path.join(__dirname, `../../public/images/gallery/${directory}`);        'faqbackground': '/images/gallery/FAQ/faqbackground.png',    try {  }

      if (fs.existsSync(localPath)) {

        const files = fs.readdirSync(localPath);        'background': '/images/gallery/Event_Schedule/background.png',

        return files

          .filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f))        'mandapam': '/images/gallery/Ceremony/mandapam.jpg',      const configPath = path.join(__dirname, '../../scripts/gcs-config.json');  

          .filter(f => !f.startsWith('.'))

          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))        'registrybackground': '/images/gallery/Registry/registrybackground.jpg',

          .map(name => `/images/gallery/${directory}/${name}`);

      }      },        setupFallbackUrls() {

    } catch (error) {

      console.error(`Error reading local directory ${directory}:`, error.message);      logo: '/images/gallery/Wedding%20Logo.png',

    }

    return [];    }      if (fs.existsSync(configPath)) {    // This will use local URLs when GCS config is not available

  }

  }

  isGCSConfigured() {

    return this.isConfigured;        this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));    // Useful for local development

  }

  /**

  getConfigSummary() {

    return {   * Get all Nischithartham (engagement) gallery images        this.baseUrl = this.config.baseUrl;    this.baseUrl = '';

      isConfigured: this.isConfigured,

      totalImages: this.config?.totalImages || 0,   */

      lastUpdated: this.config?.lastUpdated || null,

      bucketName: this.config?.bucketName || null,  getNischitharthamImages() {        this.galleries = this.config.galleries;    this.galleries = {

      baseUrl: this.baseUrl,

    };    if (this.isConfigured && this.galleries.nischithartham.length > 0) {

  }

      return this.galleries.nischithartham.map(img => img.url)        this.isConfigured = true;      nischithartham: [],

  reloadConfiguration() {

    this.loadGCSConfiguration();    }

    return this.getConfigSummary();

  }                  proposal: [],

}

    // Fallback for local development

const imageService = new ImageService();

    return this.generateLocalImageList('Nischithartham Pics')        console.log(`✅ GCS Image Service: Loaded ${this.config.totalImages} images from Google Cloud Storage`);      ceremony: [],

export default imageService;
  }

      } else {      backgrounds: {

  /**

   * Get all Proposal gallery images        console.log('ℹ️  GCS configuration not found. Using local fallbacks.');        'faqbackground': '/images/gallery/FAQ/faqbackground.png',

   */

  getProposalImages() {        this.setupLocalFallbacks();        'background': '/images/gallery/Event Schedule/background.png'

    if (this.isConfigured && this.galleries.proposal.length > 0) {

      return this.galleries.proposal.map(img => img.url)      }      },

    }

        } catch (error) {      logo: '/images/gallery/Wedding Logo.png'

    // Fallback for local development

    return this.generateLocalImageList('Proposal Pics')      console.error('❌ Error loading GCS configuration:', error.message);    };

  }

      this.setupLocalFallbacks();  }

  /**

   * Get background image for a specific page    }  

   */

  getBackgroundImage(imageName) {  }  // Get all images for Nischithartham gallery

    if (this.isConfigured) {

      // Try exact match first  getNischitharthamImages() {

      if (this.galleries.backgrounds[imageName]) {

        return this.galleries.backgrounds[imageName]  /**    if (this.galleries.nischithartham.length > 0) {

      }

         * Setup fallback URLs for local development      return this.galleries.nischithartham;

      // Try partial matches

      const lowerName = imageName.toLowerCase()   */    }

      for (const [key, url] of Object.entries(this.galleries.backgrounds)) {

        if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {  setupLocalFallbacks() {    

          return url

        }    this.isConfigured = false;    // Fallback: generate from known pattern

      }

    }    this.baseUrl = '';    const images = [];

    

    // Fallback to local    this.galleries = {    for (let i = 1; i <= 214; i++) {

    return this.galleries.backgrounds[imageName] || null

  }      nischithartham: [],      images.push(`${this.baseUrl}/gallery/Nischithartham Pics/${i}.jpg`);



  /**      proposal: [],    }

   * Get the wedding logo URL

   */      ceremony: [],    return images.filter(url => this.images[url.replace(this.baseUrl + '/', '')] || !this.baseUrl);

  getLogo() {

    return this.galleries.logo || '/images/gallery/Wedding%20Logo.png'      backgrounds: {  }

  }

        'faqbackground': '/images/gallery/FAQ/faqbackground.png',  

  /**

   * Get hero image        'background': '/images/gallery/Event_Schedule/background.png',  // Get all images for Proposal gallery

   */

  getHeroImage() {        'mandapam': '/images/gallery/Ceremony/mandapam.jpg',  getProposalImages() {

    if (this.isConfigured) {

      const heroImage = this.getBackgroundImage('hero')        'registrybackground': '/images/gallery/Registry/registrybackground.jpg',    if (this.galleries.proposal.length > 0) {

      if (heroImage) return heroImage

    }      },      return this.galleries.proposal;

    

    return '/images/hero.jpg'      logo: '/images/gallery/Wedding%20Logo.png',    }

  }

    };    

  /**

   * Get FAQ background image  }    // Return empty array if no configuration

   */

  getFaqBackground() {    return [];

    return this.getBackgroundImage('faq') || 

           this.getBackgroundImage('faqbackground') ||  /**  }

           '/images/gallery/FAQ/faqbackground.png'

  }   * Get all Nischithartham (engagement) gallery images  



  /**   */  // Get background image for a specific page

   * Get ceremony background image

   */  getNischitharthamImages() {  getBackgroundImage(pageName) {

  getCeremonyBackground() {

    return this.getBackgroundImage('mandapam') ||    if (this.isConfigured && this.galleries.nischithartham.length > 0) {    return this.galleries.backgrounds[pageName] || null;

           this.getBackgroundImage('ceremony') ||

           '/images/gallery/Ceremony/mandapam.jpg'      return this.galleries.nischithartham.map(img => img.url);  }

  }

    }  

  /**

   * Get registry background image      // Get the wedding logo

   */

  getRegistryBackground() {    // Fallback for local development  getLogo() {

    return this.getBackgroundImage('registry') ||

           this.getBackgroundImage('registrybackground') ||    return this.generateLocalImageList('Nischithartham Pics');    return this.galleries.logo || '/images/gallery/Wedding Logo.png';

           null

  }  }  }



  /**  

   * Generate local image list for development fallback

   */  /**  // Get hero image

  generateLocalImageList(directory) {

    try {   * Get all Proposal gallery images  getHeroImage() {

      const localPath = path.join(__dirname, `../../public/images/gallery/${directory}`)

      if (fs.existsSync(localPath)) {   */    return this.getBackgroundImage('hero') || '/images/hero.jpg';

        const files = fs.readdirSync(localPath)

        return files  getProposalImages() {  }

          .filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f))

          .filter(f => !f.startsWith('.'))    if (this.isConfigured && this.galleries.proposal.length > 0) {  

          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

          .map(name => `/images/gallery/${directory}/${name}`)      return this.galleries.proposal.map(img => img.url);  // Get ceremony background

      }

    } catch (error) {    }  getCeremonyBackground() {

      console.error(`Error reading local directory ${directory}:`, error.message)

    }        return this.getBackgroundImage('mandapam') || '/images/gallery/Ceremony/mandapam.jpg';

    

    return []    // Fallback for local development  }

  }

    return this.generateLocalImageList('Proposal Pics');  

  /**

   * Check if GCS is properly configured  }  // Generic method to get any image by path

   */

  isGCSConfigured() {  getImageUrl(relativePath) {

    return this.isConfigured

  }  /**    const fullPath = this.images[relativePath];



  /**   * Get ceremony images    return fullPath || `${this.baseUrl}/${relativePath}`;

   * Get configuration summary

   */   */  }

  getConfigSummary() {

    return {  getCeremonyImages() {  

      isConfigured: this.isConfigured,

      totalImages: this.config?.totalImages || 0,    if (this.isConfigured && this.galleries.ceremony.length > 0) {  // Check if GCS is configured

      lastUpdated: this.config?.lastUpdated || null,

      bucketName: this.config?.bucketName || null,      return this.galleries.ceremony.map(img => img.url);  isGCSConfigured() {

      baseUrl: this.baseUrl,

      galleries: {    }    return Object.keys(this.images).length > 0;

        nischithartham: this.galleries.nischithartham.length,

        proposal: this.galleries.proposal.length,      }

        backgrounds: Object.keys(this.galleries.backgrounds).length,

        hasLogo: !!this.galleries.logo,    return [];}

      },

    }  }

  }

// Export singleton instance

  /**

   * Reload configuration (useful after uploading images)  /**const imageService = new ImageService();

   */

  reloadConfiguration() {   * Get background image for a specific pagemodule.exports = imageService;

    this.loadGCSConfiguration()

    return this.getConfigSummary()   */

  }  getBackgroundImage(imageName) {

}    if (this.isConfigured) {

      // Try exact match first

// Create and export singleton instance      if (this.galleries.backgrounds[imageName]) {

const imageService = new ImageService()        return this.galleries.backgrounds[imageName];

      }

export default imageService      
      // Try partial matches
      const lowerName = imageName.toLowerCase();
      for (const [key, url] of Object.entries(this.galleries.backgrounds)) {
        if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
          return url;
        }
      }
    }
    
    // Fallback to local
    return this.galleries.backgrounds[imageName] || null;
  }

  /**
   * Get the wedding logo URL
   */
  getLogo() {
    return this.galleries.logo || '/images/gallery/Wedding%20Logo.png';
  }

  /**
   * Get hero image
   */
  getHeroImage() {
    if (this.isConfigured) {
      // Look for hero image in backgrounds
      const heroImage = this.getBackgroundImage('hero');
      if (heroImage) return heroImage;
    }
    
    return '/images/hero.jpg';
  }

  /**
   * Get FAQ background image
   */
  getFaqBackground() {
    return this.getBackgroundImage('faq') || 
           this.getBackgroundImage('faqbackground') ||
           '/images/gallery/FAQ/faqbackground.png';
  }

  /**
   * Get ceremony background image
   */
  getCeremonyBackground() {
    return this.getBackgroundImage('mandapam') ||
           this.getBackgroundImage('ceremony') ||
           '/images/gallery/Ceremony/mandapam.jpg';
  }

  /**
   * Get registry background image
   */
  getRegistryBackground() {
    return this.getBackgroundImage('registry') ||
           this.getBackgroundImage('registrybackground') ||
           null;
  }

  /**
   * Get RSVP background image
   */
  getRsvpBackground() {
    return this.getBackgroundImage('rsvp') ||
           this.getBackgroundImage('rsvpbackground') ||
           '/images/gallery/RSVP%20Image/RSVP%20Background.png';
  }

  /**
   * Get event schedule background
   */
  getEventScheduleBackground() {
    return this.getBackgroundImage('background') ||
           this.getBackgroundImage('eventschedule') ||
           '/images/gallery/Event%20Schedule/background.png';
  }

  /**
   * Generic method to get any image by relative path
   */
  getImageUrl(relativePath) {
    if (this.isConfigured && this.config.allImages) {
      const cleanPath = relativePath.replace(/^\/+/, '').replace(/\s+/g, '_');
      const imageData = this.config.allImages[cleanPath];
      if (imageData) {
        return imageData.url;
      }
    }
    
    return relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  }

  /**
   * Generate local image list for development fallback
   */
  generateLocalImageList(directory) {
    try {
      const localPath = path.join(__dirname, `../../public/images/gallery/${directory}`);
      if (fs.existsSync(localPath)) {
        const files = fs.readdirSync(localPath);
        return files
          .filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f))
          .filter(f => !f.startsWith('.'))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
          .map(name => `/images/gallery/${directory}/${name}`);
      }
    } catch (error) {
      console.error(`Error reading local directory ${directory}:`, error.message);
    }
    
    return [];
  }

  /**
   * Check if GCS is properly configured
   */
  isGCSConfigured() {
    return this.isConfigured;
  }

  /**
   * Get configuration summary
   */
  getConfigSummary() {
    return {
      isConfigured: this.isConfigured,
      totalImages: this.config?.totalImages || 0,
      lastUpdated: this.config?.lastUpdated || null,
      bucketName: this.config?.bucketName || null,
      baseUrl: this.baseUrl,
      galleries: {
        nischithartham: this.galleries.nischithartham.length,
        proposal: this.galleries.proposal.length,
        ceremony: this.galleries.ceremony.length,
        backgrounds: Object.keys(this.galleries.backgrounds).length,
        hasLogo: !!this.galleries.logo,
      },
    };
  }

  /**
   * Reload configuration (useful after uploading images)
   */
  reloadConfiguration() {
    this.loadGCSConfiguration();
    return this.getConfigSummary();
  }
}

// Create and export singleton instance
const imageService = new ImageService();

export default imageService;