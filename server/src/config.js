import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..', '..');
export const SERVER_DIR = path.join(ROOT, 'server');
export const PROJECTS_DIR = process.env.KALAMOS_PROJECTS || path.join(ROOT, 'projects');
export const TEMPLATES_DIR = process.env.KALAMOS_TEMPLATES || path.join(ROOT, 'templates');
export const DIST_DIR = path.join(ROOT, 'app', 'dist');
export const PORT = Number(process.env.KALAMOS_PORT || 4001);
export const DOCKER_CONTAINER = process.env.KALAMOS_LATEX_CONTAINER || 'kalamos-latex';
export const COMPOSE_FILE = path.join(ROOT, 'docker-compose.yml');

export const HIDDEN_DIRS = new Set(['.preleaf', '.build', '.git', 'node_modules']);
export const META_FILE = '.preleaf/meta.json';
export const DEFAULT_MAIN = 'main.tex';
