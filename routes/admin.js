const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const sharp = require('sharp');

const { requireAdmin } = require('../middleware/auth');
const {
  addItem,
  updateItem,
  deleteItem,
  reorderItems,
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories
} = require('../db/database');

// Ensure upload directories exist
const uploadBaseDir = path.join(__dirname, '..', 'uploads');
const originalsDir = path.join(uploadBaseDir, 'originals');
const thumbnailsDir = path.join(uploadBaseDir, 'thumbnails');

[uploadBaseDir, originalsDir, thumbnailsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, originalsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    // Unique filename using timestamp + random integer to prevent collision on bulk upload
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    files: 10,
    fileSize: 500 * 1024 * 1024 // 500MB max per file to allow high-res videos
  }
});

// Cache for the bcrypt hash of ADMIN_PASSWORD
let cachedAdminHash = null;

async function getAdminPasswordHash() {
  if (!cachedAdminHash) {
    const rawPassword = process.env.ADMIN_PASSWORD || 'ogsnkt2024';
    cachedAdminHash = await bcrypt.hash(rawPassword, 10);
  }
  return cachedAdminHash;
}

// ==========================================
// Public Admin Endpoints (No requireAdmin)
// ==========================================

/**
 * POST /api/admin/login
 * Compare password with bcrypt hash of ADMIN_PASSWORD env var.
 * On first login, hash the env password and cache it.
 */
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const adminHash = await getAdminPasswordHash();
    const isMatch = await bcrypt.compare(password, adminHash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    req.session.isAdmin = true;
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Session save error:', saveErr);
        return res.status(500).json({ error: 'Failed to initialize session' });
      }
      return res.json({ success: true, message: 'Logged in successfully', isAdmin: true });
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
});

/**
 * POST /api/admin/logout
 * Destroys current session
 */
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Failed to destroy session' });
      }
      res.clearCookie('connect.sid');
      return res.json({ success: true, message: 'Logged out successfully' });
    });
  } else {
    return res.json({ success: true, message: 'Logged out successfully' });
  }
});

/**
 * GET /api/admin/check
 * Returns current admin session status
 */
router.get('/check', (req, res) => {
  const isAdmin = Boolean(req.session && req.session.isAdmin === true);
  return res.json({ isAdmin });
});

// ==========================================
// Protected Admin Endpoints
// ==========================================
router.use(requireAdmin);

/**
 * POST /api/admin/upload
 * Multer upload for up to 10 files (field name 'files').
 * Body: title, description, category_id
 * Creates 400px wide thumbnails for images using sharp.
 * Videos saved directly without thumbnails.
 */
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided for upload' });
    }

    const { title, description, category_id, side } = req.body;
    const uploadedItems = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const ext = path.extname(file.originalname).toLowerCase();
      const mime = file.mimetype || '';

      const isVideo = mime.startsWith('video/') || ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'].includes(ext);
      const fileType = isVideo ? 'video' : 'image';

      const filePath = `/uploads/originals/${file.filename}`;
      let thumbnailPath = null;

      if (fileType === 'image') {
        const thumbFilename = `thumb-${file.filename}`;
        const thumbDiskPath = path.join(thumbnailsDir, thumbFilename);

        try {
          await sharp(file.path)
            .rotate()
            .resize({ width: 400, withoutEnlargement: true })
            .toFile(thumbDiskPath);

          thumbnailPath = `/uploads/thumbnails/${thumbFilename}`;
        } catch (sharpErr) {
          console.error(`Thumbnail generation error for ${file.filename}:`, sharpErr.message);
          // Fallback to original file path if sharp thumbnail fails (e.g. svg or vector)
          thumbnailPath = filePath;
        }
      }

      // Format title: use provided title (with suffix if multiple), or base name of original file
      let itemTitle = title ? title.trim() : path.parse(file.originalname).name;
      if (title && req.files.length > 1) {
        itemTitle = `${title.trim()} (${i + 1})`;
      }

      const item = addItem({
        title: itemTitle,
        description: description || '',
        category_id: category_id ? Number(category_id) : null,
        file_path: filePath,
        thumbnail_path: thumbnailPath,
        file_type: fileType,
        mime_type: file.mimetype,
        side: side || 'BOTH'
      });

      uploadedItems.push(item);
    }

    return res.status(201).json({
      success: true,
      message: `Uploaded ${uploadedItems.length} item(s)`,
      items: uploadedItems
    });
  } catch (err) {
    console.error('Upload processing error:', err);
    return res.status(500).json({ error: 'Failed to process file upload', details: err.message });
  }
});

