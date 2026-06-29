-- ============================================
--   ROYAL CAFE MANAGEMENT SYSTEM - DATABASE
-- ============================================

CREATE DATABASE IF NOT EXISTS royal_cafe;
USE royal_cafe;

-- USERS (Admin, Manager, Waiter, Kitchen, Customer)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','manager','waiter','kitchen','customer') DEFAULT 'customer',
  phone VARCHAR(15),
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CATEGORIES
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  image_url VARCHAR(255),
  status ENUM('active','inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MENU ITEMS
CREATE TABLE menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(255),
  is_veg TINYINT(1) DEFAULT 1,
  is_available TINYINT(1) DEFAULT 1,
  prep_time INT DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- TABLES
CREATE TABLE cafe_tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_number VARCHAR(10) UNIQUE NOT NULL,
  capacity INT DEFAULT 4,
  status ENUM('available','occupied','reserved','cleaning') DEFAULT 'available',
  floor VARCHAR(20) DEFAULT 'Ground'
);

-- RESERVATIONS
CREATE TABLE reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(15) NOT NULL,
  customer_email VARCHAR(100),
  table_id INT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  guests INT NOT NULL,
  status ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES cafe_tables(id)
);

-- ORDERS
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(20) UNIQUE NOT NULL,
  table_id INT,
  customer_id INT,
  waiter_id INT,
  order_type ENUM('dine_in','takeaway','delivery') DEFAULT 'dine_in',
  status ENUM('pending','confirmed','preparing','ready','served','completed','cancelled') DEFAULT 'pending',
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (table_id) REFERENCES cafe_tables(id),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (waiter_id) REFERENCES users(id)
);

-- ORDER ITEMS
CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('pending','preparing','ready','served') DEFAULT 'pending',
  notes TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- PAYMENTS
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL UNIQUE,
  payment_method ENUM('cash','upi','card','online') NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_id VARCHAR(100),
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  status ENUM('pending','completed','failed','refunded') DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- INVENTORY
CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_name VARCHAR(150) NOT NULL,
  category VARCHAR(100),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit VARCHAR(20) NOT NULL,
  min_quantity DECIMAL(10,2) DEFAULT 10,
  cost_per_unit DECIMAL(10,2),
  supplier VARCHAR(100),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- FEEDBACK
