# Recipe Database

A full-stack web application for managing recipes using Express.js backend and SQLite database.

## Features

- ✅ View all recipes in a beautiful grid layout
- ✅ Add new recipes with ingredients and instructions
- ✅ Edit existing recipes
- ✅ Delete recipes
- ✅ Track prep time, cook time, and servings
- ✅ Responsive design for mobile and desktop

## Project Structure

```
recipes/
├── src/
│   ├── server.js              # Express server setup
│   ├── database/
│   │   └── db.js              # SQLite database initialization
│   └── routes/
│       └── recipes.js         # Recipe API endpoints
├── public/
│   ├── index.html             # Frontend UI
│   ├── styles.css             # Styling
│   └── app.js                 # Frontend JavaScript
└── package.json               # Project dependencies
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:8003`

## Docker Setup

### Build Docker Image

To build the Docker image for the private registry:

```bash
docker build -t home.shotton.us:5443/recipes:latest .
```

Push to registry:
```bash
docker push home.shotton.us:5443/recipes:latest
```

### Run with Docker Compose

To run the application using Docker Compose:

```bash
docker-compose up -d
```

This will:
- Start the recipes app on port 8003
- Create a `recipes-data` folder in the current directory to persist the database
- The database will be stored at `./recipes-data/recipes.db`

Stop the application:
```bash
docker-compose down
```

View logs:
```bash
docker-compose logs -f recipes
```

The application will be available at `http://localhost:8003`

## Available Scripts

- `npm start` - Start the production server
- `npm run dev` - Start with nodemon (auto-reload on changes)

## API Endpoints

### GET /api/recipes
Get all recipes

### GET /api/recipes/:id
Get a specific recipe

### POST /api/recipes
Create a new recipe

**Request body:**
```json
{
  "title": "Recipe Name",
  "description": "Description",
  "ingredients": "Ingredient 1\nIngredient 2",
  "instructions": "Step 1\nStep 2",
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4
}
```

### PUT /api/recipes/:id
Update a recipe (same fields as POST)

### DELETE /api/recipes/:id
Delete a recipe

## Database

The application uses SQLite with the following schema:

```sql
CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  ingredients TEXT NOT NULL,
  instructions TEXT NOT NULL,
  prepTime INTEGER,
  cookTime INTEGER,
  servings INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

## Technologies

- **Backend**: Express.js, Node.js
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Development**: Nodemon

## License

ISC
