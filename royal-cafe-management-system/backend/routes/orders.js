const router = require('express').Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const genOrderNo = () => 'RC' + Date.now().toString().slice(-8);

router.get('/', auth, async (req, res) => {
  let sql = `SELECT o.*, t.table_number, u.name as customer_name, w.name as waiter_name
             FROM orders o
             LEFT JOIN cafe_tables t ON o.table_id=t.id
             LEFT JOIN users u ON o.customer_id=u.id
             LEFT JOIN users w ON o.waiter_id=w.id
             WHERE 1=1`;
  const params = [];
  if (req.query.status) { sql += ' AND o.status=?'; params.push(req.query.status); }
  if (req.query.table_id) { sql += ' AND o.table_id=?'; params.push(req.query.table_id); }
  if (req.query.date) { sql += ' AND date(o.created_at)=?'; params.push(req.query.date); }
  sql += ' ORDER BY o.created_at DESC';
  if (req.query.limit) { sql += ' LIMIT ?'; params.push(parseInt(req.query.limit)); }
  const [rows] = await db.query(sql, params);
  res.json(rows);
});

router.get('/:id', auth, async (req, res) => {
  const [orders] = await db.query(
    `SELECT o.*, t.table_number, u.name as customer_name, w.name as waiter_name
     FROM orders o
     LEFT JOIN cafe_tables t ON o.table_id=t.id
     LEFT JOIN users u ON o.customer_id=u.id
     LEFT JOIN users w ON o.waiter_id=w.id
     WHERE o.id=?`, [req.params.id]
  );
  if (!orders.length) return res.status(404).json({ message: 'Order not found' });
  const [items] = await db.query(
    `SELECT oi.*, m.name as item_name, m.image_url FROM order_items oi
     JOIN menu_items m ON oi.menu_item_id=m.id WHERE oi.order_id=?`, [req.params.id]
  );
  res.json({ ...orders[0], items });
});

router.post('/', auth, async (req, res) => {
  try {
    const { table_id, items, order_type, notes, customer_id } = req.body;
    let subtotal = 0;
    const itemDetails = [];
    for (const item of items) {
      const [mi] = await db.query('SELECT price FROM menu_items WHERE id=?', [item.menu_item_id]);
      if (!mi.length) continue;
      subtotal += mi[0].price * item.quantity;
      itemDetails.push({ ...item, price: mi[0].price });
    }
    const tax = parseFloat((subtotal * 0.05).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));

    const [orderResult] = await db.query(
      `INSERT INTO orders (order_number,table_id,customer_id,waiter_id,order_type,subtotal,tax,total,notes,status)
       VALUES (?,?,?,?,?,?,?,?,?,'pending')`,
      [genOrderNo(), table_id || null, customer_id || null, req.user.id, order_type || 'dine_in', subtotal, tax, total, notes || null]
    );
    const orderId = orderResult.insertId;

    for (const item of itemDetails) {
      await db.query(
        'INSERT INTO order_items (order_id,menu_item_id,quantity,unit_price,total_price,notes) VALUES (?,?,?,?,?,?)',
        [orderId, item.menu_item_id, item.quantity, item.price, item.price * item.quantity, item.notes || null]
      );
    }

    if (table_id) await db.query("UPDATE cafe_tables SET status='occupied' WHERE id=?", [table_id]);

    const [newOrder] = await db.query('SELECT * FROM orders WHERE id=?', [orderId]);
    if (req.io) {
      req.io.to('kitchen').emit('new_order_received', newOrder[0]);
      req.io.to('admin').emit('new_order_received', newOrder[0]);
    }
    res.status(201).json({ message: 'Order placed', order_id: orderId, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  await db.query('UPDATE orders SET status=? WHERE id=?', [status, req.params.id]);
  if (status === 'completed' || status === 'cancelled') {
    const [order] = await db.query('SELECT table_id FROM orders WHERE id=?', [req.params.id]);
    if (order[0]?.table_id) await db.query("UPDATE cafe_tables SET status='available' WHERE id=?", [order[0].table_id]);
  }
  if (req.io) req.io.emit('order_status_changed', { order_id: req.params.id, status });
  res.json({ message: 'Order status updated' });
});

router.put('/items/:id/status', auth, async (req, res) => {
  await db.query('UPDATE order_items SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({ message: 'Item status updated' });
});

module.exports = router;
