const API_URL = '/api/recipes';

// DOM Elements
const addRecipeBtn = document.getElementById('addRecipeBtn');
const importBtn = document.getElementById('importBtn');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const sortSelect = document.getElementById('sortSelect');
const categoryFilter = document.getElementById('categoryFilter');
const cardViewBtn = document.getElementById('cardViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const cancelBtn = document.getElementById('cancelBtn');
const backBtn = document.getElementById('backBtn');
const importCancelBtn = document.getElementById('importCancelBtn');
const recipeForm = document.getElementById('recipeForm');
const importForm = document.getElementById('importForm');
const categorySelect = document.getElementById('category');
const shareBtn = document.getElementById('shareBtn');

const listView = document.getElementById('listView');
const formView = document.getElementById('formView');
const detailView = document.getElementById('detailView');
const importView = document.getElementById('importView');
const navBar = document.querySelector('.nav');

const recipesList = document.getElementById('recipesList');
const recipeDetail = document.getElementById('recipeDetail');
const detailActions = document.getElementById('detailActions');
const loginBtn = document.getElementById('loginBtn');

let currentEditId = null;
let currentViewMode = 'card'; // 'card' or 'list'
let currentSearchQuery = '';
let currentSortKey = 'title';
let currentCategoryFilter = 'all';
let currentDetailId = null;
let listScrollPosition = 0; // Track scroll position for returning to list
let toastHideTimer = null;

// View Management
function showView(view) {
    listView.classList.add('hidden');
    formView.classList.add('hidden');
    detailView.classList.add('hidden');
    importView.classList.add('hidden');
    view.classList.remove('hidden');

    if (navBar) {
        navBar.style.display = view === detailView ? 'none' : 'flex';
    }

    if (view !== detailView) {
        setRecipeParam(null);
    }
}

function getRecipeIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('recipe');
    return id ? parseInt(id, 10) : null;
}

function setRecipeParam(id) {
    const url = new URL(window.location.href);
    if (id) {
        url.searchParams.set('recipe', id.toString());
    } else {
        url.searchParams.delete('recipe');
    }
    window.history.replaceState({}, '', url.toString());
}

function setNavActive(btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

addRecipeBtn.addEventListener('click', () => {
    currentEditId = null;
    recipeForm.reset();
    document.getElementById('formTitle').textContent = 'Add New Recipe';
    if (categorySelect) {
        categorySelect.value = 'unknown';
    }
    showView(formView);
});

cancelBtn.addEventListener('click', () => {
    showView(listView);
    refreshList();
});

backBtn.addEventListener('click', () => {
    showView(listView);
    refreshList();
});

if (shareBtn) {
    shareBtn.addEventListener('click', () => {
        if (currentDetailId) {
            shareRecipe(currentDetailId);
        }
    });
}

recipeForm.addEventListener('submit', saveRecipe);

importBtn.addEventListener('click', () => {
    importForm.reset();
    document.getElementById('importProgress').classList.add('hidden');
    document.getElementById('importResult').classList.add('hidden');
    showView(importView);
});

importCancelBtn.addEventListener('click', () => {
    showView(listView);
    refreshList();
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
            // Set page title from siteName
            if (body.siteName) {
                document.title = body.siteName;
                const titleElement = document.querySelector('.header-bar h1');
                if (titleElement) {
                    titleElement.textContent = body.siteName;
                }
            }
            // Set version in footer
            if (body.version) {
                const versionElement = document.getElementById('versionInfo');
                if (versionElement) {
                    versionElement.textContent = `${body.siteName} v${body.version}`;
                }
            }
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
        // Reset to card view and update UI
        currentViewMode = 'card';
        cardViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        currentEditId = null;
        await updateAuthUI();
        loadRecipes();
        showView(listView);
    });
}

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.classList.add('hidden');
    loadRecipes();
});

// Sort
if (sortSelect) {
    sortSelect.addEventListener('change', () => {
        currentSortKey = sortSelect.value || 'title';
        if (currentSearchQuery) {
            searchRecipes(currentSearchQuery);
        } else {
            loadRecipes();
        }
    });
}

// Category filter
if (categoryFilter) {
    categoryFilter.addEventListener('change', () => {
        currentCategoryFilter = categoryFilter.value || 'all';
        if (currentSearchQuery) {
            searchRecipes(currentSearchQuery);
        } else {
            loadRecipes();
        }
    });
}

// Load and Display Recipes
async function loadRecipes() {
    try {
        const response = await fetch(API_URL);
        const recipes = await response.json();
        const filtered = filterRecipesByCategory(recipes);
        displayRecipes(sortRecipes(filtered));
    } catch (error) {
        console.error('Error loading recipes:', error);
        recipesList.innerHTML = '<div class="empty-state"><h2>Error</h2><p>Could not load recipes</p></div>';
    }
}

function refreshList() {
    if (currentSearchQuery) {
        searchRecipes(currentSearchQuery);
    } else {
        loadRecipes();
    }
    // Restore scroll position after returning from detail view
    setTimeout(() => {
        window.scrollTo({ top: listScrollPosition, behavior: 'auto' });
    }, 0);
}

// Search Recipes
async function searchRecipes(query) {
    try {
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
        const recipes = await response.json();
        const filtered = filterRecipesByCategory(recipes);
        displayRecipes(sortRecipes(filtered));
    } catch (error) {
        console.error('Error searching recipes:', error);
        recipesList.innerHTML = '<div class="empty-state"><h2>Error</h2><p>Could not search recipes</p></div>';
    }
}

