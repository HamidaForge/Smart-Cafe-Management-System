const router = require('express').Router();
const db = require('../config/db');
const { auth, authorize } = require('../middleware/auth');

router.get('/summary', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const [todayOrders] = await db.query("SELECT COUNT(*) as count, COALESCE(SUM(total),0) as revenue FROM orders WHERE date(created_at)=? AND status='completed'", [today]);
  const [pendingOrders] = await db.query("SELECT COUNT(*) as count FROM orders WHERE status IN ('pending','confirmed','preparing','ready')");
  const [totalItems] = await db.query('SELECT COUNT(*) as count FROM menu_items WHERE is_available=1');
  const [lowStock] = await db.query('SELECT COUNT(*) as count FROM inventory WHERE quantity <= min_quantity');
  const [tables] = await db.query("SELECT COUNT(*) as total, SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) as occupied, SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) as available FROM cafe_tables");
  const [monthRevenue] = await db.query("SELECT COALESCE(SUM(total),0) as revenue FROM orders WHERE strftime('%Y-%m',created_at)=strftime('%Y-%m','now') AND status='completed'");
  res.json({ today_orders: todayOrders[0].count, today_revenue: todayOrders[0].revenue, pending_orders: pendingOrders[0].count, total_menu_items: totalItems[0].count, low_stock_count: lowStock[0].count, tables_total: tables[0].total, tables_occupied: tables[0].occupied || 0, tables_available: tables[0].available || 0, month_revenue: monthRevenue[0].revenue });
});

router.get('/revenue', auth, async (req, res) => {
  const [rows] = await db.query("SELECT date(created_at) as date, COUNT(*) as orders, SUM(total) as revenue FROM orders WHERE status='completed' AND created_at >= date('now','-30 days') GROUP BY date(created_at) ORDER BY date");
  res.json(rows);
});

router.get('/top-items', auth, async (req, res) => {
  const [rows] = await db.query("SELECT m.name, SUM(oi.quantity) as total_qty, SUM(oi.total_price) as total_revenue FROM order_items oi JOIN menu_items m ON oi.menu_item_id=m.id JOIN orders o ON oi.order_id=o.id WHERE o.status='completed' GROUP BY m.id ORDER BY total_qty DESC LIMIT 10");
  res.json(rows);
});

router.get('/category-revenue', auth, async (req, res) => {
  const [rows] = await db.query("SELECT c.name as category, SUM(oi.total_price) as revenue FROM order_items oi JOIN menu_items m ON oi.menu_item_id=m.id JOIN categories c ON m.category_id=c.id JOIN orders o ON oi.order_id=o.id WHERE o.status='completed' GROUP BY c.id ORDER BY revenue DESC");
  res.json(rows);
});

router.get('/ratings', auth, async (req, res) => {
  const [rows] = await db.query('SELECT AVG(food_rating) as food, AVG(service_rating) as service, AVG(ambiance_rating) as ambiance, COUNT(*) as total FROM feedback');
  res.json(rows[0]);
});

module.exports = router;
