# Project Structure

This repository is split into a few major areas. The notes below explain what
each folder or file is for so you can find the right place to work.

## Backend (`backend/`)

This folder contains the Express server backed by MySQL. The entry point is
`index.js`. It loads environment variables, connects to the database pool, and boots the
Express app. The file registers a lightweight health check with
`app.get('/api/health', ...)` so tooling can confirm the service is online, and
it mounts the route modules under `/api/auth`, `/api/expos`, and `/api/users`.
During local development the same file also starts Vite in middleware mode so
frontend files are served alongside the API.

The `routes/` directory groups the API endpoints by feature. For example
`routes/auth.js` exposes `POST /register` and `POST /login`. Those handlers hash
passwords with bcrypt, create or verify JWTs, and return the user payload that
the frontend needs:

```
const token = signToken(user);
return res.status(200).json({ message: 'Успішний вхід', token, user: { ... } });
```

`routes/expos.js` shows how authenticated routes work. It applies the
authentication middleware, then uses the expo model helpers to read or mutate
data. For instance, `router.post('/')` checks for a duplicate `expoId`, inserts
a new record, and replies with `201`.

The data layer lives in `models/`. Each module wraps SQL queries on top of the
shared MySQL pool. `models/userModel.js` enforces things like a unique, trimmed
email and restricts `gender` to either `male` or `female`, while
`models/expoModel.js` describes the fields stored for exhibitions and returns
objects shaped for the API.

Reusable request helpers belong in `middleware/`. Currently `middleware/auth.js`
parses the `Authorization` header, verifies the JWT (falling back to a sensible
development secret if needed), and attaches the decoded payload to `req.user`
before handing off to the actual route logic.

Other folders (`services/`, `utils/`, and `config/`) exist so the codebase has a
place for shared business logic, small helpers, or configuration constants as
they are introduced. At the moment they are empty, but new features should use
them instead of crowding routes or models.

## Frontend (`frontend/`)

This folder stores the user-facing website.

- `index.html`, `login.html`, `register.html`, and `admin.html` are the main
  entry pages for different parts of the app.
- `scripts/` contains JavaScript files that power each page.
- `styles/` holds the CSS that controls the look and feel of the site.
- `images/` and `fonts/` keep static assets used by the interface.

## Project-Level Files

- `scripts/` includes development helpers such as deployment or maintenance
  scripts.
- `vite.config.mjs` configures Vite, the build tool used for the frontend.
- `package.json` lists project dependencies and defines npm scripts.
- `README.md` (this file) documents the project.
- `node_modules/` is created by npm and contains the downloaded dependencies;
  you normally do not edit anything here.

## Development

Follow the steps below to start the project locally:

1. Install the dependencies once:
   ```bash
   npm install
   ```
2. Create a `.env` file (or copy `.env.example` if it exists) with your MySQL
   connection details and JWT secret. The backend uses those values when it
   boots.
3. Launch the full stack development server:
   ```bash
   npm start
   ```
   This runs `node backend/index.js`, which in turn starts the Express API and
   spins up Vite in middleware mode so the frontend pages are served from the
   same address. Open the URL printed in the terminal (by default
   `http://localhost:3000`) in your browser.

Other helpful scripts:

- `npm run dev` – also runs the Express server in development mode.
- `npm run build` – bundles the frontend for production deployment.
