const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { run, get, all } = require('../database/db');

const router = express.Router();

// Require auth for write operations
function requireAuth(req, res, next) {
  if (req.cookies && req.cookies.recipes_auth === 'authed') return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Get all recipes
router.get('/', async (req, res) => {
  try {
    const recipes = await all('SELECT * FROM recipes ORDER BY createdAt DESC');
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search recipes
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.json([]);
    }

    const searchTerm = `%${query}%`;
    const recipes = await all(
      `SELECT * FROM recipes 
       WHERE LOWER(title) LIKE LOWER(?) 
       OR LOWER(ingredients) LIKE LOWER(?) 
       ORDER BY createdAt DESC`,
      [searchTerm, searchTerm]
    );
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get distinct categories
router.get('/categories', async (req, res) => {
  try {
    const rows = await all(
      `SELECT DISTINCT category FROM recipes WHERE category IS NOT NULL AND TRIM(category) <> '' ORDER BY LOWER(category) ASC`
    );
    const categories = rows.map(r => r.category);
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single recipe
router.get('/:id', async (req, res) => {
  try {
    const recipe = await get('SELECT * FROM recipes WHERE id = ?', [req.params.id]);
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create recipe (protected)
router.post('/', requireAuth, async (req, res) => {
  const { title, category, description, ingredients, instructions, prepTime, cookTime, servings } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await run(
      `INSERT INTO recipes (title, category, description, ingredients, instructions, prepTime, cookTime, servings) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, category || 'unknown', description || null, ingredients || null, instructions || null, prepTime || null, cookTime || null, servings || null]
    );
    res.status(201).json({ id: result.lastID, message: 'Recipe created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update recipe (protected)
router.put('/:id', requireAuth, async (req, res) => {
  const { title, category, description, ingredients, instructions, prepTime, cookTime, servings } = req.body;

  try {
    await run(
      `UPDATE recipes SET title = ?, category = ?, description = ?, ingredients = ?, instructions = ?, 
       prepTime = ?, cookTime = ?, servings = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [title || null, category || 'unknown', description || null, ingredients || null, instructions || null, prepTime || null, cookTime || null, servings || null, req.params.id]
    );
    res.json({ message: 'Recipe updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete recipe (protected)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await run('DELETE FROM recipes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Recipe deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import recipes from CSV (protected) - check auth before accepting upload
router.post('/import/csv', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const filePath = req.file.path;
  const results = [];
  let importedCount = 0;
  let errorCount = 0;
  const errors = [];

  fs.createReadStream(filePath)
    .pipe(csv(['category', 'title', 'servings', 'ingredients', 'instructions', 'notes']))
    .on('data', (data) => {
      results.push(data);
    })
    .on('end', async () => {
      try {
        for (let i = 0; i < results.length; i++) {
          try {
            const row = results[i];
            let { category, title, servings, ingredients, instructions, notes } = row;

            // Clean up whitespace
            title = title ? title.trim() : '';
            ingredients = ingredients ? ingredients.trim() : '';
            instructions = instructions ? instructions.trim() : '';
            category = category ? category.trim() : 'unknown';
            notes = notes ? notes.trim() : '';
            servings = servings ? servings.trim() : null;

            if (!title) {
              errorCount++;
              errors.push(`Row ${i + 1}: Missing required field (title)`);
              continue;
            }

            // Replace \n sequences with actual newlines
            ingredients = ingredients.replace(/\\n/g, '\n');
            instructions = instructions.replace(/\\n/g, '\n');
            notes = notes.replace(/\\n/g, '\n');

            // Parse servings - extract just the number if it's something like "6 " or "8+"
            let parsedServings = null;
            if (servings) {
              const match = servings.match(/\d+/);
              parsedServings = match ? parseInt(match[0]) : null;
            }

            // Combine notes with description if notes exist
            let description = notes || null;

            await run(
              `INSERT INTO recipes (title, category, description, ingredients, instructions, servings) 
               VALUES (?, ?, ?, ?, ?, ?)`,
              [title, category, description, ingredients || null, instructions || null, parsedServings]
            );
            importedCount++;
          } catch (err) {
            errorCount++;
            errors.push(`Row ${i + 1}: ${err.message}`);
          }
        }

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        res.json({
          message: `Import completed. ${importedCount} recipes imported, ${errorCount} errors.`,
          importedCount,
          errorCount,
          errors: errors.length > 0 ? errors : undefined
        });
      } catch (err) {
        fs.unlinkSync(filePath);
        res.status(500).json({ error: err.message });
      }
    })
    .on('error', (err) => {
      fs.unlinkSync(filePath);
      res.status(400).json({ error: `CSV parsing error: ${err.message}` });
    });
});

module.exports = router;
