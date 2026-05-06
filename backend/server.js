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

// Seed default feedback on first run
if (!fs.existsSync(DB_FILE)) {
  writeDB({
    users: [],
    orders: [],
    contacts: [],
    feedback: [
      { id: 1, name: "Priya Sharma",  rating: 5, message: "Absolutely divine! The Mango Bliss is life-changing. The texture, the richness — pure luxury in every scoop.", submitted_at: new Date().toISOString() },
      { id: 2, name: "Arjun Mehta",   rating: 5, message: "Sweet Scoops has ruined every other ice cream for me. Nothing compares. The Rose Petal flavour is a dream.", submitted_at: new Date().toISOString() },
      { id: 3, name: "Sneha Kapoor",  rating: 5, message: "Came here for the Pistachio Royale and stayed for everything else. The ambiance matches the premium quality perfectly.", submitted_at: new Date().toISOString() },
      { id: 4, name: "Rahul Verma",   rating: 4, message: "The presentation is stunning and the taste is incredible. Dark Chocolate Noir is my new obsession.", submitted_at: new Date().toISOString() },
      { id: 5, name: "Ananya Singh",  rating: 5, message: "Every single flavour tells a story. Sweet Scoops is not just ice cream — it's an experience. Highly recommend!", submitted_at: new Date().toISOString() }
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
  const newUser = { id: Date.now(), name, email, password: hash, created_at: new Date().toISOString() };
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
    ordered_at: new Date().toISOString()
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
  db.contacts.push({ id: Date.now(), name, email, message, submitted_at: new Date().toISOString() });
  writeDB(db);
  res.json({ success: true });
});

// ── API: Feedback ───────────────────────────────────────────────────────────
app.post('/api/feedback', (req, res) => {
  const { name, rating, message } = req.body;
  if (!name || !rating || !message)
    return res.json({ success: false, message: 'All fields required.' });

  const db = readDB();
  db.feedback.unshift({ id: Date.now(), name, rating: parseInt(rating), message, submitted_at: new Date().toISOString() });
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/feedback', (req, res) => {
  const db = readDB();
  res.json({ feedback: db.feedback.slice(0, 20) });
});

// ── Start ───────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🍦 Sweet Scoops running at http://localhost:${PORT}`));
