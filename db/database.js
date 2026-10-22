const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

// Database file path
const dbDir = process.env.VERCEL ? '/tmp' : __dirname;
const dbPath = path.join(dbDir, 'portfolio.db');

let db = null;

/**
 * Save the database to disk
 */
function saveDb() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (e) {
      console.warn('Could not persist database to disk:', e.message);
    }
  }
}

/**
 * Initialize the database (must be called before using any other function)
 * Returns a promise that resolves when ready
 */
async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else if (fs.existsSync(path.join(__dirname, 'portfolio.db'))) {
    const fileBuffer = fs.readFileSync(path.join(__dirname, 'portfolio.db'));
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Initialize schema
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      sort_order INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      category_id INTEGER,
      file_path TEXT NOT NULL,
      thumbnail_path TEXT,
      file_type TEXT NOT NULL,
      mime_type TEXT,
      side TEXT DEFAULT 'BOTH',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )
  `);

  // Migrate existing tables if 'side' column does not exist yet
  try {
    db.run("ALTER TABLE items ADD COLUMN side TEXT DEFAULT 'BOTH'");
  } catch (e) {
    // Column already exists or table newly created
  }

  // Seed default categories if table is empty
  const result = db.exec('SELECT COUNT(*) as count FROM categories');
  const count = result[0].values[0][0];

  if (count === 0) {
    const defaultCategories = [
      'Video Edits',
      'Poster Edits',
      'Image Edits',
      'Motion Graphics',
      'T-Shirt Designs',
      'Others'
    ];
    const stmt = db.prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
    defaultCategories.forEach((name, index) => {
      stmt.run([name, index]);
    });
    stmt.free();
    saveDb();
  }

  // Auto-save periodically (every 5 seconds if changes pending)
  setInterval(() => saveDb(), 5000);

  return db;
}

/**
 * Helper: run a SELECT query and return rows as objects
 */
function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

/**
 * Helper: run a SELECT query and return first row as object
 */
function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Helper: run an INSERT/UPDATE/DELETE and save
 */
function runAndSave(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

// ============================================================
// Category Functions
// ============================================================

function getAllCategories() {
  return queryAll('SELECT * FROM categories ORDER BY sort_order ASC, id ASC');
}

function addCategory(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    throw new Error('Category name cannot be empty');
  }

  const maxRow = queryOne('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM categories');
  const nextOrder = maxRow.max_order + 1;

  db.run('INSERT INTO categories (name, sort_order) VALUES (?, ?)', [trimmed, nextOrder]);
  
  // Get the last inserted row
  const lastId = queryOne('SELECT last_insert_rowid() as id');
  saveDb();
  return queryOne('SELECT * FROM categories WHERE id = ?', [lastId.id]);
}

function updateCategory(id, name) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    throw new Error('Category name cannot be empty');
  }

  db.run('UPDATE categories SET name = ? WHERE id = ?', [trimmed, id]);
  saveDb();
  return queryOne('SELECT * FROM categories WHERE id = ?', [id]);
}

function deleteCategory(id) {
  // Set category_id to null for items referencing this category
  db.run('UPDATE items SET category_id = NULL WHERE category_id = ?', [id]);
  db.run('DELETE FROM categories WHERE id = ?', [id]);
  saveDb();
  return true;
}

// ============================================================
// Item Functions
// ============================================================

function getAllItems(categoryId = null, side = null) {
  let query = `
    SELECT 
      items.*,
      categories.name AS category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
  `;
  const conditions = [];
  const params = [];

  if (categoryId !== null && categoryId !== undefined && categoryId !== '' && categoryId !== 'all') {
    conditions.push('items.category_id = ?');
    params.push(categoryId);
  }

  if (side && ['A', 'B'].includes(side.toString().toUpperCase())) {
    const s = side.toString().toUpperCase();
    conditions.push("(items.side = ? OR items.side = 'BOTH' OR items.side IS NULL)");
    params.push(s);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY items.sort_order ASC, items.id ASC';
  return queryAll(query, params);
}

function getItemById(id) {
  const query = `
    SELECT 
      items.*,
      categories.name AS category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
    WHERE items.id = ?
  `;
  return queryOne(query, [id]);
}

function addItem({ title, description, category_id, file_path, thumbnail_path, file_type, mime_type, side = 'BOTH' }) {
  if (!title) {
    throw new Error('Item title is required');
  }
  if (!file_path) {
    throw new Error('Item file_path is required');
  }
  if (!file_type || !['image', 'video'].includes(file_type)) {
    throw new Error('Valid file_type (image or video) is required');
  }

  const validSide = ['A', 'B', 'BOTH'].includes((side || '').toString().toUpperCase()) 
    ? side.toString().toUpperCase() 
    : 'BOTH';

  const maxRow = queryOne('SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM items');
  const nextOrder = maxRow.max_order + 1;

  db.run(`
    INSERT INTO items (
      title, description, category_id, file_path, thumbnail_path, file_type, mime_type, side, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    title.trim(),
    description ? description.toString().trim() : null,
    category_id ? Number(category_id) : null,
    file_path,
    thumbnail_path || null,
    file_type,
    mime_type || null,
    validSide,
    nextOrder
  ]);

  const lastId = queryOne('SELECT last_insert_rowid() as id');
  saveDb();
  return getItemById(lastId.id);
}

function updateItem(id, { title, description, category_id, side, thumbnail_path }) {
  const existing = getItemById(id);
  if (!existing) {
    return null;
  }

  const updatedTitle = title !== undefined ? title.toString().trim() : existing.title;
  const updatedDesc = description !== undefined ? (description ? description.toString().trim() : null) : existing.description;
  const updatedCatId = category_id !== undefined ? (category_id ? Number(category_id) : null) : existing.category_id;
  const updatedSide = side !== undefined 
    ? (['A', 'B', 'BOTH'].includes((side || '').toString().toUpperCase()) ? side.toString().toUpperCase() : (existing.side || 'BOTH'))
    : (existing.side || 'BOTH');
  const updatedThumb = thumbnail_path !== undefined ? (thumbnail_path ? thumbnail_path.toString().trim() : null) : existing.thumbnail_path;

  db.run(`
    UPDATE items
    SET title = ?, description = ?, category_id = ?, side = ?, thumbnail_path = ?
    WHERE id = ?
  `, [updatedTitle, updatedDesc, updatedCatId, updatedSide, updatedThumb, id]);

  saveDb();
  return getItemById(id);
}

function deleteItem(id) {
  const item = getItemById(id);
  if (!item) {
    return null;
  }

  db.run('DELETE FROM items WHERE id = ?', [id]);
  saveDb();
  return item;
}

function reorderItems(orderedIds) {
  if (!Array.isArray(orderedIds)) {
    throw new Error('orderedIds must be an array of IDs');
  }

  orderedIds.forEach((id, index) => {
    db.run('UPDATE items SET sort_order = ? WHERE id = ?', [index, id]);
  });
  saveDb();
  return true;
}

function reorderCategories(orderedIds) {
  if (!Array.isArray(orderedIds)) {
    throw new Error('orderedIds must be an array of IDs');
  }

  orderedIds.forEach((id, index) => {
    db.run('UPDATE categories SET sort_order = ? WHERE id = ?', [index, id]);
  });
  saveDb();
  return true;
}

module.exports = {
  initDatabase,
  getAllCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getAllItems,
  getItemById,
  addItem,
  updateItem,
  deleteItem,
  reorderItems,
  reorderCategories
};
