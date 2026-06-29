// =============================
//   ROYAL CAFE - MAIN APP JS
// =============================

const API = 'http://localhost:5000/api';
let currentUser = null;
let token = null;
let socket = null;
let pendingOrdersCount = 0;

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  token = localStorage.getItem('rc_token');
  const userStr = localStorage.getItem('rc_user');
  if (token && userStr) {
    currentUser = JSON.parse(userStr);
    initApp();
  } else {
    showLoginPage();
  }
  updateClock();
  setInterval(updateClock, 1000);
});

function updateClock() {
  const el = document.getElementById('topbar-date');
  if (el) el.textContent = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

// ---- LOGIN ----
function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('app-layout').style.display = 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  btn.textContent = 'Signing in...'; btn.disabled = true;
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    token = data.token;
    currentUser = data.user;
    localStorage.setItem('rc_token', token);
    localStorage.setItem('rc_user', JSON.stringify(currentUser));
    document.getElementById('login-page').style.display = 'none';
    initApp();
    toast('Welcome back, ' + currentUser.name + '!', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
  btn.textContent = 'Sign In'; btn.disabled = false;
}

function logout() {
  localStorage.removeItem('rc_token');
  localStorage.removeItem('rc_user');
  if (socket) socket.disconnect();
  location.reload();
}

// ---- APP INIT ----
function initApp() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('app-layout').style.display = 'flex';

  // Set user info in sidebar
  const initials = currentUser.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('sidebar-initials').textContent = initials;
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-role').textContent = currentUser.role;

  // Hide admin nav items for non-admin
  setupNavVisibility();

  // Socket.io
  initSocket();

  // Navigate to dashboard
  navigateTo('dashboard');
}

function setupNavVisibility() {
  const adminOnly = document.querySelectorAll('[data-role="admin"]');
  const managerPlus = document.querySelectorAll('[data-role="manager"]');
  adminOnly.forEach(el => {
    if (!['admin'].includes(currentUser.role)) el.style.display = 'none';
  });
  managerPlus.forEach(el => {
    if (!['admin','manager'].includes(currentUser.role)) el.style.display = 'none';
  });
}

function initSocket() {
  if (typeof io === 'undefined') return;
  socket = io('http://localhost:5000');
  socket.emit('join_room', currentUser.role === 'kitchen' ? 'kitchen' : 'admin');
  socket.emit('join_room', 'waiter_' + currentUser.id);

  socket.on('new_order_received', (order) => {
    pendingOrdersCount++;
    document.getElementById('pending-badge').textContent = pendingOrdersCount;
    document.getElementById('pending-badge').style.display = 'block';
    toast('New order #' + order.order_number + ' received!', 'info');
    if (currentPage === 'orders') loadOrders();
    if (currentPage === 'kitchen') loadKitchenOrders();
  });

  socket.on('order_status_changed', (data) => {
    toast('Order status updated to: ' + data.status, 'info');
    if (currentPage === 'orders') loadOrders();
    if (currentPage === 'kitchen') loadKitchenOrders();
  });

  socket.on('table_updated', () => {
    if (currentPage === 'tables') loadTables();
  });
}

// ---- NAVIGATION ----
let currentPage = '';
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`.nav-item[onclick*="${page}"]`);
  if (navEl) navEl.classList.add('active');
  document.getElementById('page-title').textContent = pageTitles[page] || 'Royal Cafe';
  currentPage = page;
  loadPage(page);

  // Mobile: close sidebar
  document.querySelector('.sidebar').classList.remove('open');
}

const pageTitles = {
  dashboard: 'Dashboard',
  orders: 'Order Management',
  menu: 'Menu Management',
  tables: 'Table Management',
  billing: 'Billing & Payments',
  inventory: 'Inventory',
  reservations: 'Reservations',
  kitchen: 'Kitchen Display',
  staff: 'Staff Management',
  feedback: 'Customer Feedback',
  reports: 'Reports & Analytics'
};

function loadPage(page) {
  switch(page) {
    case 'dashboard': loadDashboard(); break;
    case 'orders': loadOrders(); break;
    case 'menu': loadMenu(); break;
    case 'tables': loadTables(); break;
    case 'billing': loadBilling(); break;
    case 'inventory': loadInventory(); break;
    case 'reservations': loadReservations(); break;
    case 'kitchen': loadKitchenOrders(); break;
    case 'staff': loadStaff(); break;
    case 'feedback': loadFeedback(); break;
    case 'reports': loadReports(); break;
  }
}

