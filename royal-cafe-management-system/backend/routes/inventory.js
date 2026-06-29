const router = require('express').Router();
const db = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM inventory ORDER BY item_name');
  res.json(rows);
});
router.get('/low-stock', auth, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM inventory WHERE quantity <= min_quantity ORDER BY quantity ASC');
  res.json(rows);
});
router.post('/', auth, authorize('admin','manager'), async (req, res) => {
  const { item_name, category, quantity, unit, min_quantity, cost_per_unit, supplier } = req.body;
  const [r] = await db.query(
    'INSERT INTO inventory (item_name, category, quantity, unit, min_quantity, cost_per_unit, supplier) VALUES (?,?,?,?,?,?,?)',
    [item_name, category, quantity, unit, min_quantity || 10, cost_per_unit || 0, supplier || null]
  );
  res.status(201).json({ message: 'Inventory item added', id: r.insertId });
});
router.put('/:id', auth, authorize('admin','manager'), async (req, res) => {
  const { quantity, cost_per_unit, supplier, min_quantity } = req.body;
  await db.query('UPDATE inventory SET quantity=?,cost_per_unit=?,supplier=?,min_quantity=? WHERE id=?',
    [quantity, cost_per_unit, supplier, min_quantity, req.params.id]);
  res.json({ message: 'Inventory updated' });
});
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  await db.query('DELETE FROM inventory WHERE id=?', [req.params.id]);
  res.json({ message: 'Item deleted' });
});

module.exports = router;
