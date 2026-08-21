const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const cloudinary = require('../config/cloudinary');
const Gallery = require('../models/Gallery');
const { authMiddleware } = require('../middleware/auth');

// Multer in-memory storage configuration
const storage = multer.memoryStorage();

// File filter: Images only (JPEG, JPG, PNG, GIF, WEBP)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, GIF, WEBP) are allowed!'), false);
  }
};

// Multer upload instance with 5MB file limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Helper: upload a single buffer to Cloudinary using a stream
const uploadBufferToCloudinary = (buffer, publicId) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'airprime-gallery',
        public_id: publicId,
        resource_type: 'image',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// Helper function to sanitize file name (used as Cloudinary public_id)
const sanitizeFilename = (name) => {
  return path
    .parse(name)
    .name.toLowerCase()
    .replace(/[^a-z0-9.]/g, '-')
    .replace(/-+/g, '-');
};

// Allowed page categories
const ALLOWED_PAGES = [
  'home',
  'flying-training',
  'ground-training',
  'gallery-alumni',
  'gallery-student',
  'gallery-media',
  'cabin-crew',
  'uncategorized',
];

// ─── GET /api/gallery/images ───────────────────────────────────────────
router.get('/images', async (req, res) => {
  try {
    const filter = {};
    if (req.query.page && req.query.page !== 'all') {
      if (req.query.page === 'uncategorized') {
        filter.$or = [
          { page: 'uncategorized' },
          { page: { $exists: false } },
          { page: null },
          { page: '' },
        ];
      } else {
        filter.page = req.query.page;
      }
    }

    const images = await Gallery.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: images.length,
      images: images.map((img) => ({
        id: img._id,
        title: img.title,
        filename: img.filename,
        originalName: img.originalName,
        filePath: img.filePath,
        fileSize: img.fileSize,
        mimeType: img.mimeType,
        page: img.page || 'uncategorized',
        uploadedBy: img.uploadedBy,
        createdAt: img.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Gallery Fetch Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve gallery images.',
      error: error.message,
    });
  }
});

// ─── PATCH /api/gallery/bulk-update ────────────────────────────────────
router.patch('/bulk-update', authMiddleware, async (req, res) => {
  try {
    const { ids, page } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a non-empty array of image IDs.',
      });
    }

    if (!page || !ALLOWED_PAGES.includes(page)) {
      return res.status(400).json({
        success: false,
        message: `Invalid page category. Must be one of: ${ALLOWED_PAGES.join(', ')}`,
      });
    }

    const result = await Gallery.updateMany(
      { _id: { $in: ids } },
      { $set: { page: page } }
    );

    return res.status(200).json({
      success: true,
      message: `${result.modifiedCount} image(s) updated successfully to "${page}".`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    });
  } catch (error) {
    console.error('[Gallery Bulk Update Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update images category.',
      error: error.message,
    });
  }
});

// ─── POST /api/gallery/upload ──────────────────────────────────────────
router.post(
  '/upload',
  authMiddleware,
  upload.fields([
    { name: 'images', maxCount: 20 },
    { name: 'image', maxCount: 1 },
    { name: 'files', maxCount: 20 },
  ]),
  async (req, res) => {
    try {
      const files = [
        ...(req.files?.images || []),
        ...(req.files?.image || []),
        ...(req.files?.files || []),
      ];

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No image files provided for upload.',
        });
      }

      const uploadedResults = [];
      const adminUser = req.session?.admin?.username || 'admin';
      const pageCategory =
        req.body.page && ALLOWED_PAGES.includes(req.body.page)
          ? req.body.page
          : 'uncategorized';

      for (const file of files) {
        const cleanName = sanitizeFilename(file.originalname);
        const uniquePublicId = `gallery-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-${cleanName}`;

        // Upload buffer to Cloudinary
        const result = await uploadBufferToCloudinary(file.buffer, uniquePublicId);

        // Save metadata to MongoDB
        const galleryDoc = new Gallery({
          title: path.parse(file.originalname).name || 'Untitled',
          filename: result.public_id, // Cloudinary public_id (used for deletion)
          originalName: file.originalname,
          filePath: result.secure_url, // Cloudinary hosted image URL
          fileSize: file.size,
          mimeType: file.mimetype,
          page: pageCategory,
          uploadedBy: adminUser,
        });

        const savedDoc = await galleryDoc.save();

        uploadedResults.push({
          id: savedDoc._id,
          title: savedDoc.title,
          filename: savedDoc.filename,
          originalName: savedDoc.originalName,
          filePath: savedDoc.filePath,
          fileSize: savedDoc.fileSize,
          mimeType: savedDoc.mimeType,
          page: savedDoc.page,
          createdAt: savedDoc.createdAt,
        });
      }

      return res.status(201).json({
        success: true,
        message: `${uploadedResults.length} image(s) uploaded successfully.`,
        data: uploadedResults.length === 1 ? uploadedResults[0] : uploadedResults,
        count: uploadedResults.length,
      });
    } catch (error) {
      console.error('[Gallery Upload Error]', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image(s).',
        error: error.message,
      });
    }
  }
);

// ─── DELETE /api/gallery/images/:id ────────────────────────────────────
router.delete('/images/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const image = await Gallery.findById(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found.',
      });
    }

    // Attempt deletion from Cloudinary
    try {
      if (image.filename) {
        await cloudinary.uploader.destroy(image.filename);
      }
    } catch (cloudinaryError) {
      console.warn('[Cloudinary Delete Warning] Could not remove image:', cloudinaryError.message);
    }

    // Delete record from MongoDB
    await Gallery.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Image deleted successfully.',
      id,
    });
  } catch (error) {
    console.error('[Gallery Delete Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete image.',
      error: error.message,
    });
  }
});

// ─── DELETE /api/gallery/images ────────────────────────────────────────
router.delete('/images', authMiddleware, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of image IDs to delete.',
      });
    }

    const imagesToDelete = await Gallery.find({ _id: { $in: ids } });

    if (imagesToDelete.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No matching images found for deletion.',
      });
    }

    // Delete images from Cloudinary
    await Promise.allSettled(
      imagesToDelete.map((img) => {
        if (!img.filename) return Promise.resolve();
        return cloudinary.uploader.destroy(img.filename);
      })
    );

    // Delete from MongoDB
    const deleteResult = await Gallery.deleteMany({ _id: { $in: ids } });

    return res.status(200).json({
      success: true,
      message: `${deleteResult.deletedCount} image(s) deleted successfully.`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error) {
    console.error('[Gallery Bulk Delete Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete images in bulk.',
      error: error.message,
    });
  }
});

module.exports = router;