/**
 * PUT /api/admin/items/:id
 * Update title, description, category_id, side
 */
router.put('/items/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { title, description, category_id, side } = req.body;

    if (title !== undefined && (!title || !title.trim())) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    const updated = updateItem(id, { title, description, category_id, side });
    if (!updated) {
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.json({ success: true, item: updated });
  } catch (err) {
    console.error('Error updating item:', err);
    return res.status(500).json({ error: 'Failed to update item' });
  }
});

/**
 * DELETE /api/admin/items/:id
 * Delete from DB and delete files from disk
 */
router.delete('/items/:id', (req, res) => {
  try {
    const id = req.params.id;
    const deletedItem = deleteItem(id);

    if (!deletedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Helper to safely remove file from disk
    const removeDiskFile = (webPath) => {
      if (!webPath) return;
      // Strip leading '/' or '/uploads/' to resolve path within project
      const relative = webPath.startsWith('/') ? webPath.slice(1) : webPath;
      const fullPath = path.join(__dirname, '..', relative);

      try {
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (fileErr) {
        console.error(`Failed to remove file at ${fullPath}:`, fileErr.message);
      }
    };

    removeDiskFile(deletedItem.file_path);
    if (deletedItem.thumbnail_path && deletedItem.thumbnail_path !== deletedItem.file_path) {
      removeDiskFile(deletedItem.thumbnail_path);
    }

    return res.json({
      success: true,
      message: 'Item and associated files deleted successfully',
      item: deletedItem
    });
  } catch (err) {
    console.error('Error deleting item:', err);
    return res.status(500).json({ error: 'Failed to delete item' });
  }
});

/**
 * PUT /api/admin/reorder
 * Body: { orderedIds: [1, 3, 2, ...] }
 * Updates sort_order for items
 */
router.put('/reorder', (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array of item IDs' });
    }

    reorderItems(orderedIds);
    return res.json({ success: true, message: 'Items reordered successfully' });
  } catch (err) {
    console.error('Error reordering items:', err);
    return res.status(500).json({ error: 'Failed to reorder items', details: err.message });
  }
});

/**
 * POST /api/admin/categories
 * Add new category
 */
router.post('/categories', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = addCategory(name);
    return res.status(201).json({ success: true, category });
  } catch (err) {
    console.error('Error adding category:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }
    return res.status(500).json({ error: 'Failed to add category', details: err.message });
  }
});

/**
 * PUT /api/admin/categories/:id
 * Rename category
 */
router.put('/categories/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = updateCategory(id, name);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.json({ success: true, category });
  } catch (err) {
    console.error('Error updating category:', err);
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A category with this name already exists' });
    }
    return res.status(500).json({ error: 'Failed to update category', details: err.message });
  }
});

/**
 * DELETE /api/admin/categories/:id
 * Delete category (sets items in that category to null category)
 */
router.delete('/categories/:id', (req, res) => {
  try {
    const id = req.params.id;
    const success = deleteCategory(id);

    if (!success) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.json({ success: true, message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    return res.status(500).json({ error: 'Failed to delete category' });
  }
});

/**
 * PUT /api/admin/reorder-categories
 * Body: { orderedIds: [1, 2, 3, ...] }
 * Updates sort_order for categories
 */
router.put('/reorder-categories', (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'orderedIds must be an array of category IDs' });
    }

    reorderCategories(orderedIds);
    return res.json({ success: true, message: 'Categories reordered successfully' });
  } catch (err) {
    console.error('Error reordering categories:', err);
    return res.status(500).json({ error: 'Failed to reorder categories', details: err.message });
  }
});

module.exports = router;
