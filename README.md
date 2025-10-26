# Project Structure

The project now ships as a static site built with HTML, CSS, and vanilla JavaScript.

## Frontend (`frontend/`)

This folder stores all public-facing pages and assets.

- `index.html`, `login.html`, and `register.html` are standalone entry pages.
- `styles/` holds the CSS files that the HTML pages include.
- `images/` and `fonts/` provide the media assets used across the pages.

## Tooling

Static assets are served directly; no build step is required beyond what Vite already provides. No backend server or database is required to view the site.
