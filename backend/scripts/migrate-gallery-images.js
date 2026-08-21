// Run: node backend/scripts/migrate-gallery-images.js
// Requires: .env file with MONGO_URI, and Cloudinary env vars already configured in config/cloudinary.js

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables (checking backend/.env and current dir .env)
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const cloudinary = require('../config/cloudinary');
const Gallery = require('../models/Gallery');

// Resolve local images directory (checks images/gallery first, falls back to images)
const candidateGalleryDir = path.join(__dirname, '../../images/gallery');
const candidateImagesDir = path.join(__dirname, '../../images');
const LOCAL_IMAGES_DIR = fs.existsSync(candidateGalleryDir)
  ? candidateGalleryDir
  : candidateImagesDir;

// Allowed image file extensions
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// Delay helper to avoid Cloudinary rate limits
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function migrateImages() {
  console.log('--- Starting Gallery Images Migration ---');
  console.log(`Source directory: ${LOCAL_IMAGES_DIR}`);

  if (!fs.existsSync(LOCAL_IMAGES_DIR)) {
    console.error(`Error: Directory not found: ${LOCAL_IMAGES_DIR}`);
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Error: MONGO_URI is missing in environment variables (.env).');
    process.exit(1);
  }

  // Connect to MongoDB
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected successfully.');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }

  // Read and filter local images
  let allFiles = [];
  try {
    allFiles = fs.readdirSync(LOCAL_IMAGES_DIR);
  } catch (err) {
    console.error(`Failed to read directory ${LOCAL_IMAGES_DIR}:`, err.message);
    await mongoose.connection.close();
    process.exit(1);
  }

  const imageFiles = allFiles.filter((file) => {
    const ext = path.extname(file).toLowerCase();
    return ALLOWED_EXTENSIONS.has(ext);
  });

  console.log(`Found ${imageFiles.length} image files to process.\n`);

  let uploadedCount = 0;
  let skippedCount = 0;
  const failedImages = [];

  // Sequential processing
  for (let i = 0; i < imageFiles.length; i++) {
    const filename = imageFiles[i];
    const progressTag = `[${i + 1}/${imageFiles.length}]`;

    try {
      // 1. Check if already exists in Gallery collection
      const existing = await Gallery.findOne({ originalName: filename });
      if (existing) {
        console.log(`${progressTag} Skipped (already exists): ${filename}`);
        skippedCount++;
        continue;
      }

      // 2. Upload to Cloudinary
      const fullFilePath = path.join(LOCAL_IMAGES_DIR, filename);
      const result = await cloudinary.uploader.upload(fullFilePath, {
        folder: 'gallery-migration',
      });

      // 3. Format title: remove extension and replace underscores/hyphens with spaces
      const parsedName = path.parse(filename).name;
      const formattedTitle = parsedName.replace(/[_-]+/g, ' ').trim() || 'Untitled';

      // 4. Create Gallery document
      const galleryDoc = new Gallery({
        title: formattedTitle,
        filename: result.public_id,
        originalName: filename,
        filePath: result.secure_url,
        fileSize: result.bytes || 0,
        mimeType: result.format ? `image/${result.format}` : 'image/jpeg',
        uploadedBy: 'migration-script',
      });

      await galleryDoc.save();
      console.log(`${progressTag} Uploaded: ${filename} -> ${result.secure_url}`);
      uploadedCount++;

      // 5. 300ms delay to prevent rate limits
      await delay(300);
    } catch (error) {
      console.error(`${progressTag} Failed: ${filename} - Error: ${error.message}`);
      failedImages.push({ filename, error: error.message });
    }
  }

  // Print Summary
  console.log('\n================ Migration Summary ================');
  console.log(`Total images found: ${imageFiles.length}`);
  console.log(`Uploaded:           ${uploadedCount}`);
  console.log(`Skipped:            ${skippedCount}`);
  console.log(`Failed:             ${failedImages.length}`);

  if (failedImages.length > 0) {
    console.log('\nFailed images:');
    failedImages.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.filename} (Reason: ${item.error})`);
    });
  }
  console.log('===================================================\n');

  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  } catch (err) {
    console.error('Error closing MongoDB connection:', err.message);
  }

  process.exit(failedImages.length > 0 ? 1 : 0);
}

// Execute migration
migrateImages();
