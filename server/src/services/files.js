import fs from 'node:fs';
import path from 'node:path';
import { HIDDEN_DIRS, HIDDEN_FILE_EXTS, META_FILE } from '../config.js';
import { HttpError } from '../http.js';
import { projectPath, getProject } from './projects.js';

function assertProject(slug) {
  if (!getProject(slug)) throw new HttpError(404, 'Project not found');
  return projectPath(slug);
}

function resolveSafe(root, rel) {
  const clean = String(rel || '').replace(/\\/g, '/');
  if (!clean || clean.startsWith('/')) throw new HttpError(400, 'Invalid path');
  const parts = [];
  for (const seg of clean.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') throw new HttpError(400, 'Path traversal is not allowed');
    parts.push(seg);
  }
  if (parts.length === 0) throw new HttpError(400, 'Invalid path');
  const target = path.join(root, ...parts);
  const relParts = path.relative(root, target).split(path.sep);
  if (relParts[0] === '.' || relParts[0] === '..') throw new HttpError(400, 'Invalid path');
  const first = relParts[0];
  if (first === '.preleaf' || first === '.build' || first === '.git') {
    throw new HttpError(403, `Path under "${first}" is protected`);
  }
  return target;
}

function walk(dir, base) {
  const entries = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (HIDDEN_DIRS.has(entry.name)) continue;
      entries.push({ name: entry.name, type: 'folder', path: rel, children: walk(full, rel) });
    } else {
      const ext = entry.name.split('.').slice(1).join('.');
      if (HIDDEN_FILE_EXTS.has(ext.toLowerCase())) continue;
      let size = 0;
      try { size = fs.statSync(full).size; } catch {}
      entries.push({ name: entry.name, type: 'file', path: rel, size });
    }
  }
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return entries;
}

export function getTree(slug) {
  const root = assertProject(slug);
  return { name: getProject(slug).name, slug, children: walk(root, '') };
}

export function readFile(slug, rel) {
  const root = assertProject(slug);
  const target = resolveSafe(root, rel);
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) throw new HttpError(404, 'File not found');
  const MAX = 5 * 1024 * 1024;
  const stat = fs.statSync(target);
  if (stat.size > MAX) throw new HttpError(413, 'File too large to open in editor');
  return fs.readFileSync(target, 'utf8');
}

export function writeFile(slug, rel, content) {
  const root = assertProject(slug);
  const target = resolveSafe(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
  touchMeta(slug);
}

export function createFile(slug, rel) {
  const root = assertProject(slug);
  const target = resolveSafe(root, rel);
  if (fs.existsSync(target)) throw new HttpError(409, 'File already exists');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, '', 'utf8');
  touchMeta(slug);
  return { path: rel };
}

export function createFolder(slug, rel) {
  const root = assertProject(slug);
  const target = resolveSafe(root, rel);
  fs.mkdirSync(target, { recursive: true });
  touchMeta(slug);
  return { path: rel };
}

export function deleteFile(slug, rel) {
  const root = assertProject(slug);
  const target = resolveSafe(root, rel);
  if (!fs.existsSync(target)) throw new HttpError(404, 'Not found');
  fs.rmSync(target, { recursive: true, force: true });
  touchMeta(slug);
  return { path: rel };
}

export function renamePath(slug, from, to) {
  const root = assertProject(slug);
  const src = resolveSafe(root, from);
  const dest = resolveSafe(root, to);
  if (!fs.existsSync(src)) throw new HttpError(404, 'Source not found');
  if (fs.existsSync(dest)) throw new HttpError(409, 'Destination already exists');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
  touchMeta(slug);
  return { from, to };
}

export function saveUpload(slug, rel, file) {
  const root = assertProject(slug);
  const target = resolveSafe(root, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(file.path, target);
  fs.unlinkSync(file.path);
  touchMeta(slug);
  return { path: rel, size: file.size };
}

function touchMeta(slug) {
  const meta = path.join(projectPath(slug), META_FILE);
  const now = new Date();
  try { fs.utimesSync(meta, now, now); } catch {}
}

export { HIDDEN_DIRS };
