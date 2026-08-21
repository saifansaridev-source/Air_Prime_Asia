// Dry run (safe, kuch delete nahi hoga): node backend/scripts/cleanup-gallery.js
// Actual delete (sirf dry-run verify karne ke baad): node backend/scripts/cleanup-gallery.js --confirm

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const Gallery = require('../models/Gallery');
const originalFilenames = require('./original-gallery-filenames.json');

async function cleanupGallery() {
  console.log('========================================');
  console.log('   AIR PRIME ASIA - GALLERY CLEANUP     ');
  console.log('========================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ Error: MONGO_URI is missing in environment variables (.env).');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.\n');

    // Create case-insensitive Set of allowed original filenames
    const originalSet = new Set(
      originalFilenames.map((name) => path.basename(name).trim().toLowerCase())
    );
    console.log(`Loaded ${originalSet.size} original gallery filenames from JSON.\n`);

    // Fetch all current gallery documents from DB
    const allImages = await Gallery.find({});
    const total = allImages.length;

    const keepList = [];
    const deleteList = [];

    allImages.forEach((doc) => {
      const original = path.basename(doc.originalName || '').trim().toLowerCase();
      if (originalSet.has(original)) {
        keepList.push(doc);
      } else {
        deleteList.push(doc);
      }
    });

    console.log('----------------------------------------');
    console.log('SUMMARY:');
    console.log('----------------------------------------');
    console.log('Total documents in DB: ' + total);
    console.log('Will KEEP (matches original gallery): ' + keepList.length);
    console.log('Will DELETE (not part of original gallery): ' + deleteList.length);

    if (deleteList.length > 0) {
      console.log('\n--- All filenames that will be DELETED ---');
      deleteList.forEach((doc) => {
        console.log('  - ' + (doc.originalName || doc.title || doc._id));
      });
    }

    // Check for --confirm flag
    const isConfirm = process.argv.includes('--confirm');
    if (isConfirm) {
      if (deleteList.length === 0) {
        console.log('\n✅ Koi extra documents delete karne ke liye nahi mile.');
      } else {
        const idsToDelete = deleteList.map((doc) => doc._id);
        const result = await Gallery.deleteMany({ _id: { $in: idsToDelete } });
        console.log('\n🗑️  DELETED ' + result.deletedCount + ' documents from MongoDB.');
      }
    } else {
      console.log(
        '\n⚠️  DRY RUN MODE — koi delete nahi hua. Confirm karne ke baad chalao: node backend/scripts/cleanup-gallery.js --confirm'
      );
    }
  } catch (err) {
    console.error('❌ Error during cleanup:', err.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed. Done.');
  }
}

cleanupGallery();
