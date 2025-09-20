# 🎭 Wedding Website: Google Cloud Storage + Vercel Deployment Guide

This guide will help you deploy your wedding website to Vercel free tier using Google Cloud Storage for images, solving the 1.8GB size limit issue.

## 📊 Problem & Solution

**Problem**: Your 180 wedding images (1.8GB) exceed Vercel's 100MB deployment limit  
**Solution**: Host images on Google Cloud Storage, deploy lightweight app to Vercel  
**Result**: Professional website with fast loading, mobile-friendly, custom domain support

## 💰 Total Cost: ~$25-30/year

- **Google Cloud Storage**: ~$15/year (1.8GB storage + bandwidth)
- **Vercel Hosting**: Free
- **Custom Domain**: $10-15/year

## 🚀 Setup Process

## 🚀 Setup Process

### Step 1: Google Cloud Storage Setup

1. **Create Google Cloud Account**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Sign up (includes $300 free credit)
   - Create new project: `vamsi-namratha-wedding`
   - Note your Project ID

2. **Enable Cloud Storage API**
   - Go to "APIs & Services" > "Library"
   - Search for "Cloud Storage API" 
   - Click "ENABLE"

3. **Create Storage Bucket**
   - Go to "Cloud Storage" > "Buckets"
   - Click "CREATE BUCKET"
   - Bucket name: `vamsi-namratha-wedding-images` (must be globally unique)
   - Location: Choose region closest to your users (e.g., `us-east1`)
   - Storage class: Standard
   - Access control: Uniform
   - Public access prevention: OFF
   - Create bucket

4. **Create Service Account**
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "CREATE SERVICE ACCOUNT"
   - Name: `wedding-image-uploader`
   - Role: "Storage Object Admin"
   - Click "CREATE KEY" → JSON
   - Download and save as `gcs-service-account.json` in your project root
   - Add to `.gitignore`: `echo "gcs-service-account.json" >> .gitignore`

### Step 2: Configure Upload Script

1. **Update Configuration**
   - Edit `scripts/upload-to-gcs.js`
   - Update `BUCKET_NAME` and `PROJECT_ID` with your values
   - Uncomment the `keyFilename` line

2. **Install Dependencies**
   ```bash
   npm install
   ```

### Step 3: Upload Images

1. **Run Upload Script**
   ```bash
   npm run upload-images
   ```
   
2. **Verify Upload**
   - Check Google Cloud Console > Storage > Your Bucket
   - Verify `scripts/gcs-config.json` was created
   - Test a few image URLs in browser

### Step 4: Test Locally

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Verify GCS Integration**
   - Check console for "✅ Loaded X images from Google Cloud Storage"
   - Navigate to gallery pages and confirm images load from GCS URLs

### Step 5: Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login and Deploy**
   ```bash
   vercel login
   vercel --prod
   ```

3. **During Setup**
   - Project name: `vamsi-namratha-wedding`
   - Framework: Other
   - Build command: `npm run vercel-build`
   - Output directory: (leave empty)

4. **Set Environment Variables**
   - Go to Vercel dashboard → Settings → Environment Variables
   - Add:
     - `MONGODB_URI`: Your MongoDB Atlas connection string
     - `SESSION_SECRET`: Your session secret from .env
     - `COUPLE_NAMES`: "Namratha & Vamsi"
     - `WEDDING_DATE`: "February 28, 2026"
     - `ADMIN_PASSWORD`: Your admin password
     - `NODE_ENV`: production

### Step 6: Custom Domain (Optional)

1. **Purchase Domain**
   - Use Namecheap, GoDaddy, or Google Domains

2. **Configure in Vercel**
   - Vercel dashboard → Settings → Domains
   - Add your domain and follow DNS instructions
   - Wait for DNS propagation (up to 24 hours)
   - SSL certificate automatically provided