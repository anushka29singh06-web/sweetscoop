const express = require('express');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: 'sweetscoops_secret_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// ── JSON File Database (replaces SQLite) ───────────────────────────────────
const DB_FILE = path.join(__dirname, 'db.json');

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { users: [], orders: [], contacts: [], feedback: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ── IST Time Helper ─────────────────────────────────────────────────────────
function nowIST() {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

// Seed default feedback on first run
if (!fs.existsSync(DB_FILE)) {
  writeDB({
    users: [],
    orders: [],
    contacts: [],
    feedback: [
      { id: 1, name: "Priya Sharma",  rating: 5, message: "Absolutely divine! The Mango Bliss is life-changing. The texture, the richness — pure luxury in every scoop.", submitted_at: nowIST() },
      { id: 2, name: "Arjun Mehta",   rating: 5, message: "Sweet Scoops has ruined every other ice cream for me. Nothing compares. The Rose Petal flavour is a dream.", submitted_at: nowIST() },
      { id: 3, name: "Sneha Kapoor",  rating: 5, message: "Came here for the Pistachio Royale and stayed for everything else. The ambiance matches the premium quality perfectly.", submitted_at: nowIST() },
      { id: 4, name: "Rahul Verma",   rating: 4, message: "The presentation is stunning and the taste is incredible. Dark Chocolate Noir is my new obsession.", submitted_at: nowIST() },
      { id: 5, name: "Ananya Singh",  rating: 5, message: "Every single flavour tells a story. Sweet Scoops is not just ice cream — it's an experience. Highly recommend!", submitted_at: nowIST() }
    ]
  });
}

// ── Auth Middleware ─────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/');
}

// ── HTML Page Routes ────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.sendFile(path.join(__dirname, '../views/login.html'));
});

app.get('/signup', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/signup.html'));
});

app.get('/home', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/home.html'));
});

app.get('/menu', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/menu.html'));
});

app.get('/contact', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/contact.html'));
});

app.get('/feedback', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/feedback.html'));
});

// ── API: Auth ───────────────────────────────────────────────────────────────
app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.json({ success: false, message: 'All fields required.' });

  const db = readDB();
  if (db.users.find(u => u.email === email))
    return res.json({ success: false, message: 'Email already registered.' });

  const hash = bcrypt.hashSync(password, 10);
  const newUser = { id: Date.now(), name, email, password: hash, created_at: nowIST() };
  db.users.push(newUser);
  writeDB(db);

  req.session.user = { id: newUser.id, name, email };
  res.json({ success: true });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.email === email);

  if (!user || !bcrypt.compareSync(password, user.password))
    return res.json({ success: false, message: 'Invalid email or password.' });

  req.session.user = { id: user.id, name: user.name, email: user.email };
  res.json({ success: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (req.session.user) res.json({ user: req.session.user });
  else res.json({ user: null });
});

// ── API: Orders ─────────────────────────────────────────────────────────────
app.post('/api/order', requireAuth, (req, res) => {
  const { item_name, quantity, price } = req.body;
  const db = readDB();
  const newOrder = {
    id: Date.now(),
    user_id: req.session.user.id,
    item_name, quantity, price,
    ordered_at: nowIST()
  };
  db.orders.push(newOrder);
  writeDB(db);
  res.json({ success: true, order_id: newOrder.id });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const db = readDB();
  const orders = db.orders
    .filter(o => o.user_id === req.session.user.id)
    .sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at));
  res.json({ orders });
});

// ── API: Contact ────────────────────────────────────────────────────────────
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message)
    return res.json({ success: false, message: 'All fields required.' });

  const db = readDB();
  db.contacts.push({ id: Date.now(), name, email, message, submitted_at: nowIST() });
  writeDB(db);
  res.json({ success: true });
});

// ── API: Feedback ───────────────────────────────────────────────────────────
app.post('/api/feedback', (req, res) => {
  const { name, rating, message } = req.body;
  if (!name || !rating || !message)
    return res.json({ success: false, message: 'All fields required.' });

  const db = readDB();
  db.feedback.unshift({ id: Date.now(), name, rating: parseInt(rating), message, submitted_at: nowIST() });
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/feedback', (req, res) => {
  const db = readDB();
  res.json({ feedback: db.feedback.slice(0, 20) });
});

