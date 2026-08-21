const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: 'Untitled',
      trim: true,
    },
    filename: {
      type: String,
      required: [true, 'Filename (R2 key) is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original name is required'],
      trim: true,
    },
    filePath: {
      type: String,
      required: [true, 'File path / Public URL is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    uploadedBy: {
      type: String,
      default: 'admin',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Gallery = mongoose.model('Gallery', gallerySchema);

module.exports = Gallery;
