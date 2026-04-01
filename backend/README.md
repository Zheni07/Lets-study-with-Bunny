# Learn with Bunny - Backend API

A backend API for the "Learn with Bunny" educational website built with a three-layer architecture and role-based access control (RBAC).

## Architecture

The backend follows a **three-layer architecture**:

1. **Presentation Layer** (`src/routes/`) - Handles HTTP requests and responses
2. **Business Logic Layer** (`src/services/`) - Contains business logic and validation
3. **Data Access Layer** (`src/repositories/`) - Handles database operations

## Technology Stack

- **Node.js** with Express.js
- **SQLite** (better-sqlite3) for database
- **JWT** for authentication
- **bcrypt** for password hashing
- **multer** for file uploads

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration (environment variables)
│   ├── db/              # Database setup and migrations
│   ├── middleware/      # Express middleware (auth, roles, error handling)
│   ├── repositories/    # Data Access Layer
│   ├── routes/          # Presentation Layer (Controllers)
│   ├── services/        # Business Logic Layer
│   ├── utils/           # Utility functions (JWT)
│   ├── app.js           # Express app setup
│   └── server.js        # Server entry point
├── data/                # SQLite database files
├── uploads/             # Uploaded images
├── .env.example         # Environment variables template
└── package.json
```

## Roles and Permissions

### Guest (Not Registered)
- ✅ Access to all public pages
- ✅ Can view the "Games" page
- ✅ Can watch preview videos for games
- ❌ Cannot play games
- ❌ Cannot modify content

### User (Registered)
- ✅ All Guest permissions
- ✅ Can play games
- ✅ Has a personal account
- ✅ Can log in and log out

### Admin
- ✅ All User permissions
- ✅ Access to Admin Panel
- ✅ Can create, edit, and delete articles
- ✅ Can manage user profiles (view, delete, change roles)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)

### Articles
- `GET /api/articles` - Get all articles (public)
- `GET /api/articles/:id` - Get article by ID (public)
- `POST /api/articles` - Create article (admin only)
- `PUT /api/articles/:id` - Update article (admin only)
- `DELETE /api/articles/:id` - Delete article (admin only)

### Games
- `GET /api/games` - Get all games (public, no gameUrl for guests)
- `GET /api/games/:id/preview` - Get game preview (public)
- `GET /api/games/:id/play` - Get game play URL (user/admin only)

### Admin
- `GET /api/admin/users` - Get all users (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)
- `PUT /api/admin/users/:id/role` - Change user role (admin only)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=1d
DB_PATH=./data/app.db
CORS_ORIGIN=*

# SMTP (за "Забравена парола")
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=app_password_here
SMTP_FROM="Да учим с Бъни <your@gmail.com>"

# EmailJS (алтернатива при Gmail Advanced Protection)
EMAILJS_SERVICE_ID=service_xxx
EMAILJS_TEMPLATE_ID_RESET=template_xxx
EMAILJS_PUBLIC_KEY=public_xxx
EMAILJS_PRIVATE_KEY=private_xxx
```

4. Run the server:
```bash
npm run dev    # Development mode with watch
npm start      # Production mode
```

## Database

The database is automatically initialized on first run with:
- Default admin user: `dislexia.bunny@gmail.com` / `Admin123!`
- Three sample games
- Seed articles from `seed/articles.json` (only when the `articles` table is empty)

### Why data "disappears" on a new device?

The project uses a local SQLite file (`DB_PATH=./data/app.db`). The `data/` folder is intentionally ignored by git, so a fresh clone starts with a new empty DB file. On first run the backend creates the schema and seeds initial data.

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## File Uploads

Article images are uploaded to the `uploads/` directory and served at `/uploads/<filename>`. Supported formats: jpeg, jpg, png, gif, webp (max 5MB).

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Role-based access control middleware
- Input validation in services layer
- SQL injection protection (parameterized queries)

## Error Handling

All errors follow a consistent format:
```json
{
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE" // optional
  }
}
```

## Middleware

- `requireAuth` - Requires valid JWT token
- `optionalAuth` - Optionally extracts user from token (doesn't fail if missing)
- `requireRole(...roles)` - Requires user to have one of the specified roles
