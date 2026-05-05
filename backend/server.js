const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');
const app = express();

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

// ── SQLite Database ─────────────────────────────────────────────────────────
const db = new sqlite3.Database(path.join(__dirname, 'sweetscoops.db'));

db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Orders table
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    price INTEGER NOT NULL,
    ordered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Contact messages
  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Feedback table
  db.run(`CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    message TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Seed feedback
  db.get("SELECT COUNT(*) as c FROM feedback", (err, row) => {
    if (row && row.c === 0) {
      const seeded = [
        ["Priya Sharma", 5, "Absolutely divine! The Mango Bliss is life-changing. The texture, the richness — pure luxury in every scoop."],
        ["Arjun Mehta", 5, "Sweet Scoops has ruined every other ice cream for me. Nothing compares. The Rose Petal flavour is a dream."],
        ["Sneha Kapoor", 5, "Came here for the Pistachio Royale and stayed for everything else. The ambiance matches the premium quality perfectly."],
        ["Rahul Verma", 4, "The presentation is stunning and the taste is incredible. Dark Chocolate Noir is my new obsession."],
        ["Ananya Singh", 5, "Every single flavour tells a story. Sweet Scoops is not just ice cream — it's an experience. Highly recommend!"]
      ];
      const stmt = db.prepare("INSERT INTO feedback (name, rating, message) VALUES (?, ?, ?)");
      seeded.forEach(f => stmt.run(f));
      stmt.finalize();
    }
  });
});

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

  const hash = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, hash],
    function(err) {
      if (err) return res.json({ success: false, message: 'Email already registered.' });
      req.session.user = { id: this.lastID, name, email };
      res.json({ success: true });
    });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.json({ success: false, message: 'Invalid email or password.' });
    req.session.user = { id: user.id, name: user.name, email: user.email };
    res.json({ success: true });
  });
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
  const user_id = req.session.user.id;
  db.run('INSERT INTO orders (user_id, item_name, quantity, price) VALUES (?, ?, ?, ?)',
    [user_id, item_name, quantity, price],
    function(err) {
      if (err) return res.json({ success: false });
      res.json({ success: true, order_id: this.lastID });
    });
});

app.get('/api/orders', requireAuth, (req, res) => {
  db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY ordered_at DESC',
    [req.session.user.id],
    (err, rows) => res.json({ orders: rows || [] }));
});

// ── API: Contact ────────────────────────────────────────────────────────────
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message)
    return res.json({ success: false, message: 'All fields required.' });
  db.run('INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)',
    [name, email, message],
    (err) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    });
});

// ── API: Feedback ───────────────────────────────────────────────────────────
app.post('/api/feedback', (req, res) => {
  const { name, rating, message } = req.body;
  if (!name || !rating || !message)
    return res.json({ success: false, message: 'All fields required.' });
  db.run('INSERT INTO feedback (name, rating, message) VALUES (?, ?, ?)',
    [name, rating, message],
    (err) => {
      if (err) return res.json({ success: false });
      res.json({ success: true });
    });
});

app.get('/api/feedback', (req, res) => {
  db.all('SELECT * FROM feedback ORDER BY submitted_at DESC LIMIT 20', (err, rows) => {
    res.json({ feedback: rows || [] });
  });
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(3000, () => console.log('🍦 Sweet Scoops running at http://localhost:3000'));
