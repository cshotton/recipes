const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use external volume if in Docker, otherwise use project root
const dataDir = process.env.NODE_ENV === 'production' 
  ? '/app/recipes-data'
  : path.join(__dirname, '../../');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'recipes.db');
const db = new sqlite3.Database(dbPath);

const initialize = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'unknown',
        description TEXT,
        ingredients TEXT,
        instructions TEXT,
        prepTime INTEGER,
        cookTime INTEGER,
        servings INTEGER,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });
};

const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const close = (callback) => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
      callback(err);
    } else {
      callback(null);
    }
  });
};

module.exports = { db, initialize, run, get, all, close };
