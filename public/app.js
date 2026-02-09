const API_URL = '/api/recipes';

// DOM Elements
const viewAllBtn = document.getElementById('viewAllBtn');
const addRecipeBtn = document.getElementById('addRecipeBtn');
const importBtn = document.getElementById('importBtn');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const cardViewBtn = document.getElementById('cardViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const cancelBtn = document.getElementById('cancelBtn');
const backBtn = document.getElementById('backBtn');
const importCancelBtn = document.getElementById('importCancelBtn');
const recipeForm = document.getElementById('recipeForm');
const importForm = document.getElementById('importForm');

const listView = document.getElementById('listView');
const formView = document.getElementById('formView');
const detailView = document.getElementById('detailView');
const importView = document.getElementById('importView');

const recipesList = document.getElementById('recipesList');
const recipeDetail = document.getElementById('recipeDetail');
const loginBtn = document.getElementById('loginBtn');

let currentEditId = null;
let currentViewMode = 'card'; // 'card' or 'list'
let currentSearchQuery = '';

// View Management
function showView(view) {
    listView.classList.add('hidden');
    formView.classList.add('hidden');
    detailView.classList.add('hidden');
    importView.classList.add('hidden');
    view.classList.remove('hidden');
}

function setNavActive(btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// Event Listeners
viewAllBtn.addEventListener('click', () => {
    setNavActive(viewAllBtn);
    showView(listView);
    loadRecipes();
});

addRecipeBtn.addEventListener('click', () => {
    currentEditId = null;
    recipeForm.reset();
    document.getElementById('formTitle').textContent = 'Add New Recipe';
    showView(formView);
});

cancelBtn.addEventListener('click', () => {
    showView(listView);
    loadRecipes();
});

backBtn.addEventListener('click', () => {
    showView(listView);
    loadRecipes();
});

recipeForm.addEventListener('submit', saveRecipe);

importBtn.addEventListener('click', () => {
    importForm.reset();
    document.getElementById('importProgress').classList.add('hidden');
    document.getElementById('importResult').classList.add('hidden');
    showView(importView);
});

importCancelBtn.addEventListener('click', () => {
    showView(listView);
    loadRecipes();
});

importForm.addEventListener('submit', importRecipesFromCSV);

// View Toggle
cardViewBtn.addEventListener('click', () => {
    currentViewMode = 'card';
    cardViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
    loadRecipes();
});

listViewBtn.addEventListener('click', () => {
    currentViewMode = 'list';
    listViewBtn.classList.add('active');
    cardViewBtn.classList.remove('active');
    loadRecipes();
});

// Search
searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim();
    if (currentSearchQuery) {
        clearSearchBtn.classList.remove('hidden');
        searchRecipes(currentSearchQuery);
    } else {
        clearSearchBtn.classList.add('hidden');
        loadRecipes();
    }
});

// Authentication state (cached)
let authState = false;

function isAuthenticated() {
    return authState === true;
}

// Update UI by querying server-side auth status
async function updateAuthUI() {
    try {
        const resp = await fetch('/api/auth/status', { credentials: 'same-origin' });
        if (resp.ok) {
            const body = await resp.json();
            authState = !!body.authed;
        } else {
            authState = false;
        }
    } catch (err) {
        authState = false;
    }

    if (addRecipeBtn) addRecipeBtn.style.display = authState ? '' : 'none';
    if (importBtn) importBtn.style.display = authState ? '' : 'none';
    if (loginBtn) loginBtn.textContent = authState ? 'Logout' : 'Login';
}

// Login/Logout button behaviour
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        if (!isAuthenticated()) {
            // redirect to login page
            window.location.href = '/login';
            return;
        }

        // perform logout
        try {
            await fetch('/logout', { method: 'GET', credentials: 'same-origin' });
        } catch (err) {
            console.error('Logout failed', err);
        }
        await updateAuthUI();
        loadRecipes();
    });
}

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.classList.add('hidden');
    loadRecipes();
});

// Load and Display Recipes
async function loadRecipes() {
    try {
        const response = await fetch(API_URL);
        const recipes = await response.json();
        displayRecipes(recipes);
    } catch (error) {
        console.error('Error loading recipes:', error);
        recipesList.innerHTML = '<div class="empty-state"><h2>Error</h2><p>Could not load recipes</p></div>';
    }
}

