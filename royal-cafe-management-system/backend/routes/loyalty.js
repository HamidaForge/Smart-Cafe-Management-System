const router = require('express').Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const TIERS = [
  { name:'Silver',   min:0,    cashback:0.02, discount:0    },
  { name:'Gold',     min:500,  cashback:0.05, discount:0.05 },
  { name:'Platinum', min:2000, cashback:0.10, discount:0.10 },
];
function getTier(points) { return [...TIERS].reverse().find(t => points >= t.min) || TIERS[0]; }

router.get('/profile', auth, async (req, res) => {
  try {
    let [rows] = await db.query('SELECT * FROM loyalty_accounts WHERE user_id=?', [req.user.id]);
    if (!rows.length) {
      await db.query('INSERT INTO loyalty_accounts (user_id) VALUES (?)', [req.user.id]);
      [rows] = await db.query('SELECT * FROM loyalty_accounts WHERE user_id=?', [req.user.id]);
    }
    res.json({ account: rows[0], tier: getTier(rows[0].total_points||0), tiers: TIERS });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post('/earn', auth, async (req, res) => {
  try {
    const { order_id, amount_paid } = req.body;
    const pts = Math.floor(amount_paid / 10);
    let [acc] = await db.query('SELECT * FROM loyalty_accounts WHERE user_id=?', [req.user.id]);
    if (!acc.length) await db.query('INSERT INTO loyalty_accounts (user_id) VALUES (?)', [req.user.id]);
    await db.query('UPDATE loyalty_accounts SET total_points=total_points+?,available_points=available_points+?,total_spent=total_spent+? WHERE user_id=?',
      [pts, pts, amount_paid, req.user.id]);
    await db.query('INSERT INTO loyalty_transactions (user_id,order_id,type,points,description) VALUES (?,?,?,?,?)',
      [req.user.id, order_id, 'earn', pts, 'Earned from order ₹'+amount_paid]);
    const [updated] = await db.query('SELECT * FROM loyalty_accounts WHERE user_id=?', [req.user.id]);
    res.json({ points_earned: pts, account: updated[0], tier: getTier(updated[0].total_points) });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post('/redeem', auth, async (req, res) => {
  try {
    const { points, order_id } = req.body;
    const [acc] = await db.query('SELECT * FROM loyalty_accounts WHERE user_id=?', [req.user.id]);
    if (!acc.length || acc[0].available_points < points) return res.status(400).json({ message: 'Insufficient points' });
    const discount = points * 0.5;
    await db.query('UPDATE loyalty_accounts SET available_points=available_points-?,redeemed_points=redeemed_points+? WHERE user_id=?',
      [points, points, req.user.id]);
    await db.query('INSERT INTO loyalty_transactions (user_id,order_id,type,points,description) VALUES (?,?,?,?,?)',
      [req.user.id, order_id||null, 'redeem', -points, 'Redeemed '+points+' pts = ₹'+discount+' discount']);
    res.json({ discount_amount: discount, points_used: points });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.get('/history', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM loyalty_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.get('/coupons', auth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC');
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post('/coupons', auth, async (req, res) => {
  try {
    const { code, type, value, min_order, max_uses, expires_at, description } = req.body;
    await db.query('INSERT INTO coupons (code,type,value,min_order,max_uses,expires_at,description) VALUES (?,?,?,?,?,?,?)',
      [code.toUpperCase(), type, value, min_order||0, max_uses||100, expires_at||null, description||'']);
    res.status(201).json({ message: 'Coupon created' });
  } catch(e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ message: 'Code already exists' });
    res.status(500).json({ message: e.message });
  }
});

router.post('/coupons/validate', auth, async (req, res) => {
  try {
    const { code, order_total } = req.body;
    const [rows] = await db.query(
      "SELECT * FROM coupons WHERE code=? AND is_active=1 AND (expires_at IS NULL OR expires_at > datetime('now')) AND used_count < max_uses",
      [code.toUpperCase()]
    );
    if (!rows.length) return res.status(400).json({ message: 'Invalid or expired coupon' });
    const c = rows[0];
    if (order_total < c.min_order) return res.status(400).json({ message: 'Minimum order ₹'+c.min_order+' required' });
    const discount = c.type === 'percent' ? Math.min((order_total * c.value)/100, c.max_discount||Infinity) : c.value;
    res.json({ valid: true, coupon: c, discount: parseFloat(discount.toFixed(2)) });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.post('/coupons/use', auth, async (req, res) => {
  try {
    await db.query('UPDATE coupons SET used_count=used_count+1 WHERE code=?', [req.body.code.toUpperCase()]);
    res.json({ message: 'Coupon applied' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

router.get('/coupons/available', auth, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM coupons WHERE is_active=1 AND (expires_at IS NULL OR expires_at > datetime('now')) AND used_count < max_uses ORDER BY value DESC"
    );
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
