import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { projectPath, getProject } from './projects.js';
import { DOCKER_CONTAINER, DEFAULT_MAIN } from '../config.js';
import { HttpError } from '../http.js';

function run(slug, args) {
  const project = getProject(slug);
  if (!project) throw new HttpError(404, 'Project not found');
  try {
    const out = execFileSync('docker', ['exec', '-w', `/projects/${slug}`, DOCKER_CONTAINER, ...args], {
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true,
    });
    return parseSyncTeX(out);
  } catch (err) {
    if (err.stderr && /Error: No synctex/.test(String(err.stderr))) {
      return { error: 'SyncTeX file not found. Compile with SyncTeX enabled.' };
    }
    if (err.message && /is not running/.test(err.message)) {
      throw new HttpError(503, 'Compilation container is not running');
    }
    return { error: String(err.stderr || err.message) };
  }
}

function parseSyncTeX(out) {
  const result = { blocks: [] };
  const lines = String(out).split('\n');
  let current = null;
  const startRe = /^SyncTeX result begin/;
  const endRe = /^SyncTeX result end/;
  const keyRe = /^(\w+):(.*)$/;

  for (const raw of lines) {
    const line = raw.trim();
    if (startRe.test(line)) { current = {}; continue; }
    if (endRe.test(line)) { if (current) result.blocks.push(current); current = null; continue; }
    if (!current) continue;
    const m = line.match(keyRe);
    if (m) current[m[1]] = m[2].trim();
  }
  return result;
}

// PDF click -> source (inverse / "edit")
export function pdfToSource(slug, { page, x, y, pdf = `${DEFAULT_MAIN.replace(/\.tex$/, '')}.pdf` }) {
  const pdfRel = path.posix.join('.build', pdf);
  const result = run(slug, ['synctex', 'edit', '-o', `${page}:${x}:${y}:${pdfRel}`, '-d', '-1']);
  const block = result.blocks && result.blocks[0];
  if (!block) throw new HttpError(404, 'No SyncTeX match');
  return { file: toRelativePath(slug, block.Input) || null, line: block.Line ? parseInt(block.Line, 10) : null, block };
}

function toRelativePath(slug, input) {
  if (typeof input !== 'string') return null;
  const prefix = `/projects/${slug}/`;
  let rel = input.startsWith(prefix) ? input.slice(prefix.length) : input;
  rel = rel.replace(/^\.\//, '').replace(/\/\.\//g, '/');
  return rel || null;
}

// source line -> PDF (forward / "view")
export function sourceToPdf(slug, { file, line, col = 1 }) {
  const result = run(slug, ['synctex', 'view', '-i', `${line}:${col}:${file}`, '-o', `.build/${DEFAULT_MAIN.replace(/\.tex$/, '')}.pdf`, '-d', '-1']);
  const block = result.blocks && result.blocks[0];
  if (!block) throw new HttpError(404, 'No SyncTeX match');
  return {
    page: block.Page ? parseInt(block.Page, 10) : null,
    x: block.x ? parseFloat(block.x) : 0,
    y: block.y ? parseFloat(block.y) : 0,
    h: block.h ? parseFloat(block.h) : 0,
    v: block.v ? parseFloat(block.v) : 0,
    block,
  };
}
