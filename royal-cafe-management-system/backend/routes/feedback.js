// feedback.js
const router = require('express').Router();
const db = require('../config/db');
router.get('/', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM feedback ORDER BY created_at DESC LIMIT 50');
  res.json(rows);
});
router.post('/', async (req, res) => {
  const { customer_name, customer_email, order_id, food_rating, service_rating, ambiance_rating, comment } = req.body;
  await db.query(
    'INSERT INTO feedback (customer_name,customer_email,order_id,food_rating,service_rating,ambiance_rating,comment) VALUES (?,?,?,?,?,?,?)',
    [customer_name, customer_email || null, order_id || null, food_rating, service_rating, ambiance_rating, comment || null]
  );
  res.status(201).json({ message: 'Feedback submitted, thank you!' });
});
module.exports = router;