// ---- API HELPER ----
async function apiGet(endpoint) {
  const res = await fetch(API + endpoint, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (res.status === 401) { logout(); return null; }
  return res.json();
}

async function apiPost(endpoint, data) {
  const res = await fetch(API + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(data)
  });
  return { ok: res.ok, data: await res.json() };
}

async function apiPut(endpoint, data) {
  const res = await fetch(API + endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(data)
  });
  return { ok: res.ok, data: await res.json() };
}

async function apiDelete(endpoint) {
  const res = await fetch(API + endpoint, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer ' + token }
  });
  return { ok: res.ok, data: await res.json() };
}

// ---- TOAST ----
function toast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ---- MODAL HELPERS ----
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ---- DASHBOARD ----
async function loadDashboard() {
  const data = await apiGet('/reports/summary');
  if (!data) return;
  document.getElementById('stat-today-orders').textContent = data.today_orders;
  document.getElementById('stat-today-revenue').textContent = '₹' + parseFloat(data.today_revenue).toFixed(0);
  document.getElementById('stat-pending').textContent = data.pending_orders;
  document.getElementById('stat-month-revenue').textContent = '₹' + parseFloat(data.month_revenue).toFixed(0);
  document.getElementById('stat-tables-occ').textContent = data.tables_occupied + '/' + data.tables_total;
  document.getElementById('stat-low-stock').textContent = data.low_stock_count;

  // Recent orders
  const orders = await apiGet('/orders?limit=5');
  if (orders) renderDashboardOrders(orders);

  // Charts
  loadDashboardCharts();
}

