// Pure JavaScript SQLite — no compilation needed, works on Node 25+
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../data/royal_cafe.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let sqliteDb = null;

// Save DB to disk
function saveDb() {
  if (!sqliteDb) return;
  try {
    const data = sqliteDb.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch(e) { console.error('Save error:', e.message); }
}

// Auto-save every 5 seconds
setInterval(saveDb, 5000);
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(); });

async function getDb() {
  if (sqliteDb) return sqliteDb;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    sqliteDb = new SQL.Database(buf);
  } else {
    sqliteDb = new SQL.Database();
  }
  sqliteDb.run('PRAGMA foreign_keys = ON');
  initSchema();
  return sqliteDb;
}

function runQuery(database, sql, params = []) {
  // sql.js uses ? placeholders, convert named to positional
  const upperSQL = sql.trim().toUpperCase().replace(/\s+/g, ' ');
  
  if (upperSQL.startsWith('SELECT') || upperSQL.startsWith('PRAGMA') || upperSQL.startsWith('WITH')) {
    const stmt = database.prepare(sql);
    const rows = [];
    stmt.bind(params);
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return { rows, lastInsertRowid: 0, changes: 0 };
  } else {
    database.run(sql, params);
    return { rows: [], lastInsertRowid: database.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0] || 0, changes: 1 };
  }
}

