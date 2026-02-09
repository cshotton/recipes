const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const db = require('./database/db');
const recipeRoutes = require('./routes/recipes');

const app = express();
const PORT = process.env.PORT || 8003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Public login page (allow without auth)
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Login handler (form POST)
app.post('/login', (req, res) => {
  const password = req.body.password;
  if (password === 'maple') {
    // set cookie valid for 1 year
    const oneYear = 1000 * 60 * 60 * 24 * 365;
    res.cookie('recipes_auth', 'authed', { maxAge: oneYear, httpOnly: false });
    return res.redirect('/');
  }
  // Bad password: redirect back to login with query
  return res.redirect('/login?error=1');
});

// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('recipes_auth');
  res.redirect('/login');
});

// Note: frontend is public — do not redirect unauthenticated users to /login here.
// Read-only access is handled by allowing public access to static files and
// protecting write APIs at the route level.

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Initialize database
db.initialize();

// API Routes (route-level auth applied in routes where needed)
app.use('/api/recipes', recipeRoutes);

// Auth status endpoint for frontend to query authentication state
app.get('/api/auth/status', (req, res) => {
  const authed = req.cookies && req.cookies.recipes_auth === 'authed';
  res.json({ authed });
});

// Serve frontend (root)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
