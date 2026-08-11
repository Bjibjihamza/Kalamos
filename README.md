# Preleaf

A local Overleaf-style LaTeX report workspace. Edit LaTeX in a web UI with a
Monaco editor, auto-save, and live PDF preview — compilation runs in Docker.

## Quick start (Docker — recommended)

No Node.js or LaTeX installation required.

```bash
docker compose up -d --build
```

Then open **http://localhost:4000**.

See **[INSTALL.md](INSTALL.md)** for the full installation manual (French),
troubleshooting, and data locations.

## Development

```bash
npm run setup     # install server + app dependencies
npm run dev       # server on :4000 + Vite dev server on :5173
docker compose up -d latex   # latex compile container (needed to compile)
```

## Structure

```
app/          React + Vite frontend (Monaco editor, file tree, PDF preview)
server/       Express API + Socket.IO (projects, files, compile, synctex)
templates/    Project templates: report (thesis-style), article, blank
projects/     User projects (gitignored, persisted on host)
.docker/      Dockerfiles: latex compile image + full application image
docker-compose.yml
```

## Features

- Project management: create, list, open, rename, duplicate, delete
- File explorer with create / rename / delete / upload
- Monaco editor with tabs and debounced auto-save
- LaTeX compilation in a TeX Live Docker container (latexmk, bibtex, SyncTeX)
- Live PDF preview with reload on successful compile
- Live compile log with parsed errors / warnings
- SyncTeX jump: PDF ↔ source

## API overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project `{ name, template }` |
| GET | `/api/projects/:slug/tree` | File tree |
| GET/PUT | `/api/projects/:slug/file?path=` | Read / write file |
| POST | `/api/projects/:slug/compile` | Enqueue compile |
| GET | `/api/projects/:slug/build/*` | Build artifacts (PDF) |
| GET | `/api/projects/:slug/synctex/edit\|view` | SyncTeX mapping |

Compile events (`compile:start`, `compile:log`, `compile:done`) are pushed over
Socket.IO to clients joined to a project.
