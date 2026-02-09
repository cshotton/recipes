const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const { run, get, all } = require('../database/db');

const router = express.Router();

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

// Create recipe
router.post('/', async (req, res) => {
  const { title, description, ingredients, instructions, prepTime, cookTime, servings } = req.body;
  
  if (!title || !ingredients || !instructions) {
    return res.status(400).json({ error: 'Title, ingredients, and instructions are required' });
  }

  try {
    const result = await run(
      `INSERT INTO recipes (title, description, ingredients, instructions, prepTime, cookTime, servings) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, description, ingredients, instructions, prepTime, cookTime, servings]
    );
    res.status(201).json({ id: result.lastID, message: 'Recipe created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update recipe
router.put('/:id', async (req, res) => {
  const { title, description, ingredients, instructions, prepTime, cookTime, servings } = req.body;

  try {
    await run(
      `UPDATE recipes SET title = ?, description = ?, ingredients = ?, instructions = ?, 
       prepTime = ?, cookTime = ?, servings = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      [title, description, ingredients, instructions, prepTime, cookTime, servings, req.params.id]
    );
    res.json({ message: 'Recipe updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete recipe
router.delete('/:id', async (req, res) => {
  try {
    await run('DELETE FROM recipes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Recipe deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Import recipes from CSV
router.post('/import/csv', upload.single('file'), async (req, res) => {
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
            category = category ? category.trim() : '';
            notes = notes ? notes.trim() : '';
            servings = servings ? servings.trim() : null;

            if (!title || !ingredients || !instructions) {
              errorCount++;
              errors.push(`Row ${i + 1}: Missing required fields (title, ingredients, or instructions)`);
              continue;
            }

            // Parse servings - extract just the number if it's something like "6 " or "8+"
            let parsedServings = null;
            if (servings) {
              const match = servings.match(/\d+/);
              parsedServings = match ? parseInt(match[0]) : null;
            }

            // Combine category and notes for description
            let description = '';
            if (category) description += `[${category}] `;
            if (notes) description += notes;
            description = description.trim() || null;

            await run(
              `INSERT INTO recipes (title, description, ingredients, instructions, servings) 
               VALUES (?, ?, ?, ?, ?)`,
              [title, description, ingredients, instructions, parsedServings]
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
