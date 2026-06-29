const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Attach io to every request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/loyalty', require('./routes/loyalty'));
app.use('/api/waiter-calls', require('./routes/waiter_calls'));
app.use('/api/chatbot', require('./routes/chatbot'));

// Socket.io — real-time order updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join_room', (room) => socket.join(room));

  // Waiter dashboard room
  socket.on('join_waiter_dashboard', () => {
    socket.join('waiter_dashboard');
    console.log('Waiter dashboard joined:', socket.id);
  });

  socket.on('order_status_update', (data) => {
    io.to('kitchen').emit('order_updated', data);
    io.to('waiter_' + data.waiter_id).emit('order_updated', data);
    io.to('admin').emit('order_updated', data);
  });

  socket.on('new_order', (data) => {
    io.to('kitchen').emit('new_order_received', data);
    io.to('admin').emit('new_order_received', data);
  });

  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});

// QR Order page — served WITHOUT auth (customers scan this)
app.get('/order', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/order.html'));
});

// Fallback — serve frontend index for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Royal Cafe Server running on port ${PORT}`));
