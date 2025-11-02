# Museum KPI Backend Documentation

## Overview
The backend powers the Museum KPI project by providing REST APIs for public visitors and museum administrators. It is built with Node.js, Express, and MySQL and covers:

- Visitor onboarding through registration and login flows.
- Public exhibition discovery with real-time seat availability.
- Administrator authentication and full CRUD lifecycle management for exhibitions.
- Environment-driven configuration and health monitoring endpoints.

## Technology Stack
- **Runtime:** Node.js with Express
- **Database:** MySQL (accessed via a shared `mysql2/promise` connection pool)
- **Security:** Password hashing with `bcrypt`
- **Configuration:** Environment variables (`.env`) and MySQL connection strings

## Application Structure
```
backend/
├── db.js        # Database connection pool and helpers
└── server.js    # Express application and route handlers
```

### `db.js`
- Loads environment variables with `dotenv`.
- Parses the `DATABASE_URL` connection string (standard MySQL URI format) to configure the MySQL connection pool.
- Supports optional SSL by checking the `ssl-mode` query parameter in the URL. Any value other than `DISABLED` enables TLS with `rejectUnauthorized: false`.

### `server.js`
- Initializes the Express application, enabling JSON parsing and CORS.
- Defines helper utilities:
  - `mapUser(dbRow)` converts raw SQL result objects into API-friendly user objects.
  - `mapExhibition(dbRow)` normalizes exhibition rows and enriches them with admin data when available.
  - `normalizePhone(phone)` strips whitespace and treats empty values as `null`.
  - `isValidDate(value)` verifies ISO date strings before persisting.
  - `findAdminById(adminId)` resolves admin metadata to enforce authorization on protected routes.
- Exposes all API routes listed below.

## Environment Configuration
Create a `.env` file in the project root with the following variable:

```env
DATABASE_URL=mysql://USER:PASSWORD@HOST:PORT/DATABASE?ssl-mode=DISABLED
```

- The `ssl-mode` query parameter may be omitted or set to any value other than `DISABLED` to enable TLS.
- The pool uses sensible defaults (`connectionLimit: 10`, `waitForConnections: true`, `dateStrings: true`).
- Optionally set `PORT` to change the default HTTP port (`3000`).

## Database Model
| Table | Key columns (required \*) | Notes |
|-------|---------------------------|-------|
| `Users` | `id`, `first_name*`, `last_name*`, `birth_date*`,<br>`gender`, `email*`, `phone`, `password*` | Emails must be unique; passwords are stored as bcrypt hashes. |
| `Admins` | `id`, `first_name*`, `last_name*`, `email*`, `password*` | Used for privileged access to exhibition management. |
| `Exhibitions` | `id`, `name*`, `image_url`, `start_date*`, `end_date*`,<br>`available_seats*`, `admin_id*` | `admin_id` references `Admins.id`; availability must be a non-negative integer. |

## Business Logic and Data Flow
1. **Registration (`POST /api/register`)**
   - Validates presence of `firstName`, `lastName`, `birthDate`, `email`, `password`.
   - Trims and normalizes names and email; lowercases email.
   - Normalizes phone by removing spaces; empty values are saved as `NULL`.
   - Hashes the password with bcrypt (10 rounds) before persisting.
   - Inserts the user record and immediately fetches it to return the normalized user payload (without password).
   - Handles duplicate emails and general errors with localized error messages.

2. **Account maintenance (`PUT /api/users/:id`)**
   - Accepts partial updates for `email`, `phone`, and `password`.
   - Validates uniqueness of the new email and enforces the Ukrainian phone format (`+380XXXXXXXXX`).
   - Requires `currentPassword` when changing the password and checks it against the stored bcrypt hash.
   - Returns the updated user profile or surface validation errors.

3. **Account deletion (`DELETE /api/users/:id`)**
   - Removes the user row when it exists.
   - Returns `204 No Content` on success and `404 Not Found` when the user cannot be located.

4. **Visitor login (`POST /api/login`)**
   - Validates presence of `email` and `password`.
   - Fetches the user by normalized email and compares the bcrypt hash.
   - Returns the mapped user object when authentication succeeds; otherwise responds with a 401 error.

5. **Public exhibitions (`GET /api/exhibitions`)**
   - Returns exhibitions that still have seats available.
   - Joins `Admins` to include the curator name in the response.
   - Sorts results by start date, end date, and name for deterministic ordering.

6. **Admin login (`POST /api/admin/login`)**
   - Normalizes email, fetches admin credentials, and compares hashes.
   - Provides a backward-compatible fallback for legacy plain-text passwords.
   - Returns basic admin profile data on success.