// mysql2-style async API
const db = {
  query: async (sql, params = []) => {
    try {
      const database = await getDb();
      // Translate MySQL → SQLite syntax
      let s = sql
        .replace(/`/g, '"')
        .replace(/\bNOW\(\)/gi, "datetime('now')")
        .replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now')")
        .replace(/\bDATE\(([^)]+)\)/gi, "date($1)")
        .replace(/MONTH\(([^)]+)\)/gi, "strftime('%m',$1)")
        .replace(/YEAR\(([^)]+)\)/gi, "strftime('%Y',$1)")
        .replace(/DATE_SUB\(NOW\(\),\s*INTERVAL\s+(\d+)\s+DAY\)/gi, "date('now','-$1 days')")
        .replace(/\s+ON DUPLICATE KEY UPDATE[\s\S]*$/gi, '')
        .replace(/TINYINT\(\d+\)/gi, 'INTEGER')
        .replace(/INT\s+AUTO_INCREMENT/gi, 'INTEGER')
        .replace(/VARCHAR\(\d+\)/gi, 'TEXT')
        .replace(/DECIMAL\([^)]+\)/gi, 'REAL')
        .replace(/ENUM\([^)]+\)/gi, 'TEXT')
        .replace(/\bTIMESTAMP\b/gi, 'TEXT')
        .replace(/\bDATETIME\b/gi, 'TEXT')
        .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
        .replace(/\bIF NOT EXISTS\b/gi, 'IF NOT EXISTS')
        .replace(/ENGINE\s*=\s*\w+/gi, '')
        .replace(/DEFAULT CHARSET\s*=\s*\w+/gi, '')
        .replace(/SUM\(status='([^']+)'\)/gi, "SUM(CASE WHEN status='$1' THEN 1 ELSE 0 END)");

      const result = runQuery(database, s, params.map(p => p === undefined ? null : p));
      saveDb();
      return [result.rows.length > 0 ? result.rows : { insertId: result.lastInsertRowid, affectedRows: result.changes }];
    } catch(e) {
      if (e.message && (e.message.includes('UNIQUE') || e.message.includes('constraint'))) {
        return [{ insertId: 0, affectedRows: 0 }];
      }
      console.error('DB Error:', e.message, '\nSQL:', sql.substring(0, 120));
      throw e;
    }
  },
  getConnection: async () => {
    const database = await getDb();
    return {
      beginTransaction: async () => { try { database.run('BEGIN'); } catch(e){} },
      commit: async () => { try { database.run('COMMIT'); saveDb(); } catch(e){} },
      rollback: async () => { try { database.run('ROLLBACK'); } catch(e){} },
      release: () => {},
      query: async (sql, params = []) => db.query(sql, params),
    };
  }
};

function initSchema() {
  const stmts = `
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT DEFAULT 'customer',phone TEXT,status TEXT DEFAULT 'active',created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,description TEXT,image_url TEXT,status TEXT DEFAULT 'active',created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS menu_items (id INTEGER PRIMARY KEY AUTOINCREMENT,category_id INTEGER NOT NULL,name TEXT NOT NULL,description TEXT,price REAL NOT NULL,image_url TEXT,is_veg INTEGER DEFAULT 1,is_available INTEGER DEFAULT 1,prep_time INTEGER DEFAULT 15,created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS cafe_tables (id INTEGER PRIMARY KEY AUTOINCREMENT,table_number TEXT UNIQUE NOT NULL,capacity INTEGER DEFAULT 4,status TEXT DEFAULT 'available',floor TEXT DEFAULT 'Ground');
CREATE TABLE IF NOT EXISTS reservations (id INTEGER PRIMARY KEY AUTOINCREMENT,customer_name TEXT NOT NULL,customer_phone TEXT NOT NULL,customer_email TEXT,table_id INTEGER,date TEXT NOT NULL,time TEXT NOT NULL,guests INTEGER NOT NULL,status TEXT DEFAULT 'pending',notes TEXT,created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY AUTOINCREMENT,order_number TEXT UNIQUE NOT NULL,table_id INTEGER,customer_id INTEGER,waiter_id INTEGER,order_type TEXT DEFAULT 'dine_in',status TEXT DEFAULT 'pending',subtotal REAL DEFAULT 0,tax REAL DEFAULT 0,discount REAL DEFAULT 0,total REAL DEFAULT 0,notes TEXT,created_at TEXT DEFAULT (datetime('now')),updated_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL,menu_item_id INTEGER NOT NULL,quantity INTEGER NOT NULL DEFAULT 1,unit_price REAL NOT NULL,total_price REAL NOT NULL,status TEXT DEFAULT 'pending',notes TEXT);
CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT,order_id INTEGER NOT NULL UNIQUE,payment_method TEXT NOT NULL,amount REAL NOT NULL,transaction_id TEXT,razorpay_order_id TEXT,razorpay_payment_id TEXT,status TEXT DEFAULT 'pending',paid_at TEXT,created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS inventory (id INTEGER PRIMARY KEY AUTOINCREMENT,item_name TEXT NOT NULL,category TEXT,quantity REAL NOT NULL DEFAULT 0,unit TEXT NOT NULL,min_quantity REAL DEFAULT 10,cost_per_unit REAL,supplier TEXT,last_updated TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS feedback (id INTEGER PRIMARY KEY AUTOINCREMENT,customer_name TEXT,customer_email TEXT,order_id INTEGER,food_rating INTEGER,service_rating INTEGER,ambiance_rating INTEGER,comment TEXT,created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS attendance (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,date TEXT NOT NULL,check_in TEXT,check_out TEXT,status TEXT DEFAULT 'present',UNIQUE(user_id,date));
CREATE TABLE IF NOT EXISTS loyalty_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL UNIQUE,total_points INTEGER DEFAULT 0,available_points INTEGER DEFAULT 0,redeemed_points INTEGER DEFAULT 0,total_spent REAL DEFAULT 0,created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS loyalty_transactions (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,order_id INTEGER,type TEXT NOT NULL,points INTEGER NOT NULL,description TEXT,created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS coupons (id INTEGER PRIMARY KEY AUTOINCREMENT,code TEXT UNIQUE NOT NULL,type TEXT NOT NULL DEFAULT 'flat',value REAL NOT NULL,min_order REAL DEFAULT 0,max_discount REAL,max_uses INTEGER DEFAULT 100,used_count INTEGER DEFAULT 0,is_active INTEGER DEFAULT 1,expires_at TEXT,description TEXT,created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS waiter_calls (id INTEGER PRIMARY KEY AUTOINCREMENT,table_id INTEGER,table_number TEXT NOT NULL,call_type TEXT NOT NULL,status TEXT DEFAULT 'pending',acknowledged_by INTEGER,acknowledged_at TEXT,resolved_at TEXT,created_at TEXT DEFAULT (datetime('now')));
`;
  stmts.split(';').map(s=>s.trim()).filter(Boolean).forEach(s => {
    try { sqliteDb.run(s + ';'); } catch(e) { /* table already exists */ }
  });

  // Seed if empty
  const result = sqliteDb.exec('SELECT COUNT(*) as c FROM users');
  const count = result[0]?.values[0][0] || 0;
  if (count > 0) return;

  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('admin123', 10);
  const staff = [
    ['Admin Raja','admin@royalcafe.com',hash,'admin','9876543210'],
    ['Manager Priya','manager@royalcafe.com',hash,'manager','9876543211'],
    ['Waiter Arjun','waiter@royalcafe.com',hash,'waiter','9876543212'],
    ['Chef Kumar','kitchen@royalcafe.com',hash,'kitchen','9876543213'],
  ];
  staff.forEach(s => {
    try { sqliteDb.run('INSERT OR IGNORE INTO users (name,email,password,role,phone) VALUES (?,?,?,?,?)', s); } catch(e){}
  });

  ['Beverages','Starters','Main Course','Desserts','Sandwiches'].forEach(c => {
    try { sqliteDb.run('INSERT OR IGNORE INTO categories (name) VALUES (?)', [c]); } catch(e){}
  });

  const items = [
    [1,'Royal Coffee','Premium arabica blend',180,1,5],[1,'Masala Chai','Spiced Indian tea',80,1,5],
    [1,'Cold Brew','Smooth 24-hour cold brew',220,1,2],[1,'Mango Smoothie','Fresh Alphonso mango',160,1,5],
    [2,'Paneer Tikka','Grilled cottage cheese',280,1,15],[2,'Chicken Wings','Crispy fried wings',320,0,20],
    [2,'Bruschetta','Toasted bread with tomato',180,1,10],[3,'Butter Chicken','Creamy tomato gravy',380,0,25],
    [3,'Dal Makhani','Slow-cooked black lentils',280,1,25],[3,'Pasta Arrabbiata','Spicy tomato pasta',320,1,20],
    [4,'Gulab Jamun','Soft milk dumplings',120,1,5],[4,'Chocolate Lava Cake','Warm dark chocolate',200,1,15],
    [5,'Club Sandwich','Triple-layered grilled',240,0,12],[5,'Veggie Wrap','Grilled veggies in tortilla',200,1,10],
  ];
  items.forEach(i => {
    try { sqliteDb.run('INSERT OR IGNORE INTO menu_items (category_id,name,description,price,is_veg,prep_time) VALUES (?,?,?,?,?,?)', i); } catch(e){}
  });

  [['T01',2,'Ground'],['T02',4,'Ground'],['T03',4,'Ground'],['T04',6,'Ground'],['T05',2,'Ground'],
   ['T06',4,'First'],['T07',4,'First'],['T08',8,'First'],['T09',2,'Terrace'],['T10',6,'Terrace']].forEach(t => {
    try { sqliteDb.run('INSERT OR IGNORE INTO cafe_tables (table_number,capacity,floor) VALUES (?,?,?)', t); } catch(e){}
  });

  [['Coffee Beans','Beverages',50,'kg',10,800],['Milk','Dairy',100,'litre',20,60],
   ['Chicken','Meat',30,'kg',5,280],['Paneer','Dairy',15,'kg',3,320],
   ['Tomatoes','Vegetables',20,'kg',5,40],['Flour','Dry Goods',25,'kg',5,45]].forEach(i => {
    try { sqliteDb.run('INSERT OR IGNORE INTO inventory (item_name,category,quantity,unit,min_quantity,cost_per_unit) VALUES (?,?,?,?,?,?)', i); } catch(e){}
  });

  [['WELCOME10','percent',10,0,500,'10% off on your first order'],
   ['FLAT50','flat',50,200,200,'Flat ₹50 off on orders above ₹200'],
   ['ROYAL20','percent',20,500,100,'20% off on orders above ₹500'],
   ['LOYALTY100','flat',100,300,50,'₹100 off for loyalty members']].forEach(c => {
    try { sqliteDb.run('INSERT OR IGNORE INTO coupons (code,type,value,min_order,max_uses,description) VALUES (?,?,?,?,?,?)', c); } catch(e){}
  });

  saveDb();
  console.log('✅ Database seeded with sample data!');
}

// Initialize on startup
getDb().then(() => console.log('✅ Database ready! (no MySQL needed)')).catch(e => console.error('DB init error:', e));

module.exports = db;
