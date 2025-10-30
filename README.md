# Museum KPI Backend Documentation

## Overview
The backend provides a REST API for user registration, authentication, and health monitoring for the Museum KPI project. It is implemented with Node.js, Express, and MySQL and focuses on secure user management and consistent data storage.

## Technology Stack
- **Runtime:** Node.js with Express
- **Database:** MySQL (accessed via `mysql2/promise` connection pool)
- **Security:** Password hashing with `bcrypt`
- **Configuration:** Environment-driven via `.env` variables

## Application Structure
```
backend/
├── db.js        # Database connection pool and helpers
└── server.js    # Express application and route handlers
```

### `db.js`
- Loads environment variables with `dotenv`.
- Parses the `DATABASE_URL` connection string (standard MySQL URI format) to configure the MySQL connection pool.
- Supports optional SSL by checking the `ssl-mode` query parameter in the URL. Any value other than `disabled` enables TLS with `rejectUnauthorized: false`.

### `server.js`
- Initializes the Express application, enabling JSON parsing and CORS.
- Defines helper utilities:
  - `mapUser(dbRow)` converts raw SQL result objects into API-friendly user objects.
  - `normalizePhone(phone)` strips whitespace and treats empty values as `null`.
- Exposes API routes for registration, login, and health checks (detailed below).

## Environment Configuration
Create a `.env` file in the project root with the following variable:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE?ssl-mode=DISABLED
```

- The `ssl-mode` query parameter may be omitted or set to any value other than `DISABLED` to enable TLS.
- The pool uses sensible defaults (`connectionLimit: 10`, `waitForConnections: true`, `dateStrings: true`).

## Database Model


## Business Logic and Data Flow
1. **Registration (`POST /api/register`)**
   - Validates presence of `firstName`, `lastName`, `birthDate`, `email`, `password`.
   - Trims and normalizes names and email; lowercases email.
   - Normalizes phone by removing spaces; empty values are saved as `NULL`.
   - Hashes the password with bcrypt (10 rounds) before persisting.
   - Inserts the user record and immediately fetches it to return the normalized user payload (without password).
   - Handles duplicate emails and general errors with localized error messages.

2. **Login (`POST /api/login`)**
   - Validates presence of `email` and `password`.
   - Fetches the user by normalized email.
   - Compares provided password with stored bcrypt hash.
   - Returns the mapped user object when authentication succeeds; otherwise responds with a 401 error.

3. **Health Check (`GET /api/health`)**
   - Returns `{ "status": "ok" }` for monitoring and readiness probes.

## API Reference
All endpoints are prefixed with `/api`.

### `POST /api/register`
Registers a new user.

- **Request Body (JSON):**
  ```json
  {
    "firstName": "Ada",
    "lastName": "Lovelace",
    "birthDate": "1815-12-10",
    "gender": "female",          // optional
    "email": "ada@example.com",
    "phone": "+380 00 000 0000", // optional
    "password": "securePass123"
  }
  ```
- **Responses:**
  - `201 Created` with `{ "user": { ... } }` (see payload below)
  - `400 Bad Request` when required fields are missing or empty after trimming
  - `409 Conflict` when the email already exists (`ER_DUP_ENTRY`)
  - `500 Internal Server Error` for unexpected issues
- **Successful Payload:**
  ```json
  {
    "user": {
      "id": 1,
      "firstName": "Ada",
      "lastName": "Lovelace",
      "birthDate": "1815-12-10",
      "gender": "female",
      "email": "ada@example.com",
      "phone": "+380000000000"
    }
  }
  ```

### `POST /api/login`
Authenticates an existing user.

- **Request Body (JSON):**
  ```json
  {
    "email": "ada@example.com",
    "password": "securePass123"
  }
  ```
- **Responses:**
  - `200 OK` with `{ "user": { ... } }` (same shape as registration response)
  - `400 Bad Request` when email or password is missing
  - `401 Unauthorized` when the email is not found or the password does not match
  - `500 Internal Server Error` for unexpected issues

### `GET /api/health`
- **Purpose:** Liveness/readiness probe.
- **Response:** `200 OK` with `{ "status": "ok" }`.

## Database Queries Used
The backend interacts with MySQL through parameterized queries to prevent SQL injection.

| Route                | Query                                                                                                                          |
|----------------------|--------------------------------------------------------------------------------------------------------------------------------|
| `POST /api/register` | `INSERT INTO Users (first_name, last_name, birth_date, gender, email, phone, password) VALUES (?, ?, ?, ?, ?, ?, ?)`            |
|                      | `SELECT id, first_name, last_name, birth_date, gender, email, phone FROM Users WHERE id = ?`                                    |
| `POST /api/login`    | `SELECT id, first_name, last_name, birth_date, gender, email, phone, password FROM Users WHERE email = ?`                      |

Each query is executed against the shared connection pool exported by `db.js`.

## Error Handling
- Client-facing error messages are returned in Ukrainian, matching the current UI language.
- Database-related errors are logged to the server console for diagnostics.
- Duplicate email errors are detected via MySQL error code `ER_DUP_ENTRY` and translated into a `409 Conflict` response.

## Running the Backend
1. Install dependencies (run in repository root):
   ```bash
   npm install
   ```
2. Create and populate the `.env` file with `DATABASE_URL`.
3. Ensure the MySQL database schema (at minimum the `Users` table) is in place.
4. Start the server:
   ```bash
   npm start
   ```
   The server listens on `PORT` specified in the environment or defaults to `3000`.



