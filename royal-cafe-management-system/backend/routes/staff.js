const router = require('express').Router();
const db = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

router.get('/', auth, authorize('admin','manager'), async (req, res) => {
  const [rows] = await db.query("SELECT id,name,email,role,phone,status,created_at FROM users WHERE role != 'customer' ORDER BY name");
  res.json(rows);
});

router.post('/attendance', auth, async (req, res) => {
  const { user_id, date, check_in, check_out, status } = req.body;
  try {
    await db.query('INSERT INTO attendance (user_id,date,check_in,check_out,status) VALUES (?,?,?,?,?)',
      [user_id, date, check_in, check_out || null, status || 'present']);
  } catch(e) {
    await db.query('UPDATE attendance SET check_out=?,status=? WHERE user_id=? AND date=?',
      [check_out || null, status || 'present', user_id, date]);
  }
  res.json({ message: 'Attendance recorded' });
});

router.get('/attendance', auth, async (req, res) => {
  const { date } = req.query;
  const [rows] = await db.query(
    `SELECT a.*, u.name, u.role FROM attendance a JOIN users u ON a.user_id=u.id WHERE a.date=? ORDER BY u.name`,
    [date || new Date().toISOString().split('T')[0]]
  );
  res.json(rows);
});

module.exports = router;
