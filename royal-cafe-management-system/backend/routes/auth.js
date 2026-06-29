const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE email = ? AND status = "active"', [email]);
    if (!rows.length) return res.status(400).json({ message: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'royalcafe_secret_2024',
      { expiresIn: '12h' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?,?,?,?,?)',
      [name, email, hashed, phone || null, role || 'customer']
    );
    res.status(201).json({ message: 'User created', id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(400).json({ message: 'Email already exists' });
    res.status(500).json({ message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const [rows] = await db.query('SELECT id,name,email,role,phone,created_at FROM users WHERE id=?', [req.user.id]);
  res.json(rows[0]);
});

// GET /api/auth/users (admin only - get all staff)
router.get('/users', auth, async (req, res) => {
  const [rows] = await db.query('SELECT id,name,email,role,phone,status,created_at FROM users ORDER BY created_at DESC');
  res.json(rows);
});

// PUT /api/auth/users/:id
router.put('/users/:id', auth, async (req, res) => {
  const { name, phone, status, role } = req.body;
  await db.query('UPDATE users SET name=?,phone=?,status=?,role=? WHERE id=?',
    [name, phone, status, role, req.params.id]);
  res.json({ message: 'User updated' });
});

module.exports = router;
