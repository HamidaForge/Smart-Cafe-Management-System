const router = require('express').Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  let sql = `SELECT r.*, t.table_number FROM reservations r LEFT JOIN cafe_tables t ON r.table_id=t.id WHERE 1=1`;
  const params = [];
  if (req.query.date) { sql += ' AND r.date=?'; params.push(req.query.date); }
  if (req.query.status) { sql += ' AND r.status=?'; params.push(req.query.status); }
  sql += ' ORDER BY r.date, r.time';
  const [rows] = await db.query(sql, params);
  res.json(rows);
});
router.post('/', async (req, res) => {
  const { customer_name, customer_phone, customer_email, table_id, date, time, guests, notes } = req.body;
  const [r] = await db.query(
    'INSERT INTO reservations (customer_name,customer_phone,customer_email,table_id,date,time,guests,notes) VALUES (?,?,?,?,?,?,?,?)',
    [customer_name, customer_phone, customer_email || null, table_id || null, date, time, guests, notes || null]
  );
  res.status(201).json({ message: 'Reservation created', id: r.insertId });
});
router.put('/:id', auth, async (req, res) => {
  const { status, table_id } = req.body;
  await db.query('UPDATE reservations SET status=?,table_id=? WHERE id=?', [status, table_id, req.params.id]);
  if (status === 'confirmed' && table_id)
    await db.query('UPDATE cafe_tables SET status="reserved" WHERE id=?', [table_id]);
  res.json({ message: 'Reservation updated' });
});

module.exports = router;
