# Project Structure

The project now ships as a static site built with HTML, SCSS, and vanilla JavaScript.

## Frontend (`frontend/`)

This folder stores all public-facing pages and assets.

- `index.html`, `login.html`, `register.html`, and `admin.html` are standalone entry pages.
- `scripts/` contains lightweight JavaScript that powers interactive behaviour without any frameworks.
- `styles/` holds the SCSS source files. Run `npm run build:styles` to compile them into the generated CSS files that the HTML pages include.
- `images/` and `fonts/` provide the media assets used across the pages.

## Tooling

The only Node.js dependency that remains is `sass`, which compiles the SCSS sources into CSS. Install dependencies with `npm install`, then run:

```bash
npm run build:styles
```

The command outputs `frontend/styles/main.css` and `frontend/styles/admin.css`. No backend server or database is required to view the site.
