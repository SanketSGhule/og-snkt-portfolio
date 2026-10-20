const express = require('express');
const router = express.Router();
const {
  getAllItems,
  getItemById,
  getAllCategories
} = require('../db/database');

/**
 * GET /api/items
 * Optional query parameter: ?category=id
 * Returns all items joined with category information, ordered by sort_order ASC
 */
router.get('/items', (req, res) => {
  try {
    const categoryId = req.query.category || null;
    const side = req.query.side || null;
    const items = getAllItems(categoryId, side);
    return res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    return res.status(500).json({ error: 'Failed to retrieve portfolio items' });
  }
});

/**
 * GET /api/items/:id
 * Returns a single item with category information
 */
router.get('/items/:id', (req, res) => {
  try {
    const id = req.params.id;
    const item = getItemById(id);

    if (!item) {
      return res.status(404).json({ error: 'Portfolio item not found' });
    }

    return res.json(item);
  } catch (err) {
    console.error('Error fetching item by id:', err);
    return res.status(500).json({ error: 'Failed to retrieve portfolio item' });
  }
});

/**
 * GET /api/categories
 * Returns all categories ordered by sort_order ASC
 */
router.get('/categories', (req, res) => {
  try {
    const categories = getAllCategories();
    return res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    return res.status(500).json({ error: 'Failed to retrieve categories' });
  }
});

module.exports = router;
