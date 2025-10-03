# Museum
Interactive museum website with backend and frontend implemented

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start a local development server:
   ```bash
   npm start
   ```
  
## Additional scripts

- `npm run build` – create a production build in the `dist/` directory.
- `npm run preview` – preview the production build locally.

## Project structure

```
src/
├── fonts/
├── images/
├── index.html
├── scripts/
└── styles/
```


## Backend (MongoDB, Express, Mongoose, bcrypt)

This project now includes a Node.js backend to persist users and expos to MongoDB Atlas.

### Setup

- Install deps:
  - Client dev deps (already used): vite, sass
  - Server deps: express, mongoose, bcrypt, dotenv, cors, nodemon
- Scripts:
  - Run backend: `npm run dev:server`
  - Run frontend: `npm run dev` (Vite)

### Run

- Terminal 1 (backend): `npm run dev:server`
- Terminal 2 (frontend): `npm run dev`

Health check:
```
curl http://localhost:3000/api/health
# {"status":"ok"}
```

### API

Base URL (local): `http://localhost:3000`

Auth
- POST `/api/auth/register`
  - Body (JSON):
    ```
    {
      "email": "user@example.com",
      "password": "secret123",
      "lastName": "Прізвище",
      "firstName": "Ім’я",
      "middleName": "По батькові",
      "birthDate": "1990-01-01"
    }
    ```
  - 201 Created → `{ message, user }`
- POST `/api/auth/login`
  - Body (JSON):
    ```
    { "email": "user@example.com", "password": "secret123" }
    ```
  - 200 OK → `{ message, user }`

Expos
- GET `/api/expos` → List all expos (sorted by date ascending)
- GET `/api/expos/:expoId` → Get single expo by business key `expoId`
- POST `/api/expos`
  - Body (JSON):
    ```
    {
      "expoId": "expo-2025-01",
      "title": "Назва",
      "description": "Опис",
      "date": "2025-05-15"
    }
    ```
  - 201 Created → `{ message, expo }`
- PUT `/api/expos/:expoId` → Update fields: `title`, `description`, `date`
- DELETE `/api/expos/:expoId` → Delete by `expoId`

### Frontend integration

- The burger menu now includes Auth buttons:
  - "Авторизація" opens a Login modal (Email, Password)
  - "Реєстрація" opens a Registration modal (Email, Password, Прізвище, Ім’я, По батькові, Дата народження)
- On mobile, the auth buttons are shown above navigation; on tablet/desktop, they are integrated as the 3rd section of the green menu block.

Override API base URL with Vite env (optional):
- Create `src/.env` or use system env with `VITE_API_URL="https://your-deployment.example.com"`



## Admin panel

A separate admin page is included to manage "Виставки" (expos). It loads data from MongoDB (collection "expos") and allows viewing, editing, and deleting entries.

- Page: [`admin.html`](src/admin.html:1)
- Script: [`admin.js`](src/scripts/admin.js:1)
- Styles: [`admin.scss`](src/styles/admin.scss:1)
- Backend model: [`Expo.js`](server/models/Expo.js:1) with fields: expoId, title, description, author, photoUrl, date
- Backend routes: [`expos.js`](server/routes/expos.js:1) providing GET (list/one), POST, PUT, DELETE

Behavior
- After successful login or registration the app redirects to the admin page automatically.
- Responsive table with horizontal scroll on small screens.
- Actions per row:
  - 👁 Перегляд: opens a modal with full details and photo
  - ✎ Редагування: opens a modal form to update fields (title, author, photoUrl, date, description)
  - 🗑 Видалення: deletes the expo (with confirmation)

Local usage
1) Start backend:
   - `npm run dev:server`
2) Start frontend:
   - `npm run dev`
3) Authenticate via burger menu → "Авторизація" or "Реєстрація". On success you’ll be redirected to:
   - `http://localhost:5173/admin.html`