CREATE TABLE feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(100),
  customer_email VARCHAR(100),
  order_id INT,
  food_rating INT CHECK(food_rating BETWEEN 1 AND 5),
  service_rating INT CHECK(service_rating BETWEEN 1 AND 5),
  ambiance_rating INT CHECK(ambiance_rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- STAFF ATTENDANCE
CREATE TABLE attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  check_in TIME,
  check_out TIME,
  status ENUM('present','absent','late','half_day') DEFAULT 'present',
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- =====================
--   SEED DATA
-- =====================

INSERT INTO users (name, email, password, role, phone) VALUES
('Admin Raja', 'admin@royalcafe.com', '$2b$10$xQz1234hashedpassword', 'admin', '9876543210'),
('Manager Priya', 'manager@royalcafe.com', '$2b$10$xQz1234hashedpassword', 'manager', '9876543211'),
('Waiter Arjun', 'waiter@royalcafe.com', '$2b$10$xQz1234hashedpassword', 'waiter', '9876543212'),
('Chef Kumar', 'kitchen@royalcafe.com', '$2b$10$xQz1234hashedpassword', 'kitchen', '9876543213');

INSERT INTO categories (name, description) VALUES
('Beverages', 'Hot and cold drinks'),
('Starters', 'Appetizers and snacks'),
('Main Course', 'Full meals'),
('Desserts', 'Sweet treats'),
('Sandwiches', 'Fresh sandwiches and wraps');

INSERT INTO menu_items (category_id, name, description, price, is_veg, prep_time) VALUES
(1, 'Royal Coffee', 'Premium arabica blend with a golden touch', 180.00, 1, 5),
(1, 'Masala Chai', 'Spiced Indian tea with cardamom', 80.00, 1, 5),
(1, 'Cold Brew', 'Smooth 24-hour cold brew coffee', 220.00, 1, 2),
(1, 'Mango Smoothie', 'Fresh Alphonso mango blended', 160.00, 1, 5),
(2, 'Paneer Tikka', 'Grilled cottage cheese with spices', 280.00, 1, 15),
(2, 'Chicken Wings', 'Crispy fried wings with sauce', 320.00, 0, 20),
(2, 'Bruschetta', 'Toasted bread with tomato and basil', 180.00, 1, 10),
(3, 'Butter Chicken', 'Creamy tomato gravy with naan', 380.00, 0, 25),
(3, 'Dal Makhani', 'Slow-cooked black lentils', 280.00, 1, 25),
(3, 'Pasta Arrabbiata', 'Spicy tomato pasta', 320.00, 1, 20),
(4, 'Gulab Jamun', 'Soft milk dumplings in syrup', 120.00, 1, 5),
(4, 'Chocolate Lava Cake', 'Warm dark chocolate molten cake', 200.00, 1, 15),
(5, 'Club Sandwich', 'Triple-layered grilled sandwich', 240.00, 0, 12),
(5, 'Veggie Wrap', 'Grilled veggies in tortilla', 200.00, 1, 10);

INSERT INTO cafe_tables (table_number, capacity, floor) VALUES
('T01', 2, 'Ground'), ('T02', 4, 'Ground'), ('T03', 4, 'Ground'),
('T04', 6, 'Ground'), ('T05', 2, 'Ground'), ('T06', 4, 'First'),
('T07', 4, 'First'), ('T08', 8, 'First'), ('T09', 2, 'Terrace'),
('T10', 6, 'Terrace');

INSERT INTO inventory (item_name, category, quantity, unit, min_quantity, cost_per_unit) VALUES
('Coffee Beans', 'Beverages', 50.00, 'kg', 10, 800.00),
('Milk', 'Dairy', 100.00, 'litre', 20, 60.00),
('Chicken', 'Meat', 30.00, 'kg', 5, 280.00),
('Paneer', 'Dairy', 15.00, 'kg', 3, 320.00),
('Tomatoes', 'Vegetables', 20.00, 'kg', 5, 40.00),
('Flour', 'Dry Goods', 25.00, 'kg', 5, 45.00),
('Butter', 'Dairy', 10.00, 'kg', 2, 480.00),
('Sugar', 'Dry Goods', 20.00, 'kg', 5, 50.00);

-- ============================================
-- NEW FEATURES: Loyalty, Coupons, Waiter Calls
-- ============================================

-- LOYALTY ACCOUNTS
CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  total_points INT DEFAULT 0,
  available_points INT DEFAULT 0,
  redeemed_points INT DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- LOYALTY TRANSACTIONS
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  order_id INT DEFAULT NULL,
  type ENUM('earn','redeem','bonus','expire') NOT NULL,
  points INT NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- COUPONS
CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) UNIQUE NOT NULL,
  type ENUM('percent','flat') NOT NULL DEFAULT 'flat',
  value DECIMAL(10,2) NOT NULL,
  min_order DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2) DEFAULT NULL,
  max_uses INT DEFAULT 100,
  used_count INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  expires_at DATETIME DEFAULT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- WAITER CALLS
CREATE TABLE IF NOT EXISTS waiter_calls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  table_id INT DEFAULT NULL,
  table_number VARCHAR(10) NOT NULL,
  call_type ENUM('water','waiter','bill') NOT NULL,
  status ENUM('pending','acknowledged','resolved') DEFAULT 'pending',
  acknowledged_by INT DEFAULT NULL,
  acknowledged_at DATETIME DEFAULT NULL,
  resolved_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEED COUPONS
INSERT IGNORE INTO coupons (code, type, value, min_order, max_uses, description) VALUES
('WELCOME10', 'percent', 10, 0, 500, '10% off on your first order'),
('FLAT50', 'flat', 50, 200, 200, 'Flat ₹50 off on orders above ₹200'),
('ROYAL20', 'percent', 20, 500, 100, '20% off on orders above ₹500'),
('LOYALTY100', 'flat', 100, 300, 50, '₹100 off for loyalty members');
