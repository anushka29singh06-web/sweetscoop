# 🍦 Sweet Scoops — Luxury Ice Cream Website

A full-stack premium ice cream website built with HTML, CSS, JavaScript, Node.js, Express, and SQLite.

---

## 📁 Project Structure

```
sweet-scoops/
├── backend/
│   └── server.js          ← Node.js + Express backend
├── public/
│   ├── css/
│   │   └── global.css     ← Shared styles (luxury dark gold theme)
│   └── js/
│       └── navbar.js      ← Shared navbar + utilities
├── views/
│   ├── login.html         ← Login / Sign Up page
│   ├── home.html          ← Home page with hero & brand story
│   ├── menu.html          ← Menu with 12 flavours & cart
│   ├── contact.html       ← Contact form
│   └── feedback.html      ← Feedback & reviews
├── package.json
└── README.md
```

---

## 🚀 How to Run

### Step 1 — Install Node.js
Download from https://nodejs.org (choose LTS version)

### Step 2 — Open this folder in terminal/command prompt
```
cd sweet-scoops
```

### Step 3 — Install dependencies
```
npm install
```

### Step 4 — Start the server
```
npm start
```

### Step 5 — Open your browser
```
http://localhost:3000
```

---

## 🌟 Features

### Pages
- **Login / Sign Up** — Animated split-screen auth with tab switching
- **Home** — Full hero, animated stats counter, brand story, featured flavours
- **Menu** — 12 premium ice cream cards with filter tabs, add to cart, cart panel
- **Contact** — Contact form with subject selector, success message
- **Feedback** — Star ratings, review submission, live review wall with rating bars

### Backend (Node.js + Express + SQLite)
| Endpoint | Method | Description |
|---|---|---|
| `/api/signup` | POST | Register new user |
| `/api/login` | POST | Login existing user |
| `/api/logout` | POST | Logout |
| `/api/me` | GET | Get current user |
| `/api/order` | POST | Place an order |
| `/api/orders` | GET | Get user's orders |
| `/api/contact` | POST | Submit contact form |
| `/api/feedback` | POST | Submit feedback |
| `/api/feedback` | GET | Get all feedback |

### Database Tables (SQLite — auto-created)
- `users` — id, name, email, password (hashed), created_at
- `orders` — id, user_id, item_name, quantity, price, ordered_at
- `contacts` — id, name, email, message, submitted_at
- `feedback` — id, name, rating, message, submitted_at

---

## 🎨 Design

- **Aesthetic**: Luxury dark gold — deep blacks, rich gold accents
- **Fonts**: Cormorant Garamond (display) + Josefin Sans (body) + Great Vibes (logo)
- **Animations**: Floating elements, scroll fade-ins, counter animations, shimmer effects
- **Theme**: Fully dark, premium luxury ice cream brand

---

## 🔒 Security
- Passwords hashed with bcryptjs
- Session-based authentication
- Protected routes redirect to login

---

Built for BCA 4th Semester Project 🎓
