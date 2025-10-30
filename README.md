# Museum KPI Backend Documentation

## Overview
The Museum KPI backend is a Node.js/Express service that exposes a small REST API for user registration, authentication, and basic system health checks. Data is persisted in a MySQL-compatible database that is accessed through the `mysql2` driver using a pooled connection. Passwords are securely hashed with `bcrypt` before being stored.

## Technology Stack
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** MySQL-compatible RDBMS (e.g., MySQL, MariaDB)
- **ORM/Driver:** `mysql2/promise` with prepared statements
- **Authentication:** Email + password with `bcrypt` hashing
- **Environment management:** `.env` file read via `dotenv`

## Project Structure
```
backend/
├── db.js        # Database pool creation and export
└── server.js    # Express app, routes, and business logic
```

### Key Modules
- **`backend/db.js`** – Parses the `DATABASE_URL` connection string, configures the MySQL connection pool, and exports the `pool` instance for query execution.
- **`backend/server.js`** – Sets up middleware, defines REST endpoints, and contains the business rules for registering and authenticating users.

## Configuration
All database credentials are supplied through a single `DATABASE_URL` environment variable in the format:
```
mysql://USER:PASSWORD@HOST:PORT/DATABASE?ssl-mode=REQUIRED
```
- Set `ssl-mode` to `DISABLED` (or omit it) to connect without TLS.
- The backend loads this variable from an `.env` file if present.

## Business Logic
### User Registration Flow (`POST /api/register`)
1. **Input Validation:** Ensures `firstName`, `lastName`, `birthDate`, `email`, and `password` are present. Optional fields: `gender`, `phone`.
2. **Normalization:**
   - Trims leading/trailing whitespace from names and email.
   - Lowercases the email.
   - Removes whitespace inside phone numbers; empty results are stored as `NULL`.
3. **Security:** Hashes the plaintext password with `bcrypt` (10 salt rounds) before storage.
4. **Persistence:** Executes an `INSERT` into the `Users` table with normalized values. Duplicate-email attempts return HTTP 409.
5. **Response:** Fetches the newly created row, maps database column names to API field names, and returns the user object (without password) with HTTP 201.

### User Authentication Flow (`POST /api/login`)
1. **Input Validation:** Requires `email` and `password`.
2. **Lookup:** Retrieves the user record (including the hashed password) by normalized email.
3. **Verification:** Uses `bcrypt.compare` to verify the supplied password against the stored hash.
4. **Response:** On success, returns the mapped user object (without password). Invalid credentials return HTTP 401; unexpected errors return HTTP 500.

### Health Check (`GET /api/health`)
Returns `{ "status": "ok" }` for monitoring purposes.

## REST API Reference
### `POST /api/register`
Registers a new user.
- **Request Body (JSON):**
  ```json
  {
    "firstName": "Ada",
    "lastName": "Lovelace",
    "birthDate": "1815-12-10",
    "gender": "female",           // optional
    "email": "ada@example.com",
    "phone": "+380 12 345 67 89", // optional
    "password": "strong_password"
  }
  ```
- **Successful Response (201):**
  ```json
  {
    "user": {
      "id": 42,
      "firstName": "Ada",
      "lastName": "Lovelace",
      "birthDate": "1815-12-10",
      "gender": "female",
      "email": "ada@example.com",
      "phone": "+380123456789"
    }
  }
  ```
- **Error Responses:**
  - `400` – Missing or invalid required fields.
  - `409` – Email already exists.
  - `500` – Unexpected database/server error.

### `POST /api/login`
Authenticates an existing user.
- **Request Body (JSON):**
  ```json
  {
    "email": "ada@example.com",
    "password": "strong_password"
  }
  ```
- **Successful Response (200):**
  ```json
  {
    "user": {
      "id": 42,
      "firstName": "Ada",
      "lastName": "Lovelace",
      "birthDate": "1815-12-10",
      "gender": "female",
      "email": "ada@example.com",
      "phone": "+380123456789"
    }
  }
  ```
- **Error Responses:**
  - `400` – Missing email or password.
  - `401` – Invalid credentials.
  - `500` – Unexpected error during authentication.

### `GET /api/health`
- **Purpose:** Simple readiness/liveness probe.
- **Response (200):** `{ "status": "ok" }`

## Database Schema
The backend expects a `Users` table with the following columns:
| Column        | Type (suggested) | Constraints/Notes                                  |
|---------------|------------------|-----------------------------------------------------|
| `id`          | INT              | Primary key, auto-increment                        |
| `first_name`  | VARCHAR(255)     | Not null                                           |
| `last_name`   | VARCHAR(255)     | Not null                                           |
| `birth_date`  | DATE             | Not null                                           |
| `gender`      | ENUM/Text        | Nullable                                           |
| `email`       | VARCHAR(255)     | Not null, unique                                   |
| `phone`       | VARCHAR(32)      | Nullable; stored without whitespace                |
| `password`    | VARCHAR(255)     | Not null; stores `bcrypt` hash                     |

### Query Patterns
- **Insert:** `INSERT INTO Users (...) VALUES (?, ?, ..., ?)` during registration.
- **Select:**
  - By `id` immediately after user creation to return the persisted data.
  - By `email` during login to retrieve the user and hashed password.
- All queries use prepared statements via `pool.execute` to prevent SQL injection.

## Data Handling & Security
- Passwords are never returned in API responses.
- Personally identifiable information is normalized and validated before insertion.
- Phone numbers are stored without whitespace to aid consistency.
- Errors are logged to the server console to help with debugging while keeping responses generic.

## Running the Backend
1. Install dependencies: `npm install`
2. Create a `.env` file with `DATABASE_URL` (see **Configuration** above).
3. Start the backend: `node backend/server.js`
   - The server listens on `PORT` (defaults to `3000`).

When using `npm start`, the project’s `start.js` script launches both the backend and frontend concurrently.

## Monitoring & Troubleshooting
- Use the `/api/health` endpoint for uptime checks.
- Examine server logs for validation or database errors (`Register error`, `Login error`).
- Ensure the database user has permissions for `SELECT` and `INSERT` on the `Users` table.

## Future Extensions
- Add JWT token issuance after login for session management.
- Implement password reset workflows.
- Extend the data model with museum-specific entities (exhibitions, tickets, etc.) and corresponding API routes.

