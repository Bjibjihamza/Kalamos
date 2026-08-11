import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..', '..');
export const SERVER_DIR = path.join(ROOT, 'server');
export const PROJECTS_DIR = process.env.PRELEAF_PROJECTS || path.join(ROOT, 'projects');
export const TEMPLATES_DIR = process.env.PRELEAF_TEMPLATES || path.join(ROOT, 'templates');
export const DIST_DIR = path.join(ROOT, 'app', 'dist');
export const PORT = Number(process.env.PRELEAF_PORT || 4000);
export const DOCKER_CONTAINER = process.env.PRELEAF_LATEX_CONTAINER || 'preleaf-latex';
export const COMPOSE_FILE = path.join(ROOT, 'docker-compose.yml');

export const HIDDEN_DIRS = new Set(['.preleaf', '.build', '.git', 'node_modules']);
export const META_FILE = '.preleaf/meta.json';
export const DEFAULT_MAIN = 'main.tex';
