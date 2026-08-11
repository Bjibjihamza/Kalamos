import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import { asyncHandler, HttpError } from '../http.js';
import * as projects from '../services/projects.js';
import * as files from '../services/files.js';
import * as compile from '../services/compile.js';
import * as synctex from '../services/synctex.js';
import { buildDir } from '../services/compile.js';

const upload = multer({ dest: path.join(process.env.TEMP || '/tmp', 'kalamos-uploads') });

const router = Router();

router.get('/projects', asyncHandler(async (req, res) => {
  res.json(projects.listProjects());
}));

router.get('/templates', asyncHandler(async (req, res) => {
  res.json(projects.listTemplates());
}));

router.post('/projects', asyncHandler(async (req, res) => {
  const { name, template } = req.body || {};
  if (!name || !String(name).trim()) throw new HttpError(400, 'Project name is required');
  res.status(201).json(projects.createProject({ name: String(name).trim(), template }));
}));

router.post('/projects/:slug/duplicate', asyncHandler(async (req, res) => {
  res.status(201).json(projects.duplicateProject(req.params.slug));
}));

router.get('/projects/:slug', asyncHandler(async (req, res) => {
  const p = projects.getProject(req.params.slug);
  if (!p) throw new HttpError(404, 'Project not found');
  res.json(p);
}));

router.patch('/projects/:slug', asyncHandler(async (req, res) => {
  const { name } = req.body || {};
  if (!name || !String(name).trim()) throw new HttpError(400, 'Project name is required');
  res.json(projects.renameProject(req.params.slug, String(name).trim()));
}));

router.delete('/projects/:slug', asyncHandler(async (req, res) => {
  projects.deleteProject(req.params.slug);
  res.status(204).end();
}));

// ---- files ----
router.get('/projects/:slug/tree', asyncHandler(async (req, res) => {
  res.json(files.getTree(req.params.slug));
}));

router.get('/projects/:slug/file', asyncHandler(async (req, res) => {
  const rel = req.query.path;
  if (typeof rel !== 'string') throw new HttpError(400, 'path query is required');
  res.type('text/plain').send(files.readFile(req.params.slug, rel));
}));

router.put('/projects/:slug/file', asyncHandler(async (req, res) => {
  const rel = req.query.path;
  if (typeof rel !== 'string') throw new HttpError(400, 'path query is required');
  const content = req.body || '';
  const body = typeof content === 'string' ? content : JSON.stringify(content);
  files.writeFile(req.params.slug, rel, body);
  res.json({ path: rel, ok: true });
}));

router.post('/projects/:slug/file', asyncHandler(async (req, res) => {
  const rel = req.query.path;
  if (typeof rel !== 'string') throw new HttpError(400, 'path query is required');
  res.status(201).json(files.createFile(req.params.slug, rel));
}));

router.post('/projects/:slug/folder', asyncHandler(async (req, res) => {
  const rel = req.query.path;
  if (typeof rel !== 'string') throw new HttpError(400, 'path query is required');
  res.status(201).json(files.createFolder(req.params.slug, rel));
}));

router.delete('/projects/:slug/file', asyncHandler(async (req, res) => {
  const rel = req.query.path;
  if (typeof rel !== 'string') throw new HttpError(400, 'path query is required');
  res.json(files.deleteFile(req.params.slug, rel));
}));

router.post('/projects/:slug/rename', asyncHandler(async (req, res) => {
  const { from, to } = req.body || {};
  if (!from || !to) throw new HttpError(400, 'from and to are required');
  res.json(files.renamePath(req.params.slug, from, to));
}));

router.post('/projects/:slug/upload', upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded');
  const rel = req.query.path || '';
  const target = rel ? `${rel.replace(/\/+$/, '')}/${req.file.originalname}` : req.file.originalname;
  res.json(files.saveUpload(req.params.slug, target, req.file));
}));

// ---- compile & build artifacts ----
router.post('/projects/:slug/compile', asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  if (!projects.getProject(slug)) throw new HttpError(404, 'Project not found');
  const job = compile.enqueueCompile(slug);
  res.status(202).json({ slug, jobId: job.id, status: compile.compileStatus() });
}));

router.get('/projects/:slug/build/*', asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  const rel = req.params[0];
  if (!rel || rel.includes('..')) throw new HttpError(400, 'Invalid path');
  const file = path.join(buildDir(slug), rel);
  if (!file.startsWith(buildDir(slug))) throw new HttpError(400, 'Invalid path');
  res.sendFile(file);
}));

// ---- synctex ----
router.get('/projects/:slug/synctex/edit', asyncHandler(async (req, res) => {
  const { page, x, y } = req.query;
  res.json(synctex.pdfToSource(req.params.slug, {
    page: Number(page),
    x: Number(x),
    y: Number(y),
  }));
}));

router.get('/projects/:slug/synctex/view', asyncHandler(async (req, res) => {
  const { file, line } = req.query;
  res.json(synctex.sourceToPdf(req.params.slug, { file, line: Number(line) }));
}));

export default router;
