const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database/db');
const recipeRoutes = require('./routes/recipes');

const app = express();
const PORT = process.env.PORT || 8003;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize database
db.initialize();

// API Routes
app.use('/api/recipes', recipeRoutes);

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