function filterRecipesByCategory(recipes) {
    const selected = currentCategoryFilter || 'all';
    if (selected === 'all') return recipes;
    return recipes.filter(r => (r.category || '').toString().toLowerCase() === selected.toLowerCase());
}

function sortRecipes(recipes) {
    const key = currentSortKey || 'title';
    return [...recipes].sort((a, b) => {
        const aVal = (a[key] || '').toString().toLowerCase();
        const bVal = (b[key] || '').toString().toLowerCase();
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
    });
}

async function loadCategories() {
    if (!categoryFilter) return;
    try {
        const resp = await fetch('/api/recipes/categories');
        if (!resp.ok) return;
        const categories = await resp.json();

        const options = ['all', ...categories];
        categoryFilter.innerHTML = options.map(cat => {
            const label = cat === 'all' ? 'All Categories' : cat;
            return `<option value="${escapeHtml(cat)}">${escapeHtml(label)}</option>`;
        }).join('');

        categoryFilter.value = currentCategoryFilter || 'all';

        if (categorySelect) {
            const formOptions = ['unknown', ...categories.filter(c => c.toLowerCase() !== 'unknown')];
            categorySelect.innerHTML = formOptions.map(cat => {
                const label = cat === 'unknown' ? 'Unknown' : cat;
                return `<option value="${escapeHtml(cat)}">${escapeHtml(label)}</option>`;
            }).join('');
            if (!categorySelect.value) categorySelect.value = 'unknown';
        }
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

function ensureCategoryOption(category) {
    if (!categorySelect) return;
    const value = (category || 'unknown').toString();
    const exists = Array.from(categorySelect.options).some(opt => opt.value === value);
    if (!exists) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        categorySelect.appendChild(option);
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
            </div>
        `).join('');
    }
}

// View Recipe Detail
async function viewRecipeDetail(id) {
    try {
        // Save scroll position before navigating away from list
        listScrollPosition = window.scrollY;
        
        const response = await fetch(`${API_URL}/${id}`);
        const recipe = await response.json();
        currentDetailId = recipe.id;
        
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
            </div>
        `;

        // Set edit/delete buttons in the top row
        detailActions.innerHTML = isAuthenticated() ? `
            <button class="btn icon-btn" onclick="editRecipe(${recipe.id})" title="Edit">✏️</button>
            <button class="btn icon-btn" onclick="deleteRecipe(${recipe.id})" title="Delete">🗑️</button>
        ` : '';

        showView(detailView);
        setRecipeParam(recipe.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading recipe:', error);
        alert('Could not load recipe');
    }
}

async function shareRecipe(id) {
    const url = new URL(window.location.href);
    url.searchParams.set('recipe', id.toString());

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(url.toString());
            showToast('Recipe link copied to clipboard');
        } else {
            throw new Error('Clipboard unavailable');
        }
    } catch (err) {
        prompt('Copy this link to share the recipe:', url.toString());
    }
}

function showToast(message) {
    let toast = document.getElementById('copyToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'copyToast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('show');

    if (toastHideTimer) {
        clearTimeout(toastHideTimer);
    }

    toastHideTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 1500);
}

// Edit Recipe
async function editRecipe(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        const recipe = await response.json();

        const normalizeTextAreaValue = (value) => {
            if (!value) return '';
            return value
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/\r\n/g, '\n');
        };
        
        currentEditId = id;
        document.getElementById('formTitle').textContent = 'Edit Recipe';
        document.getElementById('title').value = recipe.title;
        document.getElementById('description').value = normalizeTextAreaValue(recipe.description);
        document.getElementById('ingredients').value = normalizeTextAreaValue(recipe.ingredients);
        document.getElementById('instructions').value = normalizeTextAreaValue(recipe.instructions);
        document.getElementById('prepTime').value = recipe.prepTime || '';
        document.getElementById('cookTime').value = recipe.cookTime || '';
        document.getElementById('servings').value = recipe.servings || '';
        if (categorySelect) {
            ensureCategoryOption(recipe.category || 'unknown');
            categorySelect.value = recipe.category || 'unknown';
        }
        
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
        category: categorySelect ? categorySelect.value : 'unknown',
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
        refreshList();
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
        refreshList();
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
                refreshList();
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
updateAuthUI()
    .then(() => loadCategories())
    .then(() => {
        const id = getRecipeIdFromUrl();
        if (id) {
            return viewRecipeDetail(id);
        }
        return loadRecipes();
    })
    .catch(() => loadRecipes());

// Button press handling: track if mouseup was within bounds
let iconBtnMouseDownTarget = null;
let iconBtnClickAllowed = false;

document.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('icon-btn')) {
        iconBtnMouseDownTarget = e.target;
        iconBtnClickAllowed = false;
        e.target.classList.add('pressing');
    }
});

document.addEventListener('mouseup', (e) => {
    if (iconBtnMouseDownTarget && iconBtnMouseDownTarget.classList.contains('pressing')) {
        const rect = iconBtnMouseDownTarget.getBoundingClientRect();
        const isWithinBounds = 
            e.clientX >= rect.left && 
            e.clientX <= rect.right && 
            e.clientY >= rect.top && 
            e.clientY <= rect.bottom;
        
        iconBtnMouseDownTarget.classList.remove('pressing');
        iconBtnClickAllowed = isWithinBounds;
        iconBtnMouseDownTarget = null;
    }
}, true);

function handleIconBtnClick(fn) {
    if (iconBtnClickAllowed) {
        iconBtnClickAllowed = false;
        fn();
    }
}