// Search Recipes
async function searchRecipes(query) {
    try {
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
        const recipes = await response.json();
        displayRecipes(recipes);
    } catch (error) {
        console.error('Error searching recipes:', error);
        recipesList.innerHTML = '<div class="empty-state"><h2>Error</h2><p>Could not search recipes</p></div>';
    }
}

function displayRecipes(recipes) {
    if (recipes.length === 0) {
        recipesList.innerHTML = `
            <div class="empty-state">
                <h2>No recipes yet</h2>
                <p>Click "Add Recipe" to create your first recipe!</p>
            </div>
        `;
        return;
    }

    if (currentViewMode === 'list') {
        recipesList.className = 'recipes-list';
        recipesList.innerHTML = recipes.map(recipe => `
            <div class="recipe-list-item" onclick="viewRecipeDetail(${recipe.id})">
                <div class="recipe-list-info">
                    <h3>${escapeHtml(recipe.title)}</h3>
                    ${recipe.category ? `<p><strong>Category:</strong> ${escapeHtml(recipe.category)}</p>` : ''}
                    <div class="recipe-list-meta">
                        ${recipe.prepTime ? `<span>⏱️ Prep: ${recipe.prepTime}m</span>` : ''}
                        ${recipe.cookTime ? `<span>🔥 Cook: ${recipe.cookTime}m</span>` : ''}
                        ${recipe.servings ? `<span>👥 ${recipe.servings} servings</span>` : ''}
                    </div>
                </div>
                ${isAuthenticated() ? `<div class="recipe-list-actions">
                    <button class="edit" onclick="event.stopPropagation(); editRecipe(${recipe.id})">Edit</button>
                    <button class="delete" onclick="event.stopPropagation(); deleteRecipe(${recipe.id})">Delete</button>
                </div>` : ''}
            </div>
        `).join('');
    } else {
        recipesList.className = 'recipes-grid';
        recipesList.innerHTML = recipes.map(recipe => `
            <div class="recipe-card" onclick="viewRecipeDetail(${recipe.id})">
                <h3>${escapeHtml(recipe.title)}</h3>
                ${recipe.category ? `<p><strong>Category:</strong> ${escapeHtml(recipe.category)}</p>` : ''}
                <p>${recipe.description ? escapeHtml(recipe.description) : 'No description'}</p>
                <div class="recipe-meta">
                    ${recipe.prepTime ? `<span>⏱️ Prep: ${recipe.prepTime}m</span>` : ''}
                    ${recipe.cookTime ? `<span>🔥 Cook: ${recipe.cookTime}m</span>` : ''}
                    ${recipe.servings ? `<span>👥 ${recipe.servings} servings</span>` : ''}
                </div>
                ${isAuthenticated() ? `<div class="recipe-actions">
                    <button class="edit" onclick="event.stopPropagation(); editRecipe(${recipe.id})">Edit</button>
                    <button class="delete" onclick="event.stopPropagation(); deleteRecipe(${recipe.id})">Delete</button>
                </div>` : ''}
            </div>
        `).join('');
    }
}

// View Recipe Detail
async function viewRecipeDetail(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const recipe = await response.json();
        
        const ingredients = recipe.ingredients.split('\n').filter(i => i.trim());
        const instructions = recipe.instructions.split('\n').filter(i => i.trim());

        recipeDetail.innerHTML = `
            <div>
                <h2>${escapeHtml(recipe.title)}</h2>
                ${recipe.description ? `<p><strong>Description:</strong> ${escapeHtml(recipe.description)}</p>` : ''}
                
                <div class="recipe-info">
                    ${recipe.prepTime ? `<div class="info-item"><strong>${recipe.prepTime}</strong><span>Prep Time (min)</span></div>` : ''}
                    ${recipe.cookTime ? `<div class="info-item"><strong>${recipe.cookTime}</strong><span>Cook Time (min)</span></div>` : ''}
                    ${recipe.servings ? `<div class="info-item"><strong>${recipe.servings}</strong><span>Servings</span></div>` : ''}
                </div>

                <h3>Ingredients</h3>
                <ul>
                    ${ingredients.map(ing => `<li>${escapeHtml(ing)}</li>`).join('')}
                </ul>

                <h3>Instructions</h3>
                <ol>
                    ${instructions.map(inst => `<li>${escapeHtml(inst)}</li>`).join('')}
                </ol>

                ${isAuthenticated() ? `<div class="detail-actions">
                    <button class="btn btn-primary" onclick="editRecipe(${recipe.id})">Edit</button>
                    <button class="btn btn-danger" onclick="deleteRecipe(${recipe.id})">Delete</button>
                </div>` : ''}
            </div>
        `;
        
        showView(detailView);
    } catch (error) {
        console.error('Error loading recipe:', error);
        alert('Could not load recipe');
    }
}

