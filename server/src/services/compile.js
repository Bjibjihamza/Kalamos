import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { projectPath, getProject } from './projects.js';
import { DOCKER_CONTAINER, COMPOSE_FILE, DEFAULT_MAIN } from '../config.js';
import { events } from '../events.js';
import { execSync } from 'node:child_process';

let queue = [];
let running = false;

const TEX_DIRS = ['.build', '.latexmkrc'];
const BUILD_DIR = '.build';

export function enqueueCompile(slug) {
  const job = { slug, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  queue.push(job);
  if (!running) {
    running = true;
    drain();
  }
  return job;
}

export function compileStatus() {
  return { queued: queue.length, running };
}

async function drain() {
  while (queue.length) {
    const job = queue.shift();
    try {
      await runCompile(job);
    } catch (err) {
      events.emit('compile:done', { slug: job.slug, jobId: job.id, success: false, error: err.message });
    }
  }
  running = false;
}

export function buildDir(slug) {
  return path.join(projectPath(slug), BUILD_DIR);
}

function ensureContainer() {
  try {
    execSync(`docker exec ${DOCKER_CONTAINER} echo ok`, { stdio: 'ignore' });
    return true;
  } catch {
    // container missing or stopped
  }
  try {
    execSync(`docker start ${DOCKER_CONTAINER}`, { stdio: 'ignore' });
    return true;
  } catch {
    // not created yet — try compose up
  }
  try {
    execSync(`docker compose -f "${COMPOSE_FILE}" up -d latex`, { stdio: 'ignore', timeout: 120000 });
    return true;
  } catch {
    return false;
  }
}

async function runCompile(job) {
  const { slug, id } = job;
  const project = getProject(slug);
  if (!project) throw new Error('Project not found');

  const mainFile = project.mainFile || DEFAULT_MAIN;
  const root = projectPath(slug);
  fs.mkdirSync(buildDir(slug), { recursive: true });

  const started = Date.now();
  events.emit('compile:start', { slug, jobId: id });

  if (!ensureContainer()) {
    events.emit('compile:done', {
      slug, jobId: id, success: false,
      error: 'Compilation container is not running. Start it with: docker compose up -d',
    });
    return;
  }

  const args = [
    'exec', '-w', `/projects/${slug}`, DOCKER_CONTAINER,
    'latexmk',
    // If the project ships its own .latexmkrc (e.g. XeLaTeX projects), let
    // latexmk honour its engine settings instead of forcing pdflatex.
    ...(fs.existsSync(path.join(root, '.latexmkrc')) ? [] : ['-pdf']),
    '-interaction=nonstopmode', '-synctex=1',
    `-outdir=${BUILD_DIR}`, mainFile,
  ];

  const proc = spawn('docker', args, { windowsHide: true });
  let stdoutChunk = '';
  let stderrChunk = '';
  const liveErrors = [];
  const liveWarnings = [];

  proc.stdout.on('data', (d) => {
    const text = d.toString();
    stdoutChunk += text;
    const lines = stdoutChunk.split('\n');
    stdoutChunk = lines.pop();
    const out = [];
    for (const line of lines) {
      classifyLine(line, liveErrors, liveWarnings);
      out.push(line);
    }
    if (out.length) events.emit('compile:log', { slug, jobId: id, text: out.join('\n') });
  });

  proc.stderr.on('data', (d) => {
    stderrChunk += d.toString();
  });

  const code = await new Promise((resolve) => {
    proc.on('close', resolve);
    proc.on('error', (err) => {
      events.emit('compile:log', { slug, jobId: id, text: `[docker] ${err.message}` });
      resolve(-1);
    });
  });

  if (stdoutChunk) {
    const lines = stdoutChunk.split('\n');
    const out = [];
    for (const line of lines) {
      classifyLine(line, liveErrors, liveWarnings);
      out.push(line);
    }
    events.emit('compile:log', { slug, jobId: id, text: out.join('\n') });
  }
  if (stderrChunk.trim()) {
    events.emit('compile:log', { slug, jobId: id, text: `[stderr] ${stderrChunk}` });
  }

  const baseName = path.basename(mainFile).replace(/\.tex$/, '');
  const parsed = parseLog(path.join(buildDir(slug), `${baseName}.log`));
  const errors = parsed.errors.length ? parsed.errors : liveErrors;
  const warnings = mergeWarnings(parsed.warnings, liveWarnings);
  const pdfPath = path.join(buildDir(slug), `${baseName}.pdf`);
  const success = code === 0 && fs.existsSync(pdfPath);

  events.emit('compile:done', {
    slug,
    jobId: id,
    success,
    errors,
    warnings,
    elapsedMs: Date.now() - started,
    pdfUrl: success ? `/api/projects/${slug}/build/${path.basename(pdfPath)}` : null,
  });
}

function classifyLine(line, errors, warnings) {
  const m = line.match(/^! (.+)$/);
  if (m) {
    errors.push({ message: m[1], line: null });
  } else if (/^(LaTeX|Package \S+) Warning:/.test(line)) {
    warnings.push(line.trim());
  } else if (/^Package \S+ Error:/.test(line)) {
    errors.push({ message: line.trim() });
  }
}

function mergeWarnings(parsed, live) {
  const seen = new Set(parsed.map((w) => w));
  const merged = [...parsed];
  for (const w of live) {
    if (!seen.has(w)) merged.push(w);
  }
  return merged.slice(0, 200);
}

function parseLog(logPath) {
  const errors = [];
  const warnings = [];
  if (!fs.existsSync(logPath)) return { errors, warnings };
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  let currentFile = null;
  let errorIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = line.match(/^\(([^\s]+\.tex)/);
    if (open) currentFile = open[1];
    else if (line.trim() === ')') currentFile = null;

    const m = line.match(/^! (.+)$/);
    if (m) {
      const err = { message: m[1], file: currentFile, line: null };
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        const lm = lines[j].match(/^l\.(\d+)/);
        if (lm) { err.line = parseInt(lm[1], 10); break; }
        if (lines[j].startsWith('!')) break;
      }
      errors.push(err);
      if (++errorIdx > 100) break;
    } else if (/^Package \S+ Error:/.test(line)) {
      errors.push({ message: line.trim(), file: currentFile, line: null });
    } else if (/^(LaTeX|Package \S+) Warning:/.test(line)) {
      warnings.push(line.trim());
    }
  }
  return { errors, warnings };
}

export { TEX_DIRS };
