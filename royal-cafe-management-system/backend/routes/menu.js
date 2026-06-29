const router = require('express').Router();
const db = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

// GET all categories
router.get('/categories', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM categories WHERE status="active" ORDER BY name');
  res.json(rows);
});

// GET all menu items (with optional category filter)
router.get('/items', async (req, res) => {
  let sql = `SELECT m.*, c.name as category_name FROM menu_items m 
             JOIN categories c ON m.category_id = c.id WHERE 1=1`;
  const params = [];
  if (req.query.category) { sql += ' AND m.category_id=?'; params.push(req.query.category); }
  if (req.query.available === 'true') { sql += ' AND m.is_available=1'; }
  if (req.query.veg === 'true') { sql += ' AND m.is_veg=1'; }
  sql += ' ORDER BY c.name, m.name';
  const [rows] = await db.query(sql, params);
  res.json(rows);
});

// GET single item
router.get('/items/:id', async (req, res) => {
  const [rows] = await db.query(
    'SELECT m.*, c.name as category_name FROM menu_items m JOIN categories c ON m.category_id=c.id WHERE m.id=?',
    [req.params.id]
  );
  if (!rows.length) return res.status(404).json({ message: 'Item not found' });
  res.json(rows[0]);
});

// POST add menu item (admin/manager)
router.post('/items', auth, authorize('admin','manager'), async (req, res) => {
  const { category_id, name, description, price, is_veg, prep_time, image_url } = req.body;
  const [result] = await db.query(
    'INSERT INTO menu_items (category_id, name, description, price, is_veg, prep_time, image_url) VALUES (?,?,?,?,?,?,?)',
    [category_id, name, description, price, is_veg ? 1 : 0, prep_time || 15, image_url || null]
  );
  res.status(201).json({ message: 'Item added', id: result.insertId });
});

// PUT update menu item
router.put('/items/:id', auth, authorize('admin','manager'), async (req, res) => {
  const { category_id, name, description, price, is_veg, is_available, prep_time, image_url } = req.body;
  await db.query(
    'UPDATE menu_items SET category_id=?,name=?,description=?,price=?,is_veg=?,is_available=?,prep_time=?,image_url=? WHERE id=?',
    [category_id, name, description, price, is_veg ? 1 : 0, is_available ? 1 : 0, prep_time, image_url, req.params.id]
  );
  res.json({ message: 'Item updated' });
});

// DELETE menu item
router.delete('/items/:id', auth, authorize('admin','manager'), async (req, res) => {
  await db.query('UPDATE menu_items SET is_available=0 WHERE id=?', [req.params.id]);
  res.json({ message: 'Item removed from menu' });
});

// POST add category
router.post('/categories', auth, authorize('admin','manager'), async (req, res) => {
  const { name, description } = req.body;
  const [result] = await db.query('INSERT INTO categories (name, description) VALUES (?,?)', [name, description]);
  res.status(201).json({ message: 'Category added', id: result.insertId });
});

module.exports = router;
