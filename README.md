# Kalamos

A local Overleaf-style LaTeX report workspace. Edit LaTeX in a web UI with a
Monaco editor, auto-save, and live PDF preview — compilation runs in Docker.

*Kalamos* (κάλαμος) is the Greek reed pen — the original instrument of writing.

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

## Tests

```bash
npm test          # server API tests (vitest + supertest) + app tests (vitest + testing-library)
```

## Structure

```
app/          React + Vite frontend (Monaco editor, file tree, PDF viewer)
server/       Express API + Socket.IO (projects, files, compile, synctex)
templates/    Project templates: report (thesis-style), article, blank
projects/     User projects (gitignored, persisted on host)
.docker/      Dockerfiles: latex compile image + full application image
docker-compose.yml
```

## Features

- Project dashboard: search, sort, relative timestamps, skeletons
- Project management: create, list, open, rename, duplicate, delete
- File explorer with context menu, file search, rename, delete, upload
- Monaco editor with tabs, debounced auto-save, and inline compile diagnostics
- LaTeX compilation in a TeX Live Docker container (pdflatex **and** XeLaTeX,
  latexmk, biber, SyncTeX)
- All projects use the shared `kalamos-latex` runner; a project `.latexmkrc`
  only selects its LaTeX engine and project-specific options
- pdf.js PDF viewer: zoom, pagination, download, and SyncTeX click-to-source
- Command palette (Ctrl+K), keyboard shortcuts, toast notifications
- Live compile log with parsed errors / warnings

## Keyboard shortcuts

| Action | Keys |
|---|---|
| Recompile | `Ctrl + Enter` |
| Save all | `Ctrl + S` |
| Command palette | `Ctrl + K` |
| Forward search (PDF) | `Ctrl + Click` in editor |
| Jump to source | Click on the PDF |

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
