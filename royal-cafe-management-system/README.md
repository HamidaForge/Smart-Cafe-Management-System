# ☕ Royal Cafe Management System
### Full Stack Web Technology Project — 3rd Year

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js + Express.js |
| Database | MySQL |
| Auth | JWT (JSON Web Tokens) |
| Real-time | Socket.io |
| Payment | Razorpay Integration |
| Charts | Chart.js |
| Invoice | Browser Print API (PDF) |

---

## 📁 Project Structure

```
royal-cafe/
├── frontend/
│   ├── index.html          ← Complete SPA (all pages)
│   ├── css/
│   │   └── style.css       ← Dark gold luxury theme
│   └── js/
│       └── app.js          ← All frontend logic
├── backend/
│   ├── server.js           ← Express + Socket.io server
│   ├── .env.example        ← Environment variables template
│   ├── package.json
│   ├── config/
│   │   └── db.js           ← MySQL connection pool
│   ├── middleware/
│   │   └── auth.js         ← JWT middleware
│   └── routes/
│       ├── auth.js         ← Login, register, users
│       ├── menu.js         ← Menu items & categories
│       ├── orders.js       ← Order management
│       ├── tables.js       ← Table status
│       ├── payments.js     ← Razorpay + manual payment
│       ├── inventory.js    ← Stock management
│       ├── reservations.js ← Table bookings
│       ├── feedback.js     ← Customer ratings
│       ├── staff.js        ← Staff & attendance
│       └── reports.js      ← Analytics & charts
└── database/
    └── cafe_schema.sql     ← Full DB schema + seed data
```

---

## ⚙️ Setup Instructions

### Step 1 — Install MySQL
Make sure MySQL is running on your computer.
Download from: https://dev.mysql.com/downloads/installer/

### Step 2 — Create Database
Open MySQL Workbench or MySQL CLI and run:
```sql
source /path/to/royal-cafe/database/cafe_schema.sql
```
This creates all tables and inserts demo data automatically.

### Step 3 — Setup Backend
```bash
cd royal-cafe/backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your MySQL password
# DB_PASS=your_password_here
```

### Step 4 — Start the Server
```bash
# Development (auto-restart on changes)
npm run dev

# OR Production
npm start
```
Server starts at: **http://localhost:5000**

### Step 5 — Open Frontend
Open your browser and go to:
**http://localhost:5000**

---

## 🔑 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@royalcafe.com | admin123 |
| Manager | manager@royalcafe.com | admin123 |
| Waiter | waiter@royalcafe.com | admin123 |
| Kitchen | kitchen@royalcafe.com | admin123 |

> ⚠️ Change passwords after first login in production!

---

## 🌟 Features

### 1. Dashboard
- Real-time stats (today's orders, revenue, pending orders)
- Revenue chart (last 30 days)
- Category-wise sales pie chart
- Recent orders table
- Low stock alerts

### 2. Order Management
- Create new orders with menu item selection
- Cart with quantity controls
- Auto GST (5%) calculation
- Filter by status / date
- Real-time status updates (Socket.io)
- Flow: Pending → Confirmed → Preparing → Ready → Served → Completed

### 3. Kitchen Display System
- Live order cards for kitchen staff
- Mark items as preparing / ready
- Real-time updates via Socket.io

### 4. Table Management
- Visual table grid by floor
- Status: Available / Occupied / Reserved / Cleaning
- Click to toggle status
- Real-time sync

### 5. Billing & Payments
- Payment methods: Cash, UPI, Card/Online
- Razorpay integration (card/netbanking/UPI)
- Auto-generated printable invoice (opens in new tab)
- Invoice includes: order details, GST breakup, payment info

### 6. Menu Management (Admin/Manager)
- Add/Edit/Remove menu items
- Category management
- Veg/Non-veg toggle
- Availability toggle

### 7. Inventory Management
- Stock tracking with units
- Low stock alerts (highlighted in red)
- Minimum quantity thresholds
- Supplier info

### 8. Reservations
- Book tables with date/time/guests
- Status: Pending → Confirmed → Completed
- Filter by date

### 9. Staff Management
- View all staff by role
- Add new staff members
- Attendance tracking

### 10. Customer Feedback
- Star ratings (Food / Service / Ambiance)
- Comments
- Average rating display
- Reports integration

### 11. Reports & Analytics
- Revenue bar chart
- Top 10 selling items
- Customer satisfaction scores

---

## 💳 Razorpay Setup (Payment Gateway)

1. Go to https://dashboard.razorpay.com
2. Create a free account
3. Go to Settings → API Keys
4. Generate Test Keys
5. Add to your `.env` file:
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
```
6. Add Razorpay script to index.html (before </body>):
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

> For demo/presentation, use **manual payment (Cash/UPI)** — works without Razorpay keys.

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register user |
| GET | /api/auth/me | Current user |
| GET | /api/auth/users | All users (admin) |

### Menu
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/menu/items | All menu items |
| GET | /api/menu/categories | All categories |
| POST | /api/menu/items | Add item |
| PUT | /api/menu/items/:id | Update item |
| DELETE | /api/menu/items/:id | Remove item |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/orders | All orders (with filters) |
| GET | /api/orders/:id | Order with items |
| POST | /api/orders | Create order |
| PUT | /api/orders/:id/status | Update status |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/create-razorpay-order | Init Razorpay |
| POST | /api/payments/verify-razorpay | Verify payment |
| POST | /api/payments/manual | Cash/UPI payment |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/summary | Dashboard stats |
| GET | /api/reports/revenue | Daily revenue |
| GET | /api/reports/top-items | Best sellers |
| GET | /api/reports/ratings | Avg feedback |

---

## 🎓 Project Modules (for Viva)

Be ready to explain:
1. **JWT Authentication** — stateless auth, token expiry, role-based access
2. **Socket.io** — real-time bidirectional events, rooms (kitchen, admin, waiter)
3. **Razorpay** — payment order creation, webhook signature verification
4. **MySQL Transactions** — atomic order creation (orders + order_items)
5. **REST API Design** — CRUD operations, status codes, middleware chain
6. **Role-Based Access Control** — admin > manager > waiter > kitchen > customer

---

## 📝 .gitignore

```
node_modules/
.env
uploads/
*.log
```

---

*Built with ❤️ — Royal Cafe Management System*