app.get('/admin/db', (req, res) => {
  const db = readDB();

  const tableHTML = (title, emoji, headers, rows, emptyMsg) => {
    const headerHTML = headers.map(h => `<th>${h}</th>`).join('');
    const rowsHTML = rows.length === 0
      ? `<tr><td colspan="${headers.length}" class="empty">${emptyMsg}</td></tr>`
      : rows.map(row => `<tr>${headers.map(h => `<td>${row[h.toLowerCase().replace(/ /g,'_')] ?? '—'}</td>`).join('')}</tr>`).join('');
    return `
      <div class="card">
        <div class="card-header">
          <span class="emoji">${emoji}</span>
          <h2>${title}</h2>
          <span class="badge">${rows.length} records</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>${headerHTML}</tr></thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>
      </div>`;
  };

  // Clean users (hide passwords)
  const users = db.users.map(u => ({
    id: u.id, name: u.name, email: u.email,
    created_at: u.created_at ? new Date(u.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
 : '—'
  }));

  const orders = db.orders.map(o => ({
    id: o.id, user_id: o.user_id, item_name: o.item_name,
    quantity: o.quantity, price: o.price,
    ordered_at: o.ordered_at ? new Date(o.ordered_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
 : '—'
  }));

  const contacts = db.contacts.map(c => ({
    id: c.id, name: c.name, email: c.email,
    message: c.message?.length > 60 ? c.message.slice(0, 60) + '...' : c.message,
    submitted_at: c.submitted_at ? new Date(c.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'
  }));

  const feedback = db.feedback.map(f => ({
    id: f.id, name: f.name, rating: '★'.repeat(f.rating) + '☆'.repeat(5 - f.rating),
    message: f.message?.length > 60 ? f.message.slice(0, 60) + '...' : f.message,
    submitted_at: f.submitted_at ? new Date(f.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'
  }));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Sweet Scoops — Admin DB Viewer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      min-height: 100vh;
      padding: 40px 24px;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 48px;
    }
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }
    .header h1 span { color: #f4c430; }
    .header p { font-size: 14px; color: #666; letter-spacing: 1px; }
    .timestamp {
      display: inline-block;
      margin-top: 12px;
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      color: #888;
    }

    /* Stats row */
    .stats {
      display: flex;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-bottom: 48px;
    }
    .stat-box {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      padding: 20px 32px;
      text-align: center;
      min-width: 140px;
    }
    .stat-box .num {
      font-size: 36px;
      font-weight: 700;
      color: #f4c430;
      display: block;
    }
    .stat-box .label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }

    /* Cards */
    .card {
      background: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 32px;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px;
      background: #111;
      border-bottom: 1px solid #2a2a2a;
    }
    .emoji { font-size: 22px; }
    .card-header h2 { font-size: 18px; font-weight: 600; color: #fff; flex: 1; }
    .badge {
      background: #f4c43022;
      color: #f4c430;
      border: 1px solid #f4c43044;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    /* Table */
    .table-wrap { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    thead tr {
      background: #111;
    }
    th {
      padding: 14px 20px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #f4c430;
      font-weight: 600;
      border-bottom: 1px solid #2a2a2a;
      white-space: nowrap;
    }
    td {
      padding: 14px 20px;
      border-bottom: 1px solid #1f1f1f;
      color: #ccc;
      vertical-align: middle;
    }
    tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: #222; }

    td:first-child {
      color: #666;
      font-size: 12px;
      font-family: monospace;
    }

    .empty {
      text-align: center;
      color: #444;
      font-style: italic;
      padding: 40px !important;
    }

    /* Refresh button */
    .refresh-btn {
      display: block;
      margin: 0 auto 40px;
      background: #f4c430;
      color: #000;
      border: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 1px;
      text-decoration: none;
      text-align: center;
      width: fit-content;
    }
    .refresh-btn:hover { background: #e6b820; }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 48px;
      font-size: 12px;
      color: #333;
    }

    @media (max-width: 600px) {
      th, td { padding: 10px 12px; font-size: 13px; }
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>🍦 Sweet Scoops <span>Admin</span></h1>
    <p>DATABASE VIEWER</p>
<span class="timestamp">Last refreshed: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} </span>  </div>

  <div class="stats">
    <div class="stat-box">
      <span class="num">${db.users.length}</span>
      <span class="label">👤 Users</span>
    </div>
    <div class="stat-box">
      <span class="num">${db.orders.length}</span>
      <span class="label">🛒 Orders</span>
    </div>
    <div class="stat-box">
      <span class="num">${db.contacts.length}</span>
      <span class="label">✉️ Messages</span>
    </div>
    <div class="stat-box">
      <span class="num">${db.feedback.length}</span>
      <span class="label">⭐ Reviews</span>
    </div>
  </div>

  <a class="refresh-btn" href="/admin/db">🔄 Refresh Data</a>

  ${tableHTML('Users', '👤', ['ID', 'Name', 'Email', 'Created_at'], users, 'No users registered yet.')}
  ${tableHTML('Orders', '🛒', ['ID', 'User_id', 'Item_name', 'Quantity', 'Price', 'Ordered_at'], orders, 'No orders placed yet.')}
  ${tableHTML('Contact Messages', '✉️', ['ID', 'Name', 'Email', 'Message', 'Submitted_at'], contacts, 'No contact messages yet.')}
  ${tableHTML('Feedback & Reviews', '⭐', ['ID', 'Name', 'Rating', 'Message', 'Submitted_at'], feedback, 'No feedback submitted yet.')}

  <div class="footer">Sweet Scoops Admin Panel • ${new Date().getFullYear()}</div>

</body>
</html>`;

  res.send(html);
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🍦 Sweet Scoops running at http://localhost:${PORT}`));