// Edit Recipe
async function editRecipe(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const recipe = await response.json();
        
        currentEditId = id;
        document.getElementById('formTitle').textContent = 'Edit Recipe';
        document.getElementById('title').value = recipe.title;
        document.getElementById('description').value = recipe.description || '';
        document.getElementById('ingredients').value = recipe.ingredients;
        document.getElementById('instructions').value = recipe.instructions;
        document.getElementById('prepTime').value = recipe.prepTime || '';
        document.getElementById('cookTime').value = recipe.cookTime || '';
        document.getElementById('servings').value = recipe.servings || '';
        
        showView(formView);
    } catch (error) {
        console.error('Error loading recipe:', error);
        alert('Could not load recipe for editing');
    }
}

// Save Recipe
async function saveRecipe(e) {
    e.preventDefault();

    const data = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        ingredients: document.getElementById('ingredients').value,
        instructions: document.getElementById('instructions').value,
        prepTime: document.getElementById('prepTime').value || null,
        cookTime: document.getElementById('cookTime').value || null,
        servings: document.getElementById('servings').value || null,
    };

    try {
        const url = currentEditId ? `${API_URL}/${currentEditId}` : API_URL;
        const method = currentEditId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to save recipe');

        alert(currentEditId ? 'Recipe updated!' : 'Recipe added!');
        currentEditId = null;
        showView(listView);
        loadRecipes();
    } catch (error) {
        console.error('Error saving recipe:', error);
        alert('Error saving recipe');
    }
}

// Delete Recipe
async function deleteRecipe(id) {
    if (!confirm('Are you sure you want to delete this recipe?')) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete recipe');

        alert('Recipe deleted!');
        showView(listView);
        loadRecipes();
    } catch (error) {
        console.error('Error deleting recipe:', error);
        alert('Error deleting recipe');
    }
}

// Utility: Escape HTML
function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Import recipes from CSV
async function importRecipesFromCSV(e) {
    e.preventDefault();

    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a CSV file');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        document.getElementById('importProgress').classList.remove('hidden');
        document.getElementById('importResult').classList.add('hidden');

        const response = await fetch('/api/recipes/import/csv', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        document.getElementById('importProgress').classList.add('hidden');
        document.getElementById('importResult').classList.remove('hidden');
        const resultContent = document.getElementById('importResultContent');

        if (response.ok) {
            resultContent.innerHTML = `
                <div class="import-result-item" style="font-weight: bold; color: #155724;">
                    ✓ ${result.message}
                </div>
                <div class="import-result-item">
                    ${result.importedCount} recipes imported
                </div>
                ${result.errorCount > 0 ? `<div class="import-result-item">
                    ${result.errorCount} errors
                </div>` : ''}
                ${result.errors && result.errors.length > 0 ? `
                    <div class="import-errors">
                        <strong>Error Details:</strong>
                        <ul class="error-list">
                            ${result.errors.map(err => `<li>${escapeHtml(err)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            `;
            document.getElementById('importResult').classList.add('success');
            
            setTimeout(() => {
                showView(listView);
                loadRecipes();
            }, 2000);
        } else {
            resultContent.innerHTML = `<div class="import-result-item">❌ Error: ${escapeHtml(result.error)}</div>`;
            document.getElementById('importResult').classList.add('error');
        }
    } catch (error) {
        console.error('Error importing recipes:', error);
        document.getElementById('importProgress').classList.add('hidden');
        document.getElementById('importResult').classList.remove('hidden');
        document.getElementById('importResultContent').innerHTML = `<div class="import-result-item">❌ Error: ${escapeHtml(error.message)}</div>`;
        document.getElementById('importResult').classList.add('error');
    }
}

// Initialize
updateAuthUI();
loadRecipes();