7. **Admin exhibition listing (`GET /api/admin/exhibitions?adminId=ID`)**
   - Requires a valid `adminId` query parameter.
   - Verifies that the admin exists before returning the full exhibition catalog (regardless of seat availability).

8. **Admin exhibition creation (`POST /api/admin/exhibitions`)**
   - Requires authenticated admin context (`adminId` in request body).
   - Validates name, dates, and available seats (non-negative integers).
   - Ensures start date is not after end date.
   - Persists the exhibition and returns the normalized entity, including admin metadata.

9. **Admin exhibition update (`PUT /api/admin/exhibitions/:id`)**
   - Requires the exhibition ID path parameter and admin context in the body.
   - Validates payload similar to creation.
   - Checks that the exhibition belongs to the requesting admin before updating.

10. **Admin exhibition deletion (`DELETE /api/admin/exhibitions/:id?adminId=ID`)**
   - Validates identifiers and ensures the admin owns the exhibition before removing it.
   - Returns `204 No Content` on success.

11. **Health check (`GET /api/health`)**
   - Returns `{ "status": "ok" }` for monitoring and readiness probes.

## API Reference
All endpoints are prefixed with `/api`.

### Visitor Endpoints

#### `POST /api/register`
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
  - `201 Created` with `{ "user": { ... } }`
  - `400 Bad Request` when required fields are missing or empty after trimming
  - `409 Conflict` when the email already exists (`ER_DUP_ENTRY`)
  - `500 Internal Server Error` for unexpected issues

#### `POST /api/login`
Authenticates an existing user.

- **Request Body (JSON):**
  ```json
  {
    "email": "ada@example.com",
    "password": "securePass123"
  }
  ```
- **Responses:**
  - `200 OK` with `{ "user": { ... } }`
  - `400 Bad Request` when email or password is missing
  - `401 Unauthorized` when the email is not found or the password does not match
  - `500 Internal Server Error` for unexpected issues

#### `PUT /api/users/:id`
Updates a user's profile.

- **Path Parameters:** `id` (required integer)
- **Request Body (JSON):**
  ```json
  {
    "email": "ada.new@example.com",
    "phone": "+380001112233",
    "password": "newSecret123",
    "currentPassword": "securePass123"
  }
  ```
  - Omit any fields that should remain unchanged.
- **Responses:**
  - `200 OK` with `{ "user": { ... } }`
  - `400 Bad Request` for invalid identifiers or payloads, missing `currentPassword` when changing the password, or poorly formatted phone numbers
  - `409 Conflict` when the email is already in use by another account
  - `404 Not Found` if the user cannot be located
  - `500 Internal Server Error` for unexpected issues

#### `DELETE /api/users/:id`
Deletes a user account.

- **Path Parameters:** `id` (required integer)
- **Responses:**
  - `204 No Content` on success
  - `400 Bad Request` for invalid identifiers
  - `404 Not Found` if the user cannot be located
  - `500 Internal Server Error` for unexpected issues

#### `GET /api/exhibitions`
Retrieves currently bookable exhibitions.

- **Query Parameters:** none
- **Responses:**
  - `200 OK` with `{ "exhibitions": [ { ... } ] }`
  - `500 Internal Server Error` if the list cannot be retrieved

### Administrator Endpoints

#### `POST /api/admin/login`
Authenticates museum administrators.

- **Request Body (JSON):**
  ```json
  {
    "email": "curator@example.com",
    "password": "adminSecret"
  }
  ```
- **Responses:**
  - `200 OK` with `{ "admin": { "id": 1, "firstName": "Curator", ... } }`
  - `400 Bad Request` when email or password is missing
  - `401 Unauthorized` when credentials are invalid
  - `500 Internal Server Error` for unexpected issues

#### `GET /api/admin/exhibitions`
Lists all exhibitions for administrative management.

- **Query Parameters:** `adminId` (required integer)
- **Responses:**
  - `200 OK` with `{ "exhibitions": [ { ... } ] }`
  - `400 Bad Request` if `adminId` is missing or invalid
  - `403 Forbidden` if the admin cannot be found
  - `500 Internal Server Error` for unexpected issues

#### `POST /api/admin/exhibitions`
Creates a new exhibition.

- **Request Body (JSON):**
  ```json
  {
    "adminId": 1,
    "name": "Impressionist Masters",
    "imageUrl": "https://example.com/poster.jpg", // optional
    "startDate": "2024-06-01",
    "endDate": "2024-06-30",
    "availableSeats": 150
  }
  ```