function renderDashboardOrders(orders) {
  const tbody = document.getElementById('recent-orders-tbody');
  if (!orders.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-center">No orders today</td></tr>'; return; }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong style="color:var(--gold)">${o.order_number}</strong></td>
      <td>${o.table_number || o.order_type}</td>
      <td>₹${parseFloat(o.total).toFixed(0)}</td>
      <td><span class="badge badge-${o.status}">${o.status}</span></td>
      <td>${new Date(o.created_at).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}</td>
    </tr>
  `).join('');
}

async function loadDashboardCharts() {
  const revenue = await apiGet('/reports/revenue');
  const cats = await apiGet('/reports/category-revenue');
  if (!revenue || !cats) return;

  // Revenue chart
  const rCtx = document.getElementById('revenue-chart');
  if (rCtx && window.Chart) {
    if (rCtx._chart) rCtx._chart.destroy();
    rCtx._chart = new Chart(rCtx, {
      type: 'line',
      data: {
        labels: revenue.map(r => new Date(r.date).toLocaleDateString('en-IN', {month:'short',day:'numeric'})),
        datasets: [{
          label: 'Revenue (₹)',
          data: revenue.map(r => parseFloat(r.revenue)),
          borderColor: '#C9A84C',
          backgroundColor: 'rgba(201,168,76,0.1)',
          fill: true, tension: 0.4, pointBackgroundColor: '#C9A84C'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#BBBBBB' } } },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: 'rgba(201,168,76,0.07)' } },
          y: { ticks: { color: '#888' }, grid: { color: 'rgba(201,168,76,0.07)' } }
        }
      }
    });
  }

  // Category pie
  const cCtx = document.getElementById('category-chart');
  if (cCtx && window.Chart) {
    if (cCtx._chart) cCtx._chart.destroy();
    const colors = ['#C9A84C','#E8C96D','#8B6914','#55efc4','#74b9ff','#fd79a8'];
    cCtx._chart = new Chart(cCtx, {
      type: 'doughnut',
      data: {
        labels: cats.map(c => c.category),
        datasets: [{ data: cats.map(c => parseFloat(c.revenue)), backgroundColor: colors }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#BBBBBB', padding: 12 } } }
      }
    });
  }
}

// ---- ORDERS ----
let allOrders = [];
async function loadOrders() {
  allOrders = await apiGet('/orders') || [];
  renderOrders(allOrders);
}

function renderOrders(orders) {
  const tbody = document.getElementById('orders-tbody');
  if (!orders.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📋</div><p>No orders found</p></div></td></tr>'; return; }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong style="color:var(--gold)">${o.order_number}</strong></td>
      <td>${o.table_number || '-'}</td>
      <td>${o.customer_name || 'Walk-in'}</td>
      <td>₹${parseFloat(o.total).toFixed(2)}</td>
      <td><span class="badge badge-${o.status}">${o.status}</span></td>
      <td>${new Date(o.created_at).toLocaleString('en-IN')}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="viewOrder(${o.id})">View</button>
          ${o.status !== 'completed' && o.status !== 'cancelled' ? `<button class="btn btn-gold btn-sm" onclick="updateOrderStatus(${o.id}, nextStatus('${o.status}'))">→ ${nextStatus(o.status)}</button>` : ''}
          ${o.status === 'completed' && !o.payment_id ? `<button class="btn btn-outline btn-sm" onclick="openBillingForOrder(${o.id})">Bill</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function nextStatus(s) {
  const flow = { pending:'confirmed', confirmed:'preparing', preparing:'ready', ready:'served', served:'completed' };
  return flow[s] || '';
}

async function updateOrderStatus(id, status) {
  if (!status) return;
  const { ok } = await apiPut(`/orders/${id}/status`, { status });
  if (ok) { toast('Order updated to ' + status, 'success'); loadOrders(); }
}

async function viewOrder(id) {
  const order = await apiGet(`/orders/${id}`);
  if (!order) return;
  document.getElementById('order-detail-content').innerHTML = `
    <div style="display:flex;justify-content:space-between;margin-bottom:16px">
      <div>
        <div style="font-size:20px;color:var(--gold);font-family:var(--font-serif)">${order.order_number}</div>
        <div style="color:var(--gray);font-size:12px">${new Date(order.created_at).toLocaleString('en-IN')}</div>
      </div>
      <span class="badge badge-${order.status}">${order.status}</span>
    </div>
    <div class="form-row" style="margin-bottom:16px">
      <div><span style="color:var(--gray);font-size:11px">TABLE</span><div>${order.table_number || '-'}</div></div>
      <div><span style="color:var(--gray);font-size:11px">TYPE</span><div>${order.order_type}</div></div>
    </div>
    <div class="gold-divider"></div>
    <table class="data-table">
      <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>
        ${order.items.map(i => `
          <tr>
            <td>${i.item_name}</td>
            <td>${i.quantity}</td>
            <td>₹${parseFloat(i.unit_price).toFixed(2)}</td>
            <td>₹${parseFloat(i.total_price).toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="gold-divider"></div>
    <div style="text-align:right">
      <div style="color:var(--gray);font-size:13px">Subtotal: ₹${parseFloat(order.subtotal).toFixed(2)}</div>
      <div style="color:var(--gray);font-size:13px">GST (5%): ₹${parseFloat(order.tax).toFixed(2)}</div>
      <div style="font-family:var(--font-serif);font-size:22px;color:var(--gold);margin-top:8px">Total: ₹${parseFloat(order.total).toFixed(2)}</div>
    </div>
  `;
  openModal('order-detail-modal');
}

// ---- NEW ORDER ----
let orderCart = [];
let menuForOrder = [];
async function openNewOrder() {
  orderCart = [];
  menuForOrder = await apiGet('/menu/items?available=true') || [];
  const tables = await apiGet('/tables') || [];
  const tableSelect = document.getElementById('order-table');
  tableSelect.innerHTML = '<option value="">Select Table</option>' + tables.filter(t=>t.status==='available').map(t=>`<option value="${t.id}">${t.table_number} (${t.floor})</option>`).join('');
  renderOrderMenu();
  updateCartDisplay();
  openModal('new-order-modal');
}

function renderOrderMenu() {
  const search = document.getElementById('order-menu-search')?.value.toLowerCase() || '';
  const filtered = menuForOrder.filter(m => m.name.toLowerCase().includes(search));
  const emojis = { Beverages:'☕', Starters:'🍢', 'Main Course':'🍛', Desserts:'🍮', Sandwiches:'🥙' };
  document.getElementById('order-menu-list').innerHTML = filtered.map(m => `
    <div class="menu-card" onclick="addToCart(${m.id})">
      <div class="menu-card-img">${emojis[m.category_name] || '🍽️'}</div>
      <div class="menu-card-body">
        <div class="menu-card-name">${m.name}</div>
        <div class="menu-card-footer">
          <span class="menu-price">₹${parseFloat(m.price).toFixed(0)}</span>
          <span class="badge badge-${m.is_veg?'veg':'nonveg'}">${m.is_veg?'VEG':'NON'}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function addToCart(menuId) {
  const item = menuForOrder.find(m => m.id === menuId);
  if (!item) return;
  const existing = orderCart.find(c => c.menu_item_id === menuId);
  if (existing) existing.quantity++;
  else orderCart.push({ menu_item_id: menuId, name: item.name, price: item.price, quantity: 1 });
  updateCartDisplay();
  toast(item.name + ' added', 'success');
}

function updateCartDisplay() {
  const tbody = document.getElementById('cart-tbody');
  if (!orderCart.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--gray)">Cart is empty</td></tr>';
  } else {
    tbody.innerHTML = orderCart.map((c,i) => `
      <tr>
        <td>${c.name}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <button class="btn btn-outline btn-icon btn-sm" onclick="changeQty(${i},-1)">-</button>
            <span>${c.quantity}</span>
            <button class="btn btn-outline btn-icon btn-sm" onclick="changeQty(${i},1)">+</button>
          </div>
        </td>
        <td>₹${parseFloat(c.price).toFixed(0)}</td>
        <td>₹${(c.price * c.quantity).toFixed(0)}</td>
      </tr>
    `).join('');
  }
  const subtotal = orderCart.reduce((s,c) => s + c.price * c.quantity, 0);
  const tax = subtotal * 0.05;
  document.getElementById('cart-subtotal').textContent = '₹' + subtotal.toFixed(2);
  document.getElementById('cart-tax').textContent = '₹' + tax.toFixed(2);
  document.getElementById('cart-total').textContent = '₹' + (subtotal + tax).toFixed(2);
}

function changeQty(i, delta) {
  orderCart[i].quantity += delta;
  if (orderCart[i].quantity <= 0) orderCart.splice(i, 1);
  updateCartDisplay();
}

async function submitOrder() {
  if (!orderCart.length) { toast('Cart is empty!', 'error'); return; }
  const table_id = document.getElementById('order-table').value;
  const order_type = document.getElementById('order-type').value;
  const notes = document.getElementById('order-notes').value;
  const { ok, data } = await apiPost('/orders', {
    table_id: table_id || null,
    order_type,
    notes,
    items: orderCart.map(c => ({ menu_item_id: c.menu_item_id, quantity: c.quantity }))
  });
  if (ok) {
    toast('Order placed! #' + data.order_id, 'success');
    closeModal('new-order-modal');
    loadOrders();
  } else toast(data.message, 'error');
}

// ---- MENU ----
async function loadMenu() {
  const [items, cats] = await Promise.all([apiGet('/menu/items'), apiGet('/menu/categories')]);
  if (!items || !cats) return;

  // Populate category filter
  const catFilter = document.getElementById('menu-cat-filter');
  if (catFilter) {
    catFilter.innerHTML = '<option value="">All Categories</option>' + cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  }

  renderMenuItems(items);
  // Populate add item category select
  const catSelect = document.getElementById('menu-item-category');
  if (catSelect) catSelect.innerHTML = cats.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
}

const menuEmojis = { Beverages:'☕', Starters:'🍢', 'Main Course':'🍛', Desserts:'🍮', Sandwiches:'🥙' };
function renderMenuItems(items) {
  const container = document.getElementById('menu-items-grid');
  if (!items.length) { container.innerHTML = '<div class="empty-state"><div class="empty-icon">🍽️</div><p>No menu items found</p></div>'; return; }
  container.innerHTML = items.map(m => `
    <div class="menu-card">
      <div class="menu-card-img">${menuEmojis[m.category_name] || '🍽️'}</div>
      <div class="menu-card-body">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <div class="menu-card-name">${m.name}</div>
          <span class="badge badge-${m.is_veg?'veg':'nonveg'}">${m.is_veg?'V':'NV'}</span>
        </div>
        <div class="menu-card-desc">${m.description || ''}</div>
        <div class="menu-card-footer">
          <span class="menu-price">₹${parseFloat(m.price).toFixed(0)}</span>
          <div style="display:flex;gap:4px">
            <button class="btn btn-outline btn-icon btn-sm" onclick='editMenuItem(${JSON.stringify(m).replace(/'/g,"&apos;")})'>✏️</button>
            <button class="btn btn-danger btn-icon btn-sm" onclick="deleteMenuItem(${m.id})">🗑</button>
          </div>
        </div>
        ${!m.is_available ? '<div style="color:var(--red);font-size:11px;margin-top:6px">Unavailable</div>' : ''}
      </div>
    </div>
  `).join('');
}

async function filterMenu() {
  const cat = document.getElementById('menu-cat-filter').value;
  const veg = document.getElementById('menu-veg-filter').value;
  let url = '/menu/items?';
  if (cat) url += `category=${cat}&`;
  if (veg === '1') url += 'veg=true';
  const items = await apiGet(url);
  if (items) renderMenuItems(items);
}

let editingMenuId = null;
function editMenuItem(item) {
  editingMenuId = item.id;
  document.getElementById('menu-item-name').value = item.name;
  document.getElementById('menu-item-price').value = item.price;
  document.getElementById('menu-item-desc').value = item.description || '';
  document.getElementById('menu-item-category').value = item.category_id;
  document.getElementById('menu-item-veg').value = item.is_veg ? '1' : '0';
  document.getElementById('menu-item-prep').value = item.prep_time;
  document.getElementById('menu-modal-title').textContent = 'Edit Menu Item';
  openModal('menu-item-modal');
}

async function saveMenuItem() {
  const data = {
    category_id: document.getElementById('menu-item-category').value,
    name: document.getElementById('menu-item-name').value,
    description: document.getElementById('menu-item-desc').value,
    price: document.getElementById('menu-item-price').value,
    is_veg: document.getElementById('menu-item-veg').value === '1',
    prep_time: document.getElementById('menu-item-prep').value,
    is_available: true
  };
  let result;
  if (editingMenuId) {
    result = await apiPut(`/menu/items/${editingMenuId}`, data);
  } else {
    result = await apiPost('/menu/items', data);
  }
  if (result.ok) {
    toast(editingMenuId ? 'Item updated' : 'Item added', 'success');
    editingMenuId = null; closeModal('menu-item-modal'); loadMenu();
  } else toast(result.data.message, 'error');
}

async function deleteMenuItem(id) {
  if (!confirm('Remove this item from menu?')) return;
  const { ok } = await apiDelete(`/menu/items/${id}`);
  if (ok) { toast('Item removed', 'success'); loadMenu(); }
}

// ---- TABLES ----
async function loadTables() {
  const tables = await apiGet('/tables') || [];
  renderTables(tables);
}
function renderTables(tables) {
  const grid = document.getElementById('tables-grid');
  const floors = [...new Set(tables.map(t => t.floor))];
  grid.innerHTML = floors.map(f => `
    <div style="margin-bottom:24px">
      <h3 style="font-size:14px;color:var(--gold);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">${f} Floor</h3>
      <div class="tables-grid">
        ${tables.filter(t=>t.floor===f).map(t => `
          <div class="table-card ${t.status}" onclick="changeTableStatus(${t.id}, '${t.status}')">
            <div class="table-number">${t.table_number}</div>
            <div class="table-cap">Seats ${t.capacity}</div>
            <div class="table-status-dot ${t.status}"></div>
            <div style="font-size:11px;color:var(--gray);margin-top:6px;text-transform:capitalize">${t.status}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}
async function changeTableStatus(id, current) {
  const next = { available:'occupied', occupied:'cleaning', cleaning:'available', reserved:'available' };
  const { ok } = await apiPut(`/tables/${id}`, { status: next[current] });
  if (ok) { toast('Table status updated', 'success'); loadTables(); }
}

// ---- BILLING ----
let billingOrder = null;
async function loadBilling() {
  const orders = await apiGet('/orders?status=served') || [];
  const tbody = document.getElementById('billing-tbody');
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💳</div><p>No orders pending billing</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><strong style="color:var(--gold)">${o.order_number}</strong></td>
      <td>${o.table_number || '-'}</td>
      <td>₹${parseFloat(o.total).toFixed(2)}</td>
      <td><span class="badge badge-${o.status}">${o.status}</span></td>
      <td><button class="btn btn-gold btn-sm" onclick="openPayment(${o.id})">💳 Pay</button></td>
    </tr>
  `).join('');
}

async function openBillingForOrder(id) {
  navigateTo('billing');
  setTimeout(() => openPayment(id), 500);
}

async function openPayment(orderId) {
  const order = await apiGet(`/orders/${orderId}`);
  if (!order) return;
  billingOrder = order;
  document.getElementById('pay-order-no').textContent = order.order_number;
  document.getElementById('pay-subtotal').textContent = '₹' + parseFloat(order.subtotal).toFixed(2);
  document.getElementById('pay-tax').textContent = '₹' + parseFloat(order.tax).toFixed(2);
  document.getElementById('pay-total').textContent = '₹' + parseFloat(order.total).toFixed(2);
  document.getElementById('pay-items').innerHTML = order.items.map(i=>`<div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--border)"><span>${i.item_name} x${i.quantity}</span><span>₹${parseFloat(i.total_price).toFixed(0)}</span></div>`).join('');
  openModal('payment-modal');
}

async function processPayment(method) {
  if (!billingOrder) return;
  if (method === 'online') {
    processRazorpay();
    return;
  }
  const txId = method === 'upi' ? prompt('Enter UPI Transaction ID:') : null;
  const { ok, data } = await apiPost('/payments/manual', {
    order_id: billingOrder.id,
    payment_method: method,
    transaction_id: txId
  });
  if (ok) {
    toast('Payment recorded successfully!', 'success');
    closeModal('payment-modal');
    generateInvoice(billingOrder, method, txId);
    loadBilling();
  } else toast(data.message, 'error');
}

async function processRazorpay() {
  const { ok, data } = await apiPost('/payments/create-razorpay-order', { order_id: billingOrder.id });
  if (!ok) { toast('Payment init failed', 'error'); return; }
  const options = {
    key: data.key,
    amount: data.amount,
    currency: data.currency,
    name: 'Royal Cafe',
    description: 'Order ' + billingOrder.order_number,
    order_id: data.razorpay_order_id,
    handler: async (response) => {
      const verRes = await apiPost('/payments/verify-razorpay', {
        ...response,
        order_id: billingOrder.id
      });
      if (verRes.ok) {
        toast('Payment successful!', 'success');
        closeModal('payment-modal');
        generateInvoice(billingOrder, 'online', response.razorpay_payment_id);
        loadBilling();
      }
    },
    theme: { color: '#C9A84C' }
  };
  if (window.Razorpay) new window.Razorpay(options).open();
  else toast('Razorpay not loaded. Use manual payment.', 'error');
}

function generateInvoice(order, method, txId) {
  const w = window.open('', '_blank', 'width=700,height=900');
  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice - ${order.order_number}</title>
      <style>
        body { font-family: 'Georgia', serif; padding: 40px; color: #111; }
        .header { text-align: center; border-bottom: 2px solid #C9A84C; padding-bottom: 20px; margin-bottom: 20px; }
        .logo { font-size: 28px; color: #8B6914; letter-spacing: 2px; }
        .sub { font-size: 11px; color: #888; letter-spacing: 3px; text-transform: uppercase; }
        .invoice-no { font-size: 13px; color: #888; margin-top: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f8f4e8; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #8B6914; }
        td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; }
        .total-section { text-align: right; margin-top: 16px; }
        .total-row { display: flex; justify-content: flex-end; gap: 40px; margin: 4px 0; font-size: 13px; color: #555; }
        .grand-total { font-size: 20px; color: #8B6914; font-weight: bold; margin-top: 8px; }
        .payment-info { background: #f8f4e8; padding: 12px 16px; border-radius: 4px; margin-top: 16px; font-size: 13px; }
        .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #aaa; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">☕ ROYAL CAFE</div>
        <div class="sub">Fine Dining &amp; Premium Coffee</div>
        <div class="invoice-no">INVOICE #${order.order_number} &nbsp;|&nbsp; ${new Date().toLocaleString('en-IN')}</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:16px">
        <div><strong>Table:</strong> ${order.table_number || '-'}<br><strong>Type:</strong> ${order.order_type}</div>
        <div><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-IN')}<br><strong>Time:</strong> ${new Date(order.created_at).toLocaleTimeString('en-IN')}</div>
      </div>
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          ${order.items.map(i=>`<tr><td>${i.item_name}</td><td>${i.quantity}</td><td>₹${parseFloat(i.unit_price).toFixed(2)}</td><td>₹${parseFloat(i.total_price).toFixed(2)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div class="total-section">
        <div class="total-row"><span>Subtotal</span><span>₹${parseFloat(order.subtotal).toFixed(2)}</span></div>
        <div class="total-row"><span>GST (5%)</span><span>₹${parseFloat(order.tax).toFixed(2)}</span></div>
        <div class="grand-total">TOTAL: ₹${parseFloat(order.total).toFixed(2)}</div>
      </div>
      <div class="payment-info">
        <strong>Payment Method:</strong> ${method.toUpperCase()}
        ${txId ? ` &nbsp;|&nbsp; <strong>Transaction ID:</strong> ${txId}` : ''}
        &nbsp;|&nbsp; <strong>Status:</strong> PAID ✓
      </div>
      <div class="footer">
        Thank you for dining at Royal Cafe! &nbsp;|&nbsp; We hope to see you again soon.
        <br>For queries call: +91 98765 43210
      </div>
      <div style="text-align:center;margin-top:24px">
        <button onclick="window.print()" style="background:#C9A84C;border:none;padding:10px 24px;border-radius:4px;cursor:pointer;font-size:14px">🖨️ Print Invoice</button>
      </div>
    </body></html>
  `);
  w.document.close();
}

// ---- INVENTORY ----
async function loadInventory() {
  const items = await apiGet('/inventory') || [];
  renderInventory(items);
  const lowStock = items.filter(i => parseFloat(i.quantity) <= parseFloat(i.min_quantity));
  document.getElementById('low-stock-count').textContent = lowStock.length;
}
function renderInventory(items) {
  const tbody = document.getElementById('inventory-tbody');
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📦</div><p>No inventory items</p></div></td></tr>'; return; }
  tbody.innerHTML = items.map(i => `
    <tr>
      <td>${i.item_name}</td>
      <td>${i.category || '-'}</td>
      <td style="color:${parseFloat(i.quantity) <= parseFloat(i.min_quantity) ? 'var(--red)' : 'var(--green)'}">
        ${parseFloat(i.quantity).toFixed(1)} ${i.unit}
      </td>
      <td>${parseFloat(i.min_quantity).toFixed(1)} ${i.unit}</td>
      <td>${i.cost_per_unit ? '₹' + parseFloat(i.cost_per_unit).toFixed(2) : '-'}</td>
      <td>${i.supplier || '-'}</td>
      <td>
        ${parseFloat(i.quantity) <= parseFloat(i.min_quantity) ? '<span class="badge badge-cancelled">Low Stock</span>' : '<span class="badge badge-completed">OK</span>'}
      </td>
    </tr>
  `).join('');
}
async function saveInventoryItem() {
  const data = {
    item_name: document.getElementById('inv-name').value,
    category: document.getElementById('inv-category').value,
    quantity: document.getElementById('inv-qty').value,
    unit: document.getElementById('inv-unit').value,
    min_quantity: document.getElementById('inv-min').value,
    cost_per_unit: document.getElementById('inv-cost').value,
    supplier: document.getElementById('inv-supplier').value
  };
  const { ok } = await apiPost('/inventory', data);
  if (ok) { toast('Inventory item added', 'success'); closeModal('inventory-modal'); loadInventory(); }
}

// ---- RESERVATIONS ----
async function loadReservations() {
  const date = document.getElementById('res-date')?.value || new Date().toISOString().split('T')[0];
  const reservations = await apiGet(`/reservations?date=${date}`) || [];
  renderReservations(reservations);
}
function renderReservations(list) {
  const tbody = document.getElementById('reservations-tbody');
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📅</div><p>No reservations</p></div></td></tr>'; return; }
  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${r.customer_name}</td>
      <td>${r.customer_phone}</td>
      <td>${r.date}</td>
      <td>${r.time}</td>
      <td>${r.guests}</td>
      <td>${r.table_number || 'Not assigned'}</td>
      <td><span class="badge badge-${r.status}">${r.status}</span></td>
    </tr>
  `).join('');
}
async function saveReservation() {
  const data = {
    customer_name: document.getElementById('res-name').value,
    customer_phone: document.getElementById('res-phone').value,
    customer_email: document.getElementById('res-email').value,
    date: document.getElementById('res-book-date').value,
    time: document.getElementById('res-time').value,
    guests: document.getElementById('res-guests').value,
    notes: document.getElementById('res-notes').value
  };
  const { ok } = await apiPost('/reservations', data);
  if (ok) { toast('Reservation confirmed!', 'success'); closeModal('reservation-modal'); loadReservations(); }
}

// ---- KITCHEN DISPLAY ----
async function loadKitchenOrders() {
  const orders = await apiGet('/orders?status=confirmed') || [];
  const preparing = await apiGet('/orders?status=preparing') || [];
  const all = [...orders, ...preparing];
  const grid = document.getElementById('kitchen-grid');
  if (!all.length) { grid.innerHTML = '<div class="empty-state"><div class="empty-icon">👨‍🍳</div><p>No active orders</p></div>'; return; }
  const fullOrders = await Promise.all(all.map(o => apiGet(`/orders/${o.id}`)));
  grid.innerHTML = fullOrders.filter(Boolean).map(o => `
    <div class="kitchen-card">
      <div class="kitchen-card-header">
        <div>
          <div style="color:var(--gold);font-weight:600">${o.order_number}</div>
          <div style="font-size:11px;color:var(--gray)">${o.table_number || o.order_type} · ${new Date(o.created_at).toLocaleTimeString('en-IN')}</div>
        </div>
        <span class="badge badge-${o.status}">${o.status}</span>
      </div>
      <div class="kitchen-card-items">
        ${o.items.map(i => `
          <div class="kitchen-item">
            <span>${i.item_name} <strong style="color:var(--gold)">×${i.quantity}</strong></span>
            ${i.notes ? `<span style="font-size:11px;color:var(--gray)">(${i.notes})</span>` : ''}
          </div>
        `).join('')}
        <div style="margin-top:12px;display:flex;gap:8px">
          ${o.status === 'confirmed' ? `<button class="btn btn-outline btn-sm" onclick="updateOrderStatus(${o.id},'preparing')">Start Preparing</button>` : ''}
          ${o.status === 'preparing' ? `<button class="btn btn-gold btn-sm" onclick="updateOrderStatus(${o.id},'ready')">Mark Ready ✓</button>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// ---- STAFF ----
async function loadStaff() {
  const staff = await apiGet('/staff') || [];
  const tbody = document.getElementById('staff-tbody');
  tbody.innerHTML = staff.map(s => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar" style="width:32px;height:32px;font-size:12px">${s.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
          <span>${s.name}</span>
        </div>
      </td>
      <td>${s.email}</td>
      <td><span class="badge badge-${s.role==='admin'?'cancelled':s.role==='manager'?'preparing':'completed'}">${s.role}</span></td>
      <td>${s.phone || '-'}</td>
      <td><span class="badge badge-${s.status==='active'?'available':'occupied'}">${s.status}</span></td>
    </tr>
  `).join('');
}

// ---- FEEDBACK ----
async function loadFeedback() {
  const feedback = await apiGet('/feedback') || [];
  const ratings = await apiGet('/reports/ratings');
  if (ratings) {
    document.getElementById('avg-food').textContent = parseFloat(ratings.food || 0).toFixed(1);
    document.getElementById('avg-service').textContent = parseFloat(ratings.service || 0).toFixed(1);
    document.getElementById('avg-ambiance').textContent = parseFloat(ratings.ambiance || 0).toFixed(1);
  }
  const tbody = document.getElementById('feedback-tbody');
  if (!feedback.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">⭐</div><p>No feedback yet</p></div></td></tr>'; return; }
  tbody.innerHTML = feedback.map(f => `
    <tr>
      <td>${f.customer_name || 'Anonymous'}</td>
      <td>${'⭐'.repeat(f.food_rating)}</td>
      <td>${'⭐'.repeat(f.service_rating)}</td>
      <td>${f.comment || '-'}</td>
      <td>${new Date(f.created_at).toLocaleDateString('en-IN')}</td>
    </tr>
  `).join('');
}
async function submitFeedback() {
  const stars = document.querySelectorAll('.star-group .star.active');
  const data = {
    customer_name: document.getElementById('fb-name').value,
    customer_email: document.getElementById('fb-email').value,
    food_rating: document.getElementById('fb-food-rating').value || 5,
    service_rating: document.getElementById('fb-service-rating').value || 5,
    ambiance_rating: document.getElementById('fb-ambiance-rating').value || 5,
    comment: document.getElementById('fb-comment').value
  };
  const { ok } = await apiPost('/feedback', data);
  if (ok) { toast('Thank you for your feedback!', 'success'); closeModal('feedback-modal'); loadFeedback(); }
}
function setRating(field, val) {
  document.getElementById(field).value = val;
  const stars = document.querySelectorAll(`.stars-${field} .star`);
  stars.forEach((s,i) => s.classList.toggle('active', i < val));
}

// ---- REPORTS ----
async function loadReports() {
  const [revenue, topItems, cats, ratings] = await Promise.all([
    apiGet('/reports/revenue'),
    apiGet('/reports/top-items'),
    apiGet('/reports/category-revenue'),
    apiGet('/reports/ratings')
  ]);

  // Top items table
  const tbody = document.getElementById('top-items-tbody');
  if (topItems && topItems.length) {
    tbody.innerHTML = topItems.map((item, i) => `
      <tr>
        <td style="color:var(--gold)">#${i+1}</td>
        <td>${item.name}</td>
        <td>${item.total_qty}</td>
        <td>₹${parseFloat(item.total_revenue).toFixed(0)}</td>
      </tr>
    `).join('');
  }

  // Revenue chart
  if (revenue && window.Chart) {
    const ctx = document.getElementById('report-revenue-chart');
    if (ctx._chart) ctx._chart.destroy();
    ctx._chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: revenue.map(r => new Date(r.date).toLocaleDateString('en-IN', {month:'short',day:'numeric'})),
        datasets: [{
          label: 'Revenue',
          data: revenue.map(r => parseFloat(r.revenue)),
          backgroundColor: 'rgba(201,168,76,0.7)',
          borderColor: '#C9A84C',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#BBBBBB' } } },
        scales: {
          x: { ticks: { color: '#888' }, grid: { color: 'rgba(201,168,76,0.07)' } },
          y: { ticks: { color: '#888' }, grid: { color: 'rgba(201,168,76,0.07)' } }
        }
      }
    });
  }

  // Ratings
  if (ratings) {
    document.getElementById('report-food-rating').textContent = parseFloat(ratings.food || 0).toFixed(1) + ' ★';
    document.getElementById('report-service-rating').textContent = parseFloat(ratings.service || 0).toFixed(1) + ' ★';
    document.getElementById('report-ambiance-rating').textContent = parseFloat(ratings.ambiance || 0).toFixed(1) + ' ★';
    document.getElementById('report-total-feedback').textContent = ratings.total || 0;
  }
}

// ---- SIDEBAR TOGGLE (mobile) ----
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}
