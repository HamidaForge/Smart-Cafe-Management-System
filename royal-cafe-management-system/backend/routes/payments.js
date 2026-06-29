const router = require('express').Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

let Razorpay = null;
try { Razorpay = require('razorpay'); } catch(e) {}

const getRazorpay = () => {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!Razorpay || !key || !secret || key === 'rzp_test_YOUR_KEY') return null;
  return new Razorpay({ key_id: key, key_secret: secret });
};

router.post('/create-razorpay-order', auth, async (req, res) => {
  try {
    const { order_id } = req.body;
    const [orders] = await db.query('SELECT total FROM orders WHERE id=?', [order_id]);
    if (!orders.length) return res.status(404).json({ message: 'Order not found' });
    const rzp = getRazorpay();
    if (!rzp) return res.json({ demo_mode: true, key: null, amount: Math.round(orders[0].total * 100), currency: 'INR', razorpay_order_id: 'demo_' + Date.now() });
    const options = { amount: Math.round(orders[0].total * 100), currency: 'INR', receipt: 'rc_order_' + order_id };
    const rzpOrder = await rzp.orders.create(options);
    try {
      await db.query('INSERT INTO payments (order_id,payment_method,amount,razorpay_order_id,status) VALUES (?,?,?,?,?)',
        [order_id, 'online', orders[0].total, rzpOrder.id, 'pending']);
    } catch(e) {
      await db.query('UPDATE payments SET razorpay_order_id=?,amount=? WHERE order_id=?', [rzpOrder.id, orders[0].total, order_id]);
    }
    res.json({ key: process.env.RAZORPAY_KEY_ID, amount: options.amount, currency: 'INR', razorpay_order_id: rzpOrder.id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/verify-razorpay', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;
    const crypto = require('crypto');
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(razorpay_order_id + '|' + razorpay_payment_id).digest('hex');
    if (expectedSig !== razorpay_signature) return res.status(400).json({ message: 'Payment verification failed' });
    await db.query("UPDATE payments SET razorpay_payment_id=?,status='completed',paid_at=datetime('now') WHERE order_id=?", [razorpay_payment_id, order_id]);
    await db.query("UPDATE orders SET status='completed' WHERE id=?", [order_id]);
    const [order] = await db.query('SELECT table_id FROM orders WHERE id=?', [order_id]);
    if (order[0]?.table_id) await db.query("UPDATE cafe_tables SET status='available' WHERE id=?", [order[0].table_id]);
    res.json({ message: 'Payment verified!' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/manual', auth, async (req, res) => {
  try {
    const { order_id, payment_method, transaction_id } = req.body;
    const [orders] = await db.query('SELECT total FROM orders WHERE id=?', [order_id]);
    if (!orders.length) return res.status(404).json({ message: 'Order not found' });
    try {
      await db.query("INSERT INTO payments (order_id,payment_method,amount,transaction_id,status,paid_at) VALUES (?,?,?,?,?,'completed')",
        [order_id, payment_method, orders[0].total, transaction_id || null, 'completed']);
    } catch(e) {
      await db.query("UPDATE payments SET payment_method=?,status='completed',paid_at=datetime('now') WHERE order_id=?", [payment_method, order_id]);
    }
    await db.query("UPDATE orders SET status='completed' WHERE id=?", [order_id]);
    const [order] = await db.query('SELECT table_id FROM orders WHERE id=?', [order_id]);
    if (order[0]?.table_id) await db.query("UPDATE cafe_tables SET status='available' WHERE id=?", [order[0].table_id]);
    res.json({ message: 'Payment recorded!' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/:order_id', auth, async (req, res) => {
  const [rows] = await db.query('SELECT p.*,o.order_number,o.total FROM payments p JOIN orders o ON p.order_id=o.id WHERE p.order_id=?', [req.params.order_id]);
  res.json(rows[0] || null);
});

module.exports = router;
