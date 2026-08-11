import fs from 'node:fs';
import path from 'node:path';
import { PROJECTS_DIR, TEMPLATES_DIR, META_FILE, DEFAULT_MAIN, HIDDEN_DIRS } from '../config.js';
import { HttpError } from '../http.js';

export function slugify(name) {
  const s = String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'project';
}

export function projectPath(slug) {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(slug)) throw new HttpError(400, 'Invalid project slug');
  return path.join(PROJECTS_DIR, slug);
}

function metaPath(slug) {
  return path.join(projectPath(slug), META_FILE);
}

function readMeta(slug) {
  try {
    return JSON.parse(fs.readFileSync(metaPath(slug), 'utf8'));
  } catch {
    return null;
  }
}

function writeMeta(slug, meta) {
  fs.mkdirSync(path.dirname(metaPath(slug)), { recursive: true });
  fs.writeFileSync(metaPath(slug), JSON.stringify(meta, null, 2));
}

function buildPdfExists(slug) {
  const pdf = path.join(projectPath(slug), '.build', `${DEFAULT_MAIN.replace(/\.tex$/, '')}.pdf`);
  return fs.existsSync(pdf) ? pdf : null;
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === '.build') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export function listProjects() {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  const projects = [];
  for (const entry of fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const meta = readMeta(slug);
    if (!meta) continue;
    projects.push(describeProject(slug, meta));
  }
  projects.sort((a, b) => (b.modifiedAt || '').localeCompare(a.modifiedAt || ''));
  return projects;
}

export function getProject(slug) {
  const meta = readMeta(slug);
  if (!meta) return null;
  return describeProject(slug, meta);
}

function describeProject(slug, meta) {
  const p = projectPath(slug);
  const buildPdf = buildPdfExists(slug);
  let modifiedAt = null;
  try {
    modifiedAt = new Date(fs.statSync(metaPath(slug)).mtime).toISOString();
  } catch {}
  return {
    slug,
    name: meta.name || slug,
    template: meta.template || null,
    mainFile: meta.mainFile || DEFAULT_MAIN,
    createdAt: meta.createdAt || null,
    modifiedAt,
    hasPdf: !!buildPdf,
    pdfUrl: buildPdf
      ? `/api/projects/${slug}/build/${path.basename(buildPdf)}`
      : null,
  };
}

export function createProject({ name, template = 'report' }) {
  const slug = slugify(name);
  if (fs.existsSync(projectPath(slug))) throw new HttpError(409, `A project "${slug}" already exists`);
  const templateDir = path.join(TEMPLATES_DIR, template);
  if (!fs.existsSync(templateDir)) throw new HttpError(400, `Unknown template "${template}"`);
  copyDir(templateDir, projectPath(slug));
  writeMeta(slug, {
    name,
    template,
    mainFile: DEFAULT_MAIN,
    createdAt: new Date().toISOString(),
  });
  return getProject(slug);
}

export function renameProject(slug, name) {
  if (!getProject(slug)) throw new HttpError(404, 'Project not found');
  writeMeta(slug, { ...readMeta(slug), name });
  return getProject(slug);
}

export function duplicateProject(slug) {
  const src = getProject(slug);
  if (!src) throw new HttpError(404, 'Project not found');
  let newName = `${src.name} (copie)`;
  let newSlug = slugify(newName);
  let n = 2;
  while (fs.existsSync(projectPath(newSlug))) {
    newSlug = slugify(`${src.name}-copie-${n}`);
    n++;
  }
  copyDir(projectPath(slug), projectPath(newSlug));
  writeMeta(newSlug, {
    name: newName,
    template: src.template,
    mainFile: src.mainFile,
    createdAt: new Date().toISOString(),
  });
  return getProject(newSlug);
}

export function deleteProject(slug) {
  if (!getProject(slug)) throw new HttpError(404, 'Project not found');
  fs.rmSync(projectPath(slug), { recursive: true, force: true });
}

export function listTemplates() {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  return fs
    .readdirSync(TEMPLATES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !HIDDEN_DIRS.has(e.name))
    .map((e) => e.name);
}
