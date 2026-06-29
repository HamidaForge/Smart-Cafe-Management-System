const router = require('express').Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

router.post('/', async (req, res) => {
  try {
    const { table_id, table_number, call_type } = req.body;
    const [result] = await db.query(
      'INSERT INTO waiter_calls (table_id,table_number,call_type,status) VALUES (?,?,?,?)',
      [table_id||null, table_number||'?', call_type||'waiter', 'pending']
    );
    const [newCall] = await db.query('SELECT * FROM waiter_calls WHERE id=?', [result.insertId]);
    if (req.io) {
      req.io.to('waiter_dashboard').emit('waiter_call', newCall[0]);
      req.io.to('admin').emit('waiter_call', newCall[0]);
    }
    res.status(201).json({ message: 'Call sent', call: newCall[0] });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM waiter_calls WHERE status IN ('pending','acknowledged') ORDER BY created_at DESC LIMIT 50");
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id/acknowledge', auth, async (req, res) => {
  try {
    await db.query("UPDATE waiter_calls SET status='acknowledged',acknowledged_by=?,acknowledged_at=datetime('now') WHERE id=?",
      [req.user.id, req.params.id]);
    if (req.io) req.io.emit('call_acknowledged', { call_id: parseInt(req.params.id), waiter: req.user.name });
    res.json({ message: 'Acknowledged' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.put('/:id/resolve', auth, async (req, res) => {
  try {
    await db.query("UPDATE waiter_calls SET status='resolved',resolved_at=datetime('now') WHERE id=?", [req.params.id]);
    if (req.io) req.io.emit('call_resolved', { call_id: parseInt(req.params.id) });
    res.json({ message: 'Resolved' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