- **Responses:**
  - `201 Created` with `{ "exhibition": { ... } }`
  - `400 Bad Request` for invalid admin ID, missing fields, bad dates, or negative seats
  - `403 Forbidden` if the admin does not exist
  - `500 Internal Server Error` for unexpected issues

#### `PUT /api/admin/exhibitions/:id`
Updates an existing exhibition.

- **Path Parameters:** `id` (required integer)
- **Request Body:** same shape as creation
- **Responses:**
  - `200 OK` with `{ "exhibition": { ... } }`
  - `400 Bad Request` for invalid identifiers or payloads
  - `403 Forbidden` if the exhibition does not belong to the admin
  - `404 Not Found` if the exhibition cannot be located
  - `500 Internal Server Error` for unexpected issues

#### `DELETE /api/admin/exhibitions/:id`
Deletes an exhibition.

- **Path Parameters:** `id` (required integer)
- **Query Parameters:** `adminId` (required integer)
- **Responses:**
  - `204 No Content` on success
  - `400 Bad Request` for invalid identifiers
  - `403 Forbidden` if the exhibition does not belong to the admin
  - `404 Not Found` if the exhibition cannot be located
  - `500 Internal Server Error` for unexpected issues

### Operational Endpoint

#### `GET /api/health`
- **Purpose:** Liveness/readiness probe.
- **Response:** `200 OK` with `{ "status": "ok" }`.

## Database Queries Used
The backend interacts with MySQL through parameterized queries to prevent SQL injection.

| Route / Feature                                 | Queries Executed |
|-------------------------------------------------|------------------|
| `POST /api/register`                            | `INSERT INTO Users (...) VALUES (?, ?, ?, ?, ?, ?, ?)` and `SELECT ... FROM Users WHERE id = ?` |
| `POST /api/login`                               | `SELECT ... FROM Users WHERE email = ?` |
| `PUT /api/users/:id`                            | `SELECT ... FROM Users WHERE id = ?`, optional `SELECT id FROM Users WHERE email = ? AND id <> ?`, `UPDATE Users SET ... WHERE id = ?`, `SELECT ... FROM Users WHERE id = ?` |
| `DELETE /api/users/:id`                         | `DELETE FROM Users WHERE id = ?` |
| `GET /api/exhibitions`                          | `SELECT ... FROM Exhibitions e JOIN Admins a ON e.admin_id = a.id WHERE e.available_seats > 0 ORDER BY ...` |
| `POST /api/admin/login`                         | `SELECT ... FROM Admins WHERE LOWER(email) = ?` |
| `GET /api/admin/exhibitions`                    | `SELECT ... FROM Exhibitions e JOIN Admins a ON e.admin_id = a.id ORDER BY ...` |
| `POST /api/admin/exhibitions`                   | `SELECT ... FROM Admins WHERE id = ?`, `INSERT INTO Exhibitions (...) VALUES (?, ?, ?, ?, ?, ?)`, `SELECT ... FROM Exhibitions e JOIN Admins a ON e.admin_id = a.id WHERE e.id = ?` |
| `PUT /api/admin/exhibitions/:id`                | `SELECT ... FROM Admins WHERE id = ?`, `SELECT id, admin_id FROM Exhibitions WHERE id = ?`, `UPDATE Exhibitions SET ... WHERE id = ?`, `SELECT ... FROM Exhibitions e JOIN Admins a ON e.admin_id = a.id WHERE e.id = ?` |
| `DELETE /api/admin/exhibitions/:id`             | `SELECT ... FROM Admins WHERE id = ?`, `SELECT id, admin_id FROM Exhibitions WHERE id = ?`, `DELETE FROM Exhibitions WHERE id = ?` |

## Error Handling
- Client-facing error messages are returned in Ukrainian, matching the current UI language.
- Database-related errors are logged to the server console for diagnostics.
- Duplicate email errors are detected via MySQL error code `ER_DUP_ENTRY` and translated into a `409 Conflict` response.
- Admin CRUD endpoints enforce ownership by verifying that the requesting admin matches the exhibition `admin_id`.

## Running the Backend
1. Install dependencies (run in repository root):
   ```bash
   npm install
   ```
2. Create and populate the `.env` file with `DATABASE_URL`.
3. Ensure the MySQL database schema (tables `Users`, `Admins`, `Exhibitions`) is in place.
4. Start the server:
   ```bash
   npm start
   ```
   The server listens on `PORT` specified in the environment or defaults to `3000`.

## Health Monitoring
Use `/api/health` as a simple liveness probe for container orchestrators or uptime monitoring services.
