// ===== TABLES =====
const router = require('express').Router();
const db = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM cafe_tables ORDER BY floor, table_number');
  res.json(rows);
});
router.put('/:id', auth, authorize('admin','manager','waiter'), async (req, res) => {
  const { status } = req.body;
  await db.query('UPDATE cafe_tables SET status=? WHERE id=?', [status, req.params.id]);
  req.io.emit('table_updated', { id: req.params.id, status });
  res.json({ message: 'Table updated' });
});
router.post('/', auth, authorize('admin','manager'), async (req, res) => {
  const { table_number, capacity, floor } = req.body;
  const [r] = await db.query('INSERT INTO cafe_tables (table_number, capacity, floor) VALUES (?,?,?)', [table_number, capacity, floor || 'Ground']);
  res.status(201).json({ message: 'Table added', id: r.insertId });
});

module.exports = router;
