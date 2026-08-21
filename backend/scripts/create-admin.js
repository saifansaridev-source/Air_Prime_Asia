const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from .env in backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const Admin = require('../models/Admin');

const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AirPrime@2025';

    if (!mongoUri || mongoUri.includes('<username>')) {
      console.error('\n[Error] Invalid or unconfigured MONGO_URI in .env file.');
      console.error('Please update your .env file with your valid MongoDB Atlas credentials.\n');
      process.exit(1);
    }

    console.log('[Info] Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('[Info] MongoDB connected successfully.');

    // Check if admin user already exists
    const existingAdmin = await Admin.findOne({
      username: { $regex: new RegExp(`^${adminUsername}$`, 'i') },
    });

    if (existingAdmin) {
      console.log(`\n[Info] Admin user "${adminUsername}" already exists in the database.`);
      console.log('[Info] No changes made.\n');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create new admin user
    console.log(`[Info] Creating new admin account for "${adminUsername}"...`);
    const newAdmin = new Admin({
      username: adminUsername,
      password: adminPassword,
    });

    await newAdmin.save();

    console.log('\n=============================================');
    console.log('✅ Admin user created successfully!');
    console.log(`👤 Username: ${adminUsername}`);
    console.log('🔑 Password: [As configured in your .env]');
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ [Error] Failed to create admin user:', error.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

createAdmin();
