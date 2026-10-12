import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import supertest from 'supertest';

let request;
let dataDir;
let tmplDir;

const blankTemplate = `\\documentclass[11pt,a4paper]{article}\n\\begin{document}\nHello.\n\\end{document}\n`;

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalamos-data-'));
  tmplDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kalamos-tmpl-'));
  for (const name of ['blank', 'article', 'report']) {
    fs.mkdirSync(path.join(tmplDir, name));
  }
  fs.writeFileSync(path.join(tmplDir, 'blank', 'main.tex'), blankTemplate);
  fs.writeFileSync(path.join(tmplDir, 'article', 'main.tex'), blankTemplate);
  fs.writeFileSync(path.join(tmplDir, 'report', 'main.tex'), blankTemplate);

  process.env.KALAMOS_PROJECTS = dataDir;
  process.env.KALAMOS_TEMPLATES = tmplDir;

  const { createApp } = await import('../src/app.js');
  request = supertest(createApp().app);
});

afterAll(() => {
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.rmSync(tmplDir, { recursive: true, force: true });
});

describe('templates', () => {
  it('lists available templates', async () => {
    const res = await request.get('/api/templates');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.arrayContaining(['blank', 'article', 'report']));
  });
});

describe('projects', () => {
  it('creates a project from a template', async () => {
    const res = await request.post('/api/projects').send({ name: 'My Report', template: 'report' });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('my-report');
    expect(res.body.name).toBe('My Report');
    expect(res.body.mainFile).toBe('main.tex');
  });

  it('rejects creation without a name', async () => {
    const res = await request.post('/api/projects').send({});
    expect(res.status).toBe(400);
  });

  it('rejects duplicate slugs', async () => {
    const res = await request.post('/api/projects').send({ name: 'My Report' });
    expect(res.status).toBe(409);
  });

  it('lists projects', async () => {
    const res = await request.get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('slug');
    expect(res.body[0]).toHaveProperty('name');
  });

  it('lists imported projects without metadata and preserves uppercase slugs', async () => {
    const imported = path.join(dataDir, 'CDCs');
    fs.mkdirSync(imported, { recursive: true });
    fs.writeFileSync(path.join(imported, 'main.tex'), blankTemplate);

    const res = await request.get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: 'CDCs', name: 'CDCs' }),
    ]));

    const project = await request.get('/api/projects/CDCs');
    expect(project.status).toBe(200);
    expect(project.body.slug).toBe('CDCs');
  });

  it('renames a project', async () => {
    const res = await request.patch('/api/projects/my-report').send({ name: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed');
  });

  it('duplicates a project', async () => {
    const res = await request.post('/api/projects/my-report/duplicate');
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('renamed-copie');
  });

  it('returns 404 for a missing project', async () => {
    const res = await request.get('/api/projects/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('deletes a project', async () => {
    const res = await request.delete('/api/projects/my-report');
    expect(res.status).toBe(204);
    const after = await request.get('/api/projects/my-report');
    expect(after.status).toBe(404);
  });
});

describe('files', () => {
  let slug;
  beforeAll(async () => {
    const res = await request.post('/api/projects').send({ name: 'File Test', template: 'blank' });
    slug = res.body.slug;
  });

  it('reads the file tree', async () => {
    const res = await request.get(`/api/projects/${slug}/tree`);
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(slug);
    expect(res.body.children.some((f) => f.path === 'main.tex')).toBe(true);
  });

  it('reads a file', async () => {
    const res = await request.get(`/api/projects/${slug}/file?path=main.tex`);
    expect(res.status).toBe(200);
    expect(res.text).toContain('documentclass');
  });

  it('writes text/plain content', async () => {
    const content = '\\documentclass{article}\n\\begin{document}\nUpdated.\n\\end{document}\n';
    const res = await request
      .put(`/api/projects/${slug}/file?path=main.tex`)
      .set('Content-Type', 'text/plain')
      .send(content);
    expect(res.status).toBe(200);
    const read = await request.get(`/api/projects/${slug}/file?path=main.tex`);
    expect(read.text).toContain('Updated.');
  });

  it('creates and renames files', async () => {
    const create = await request.post(`/api/projects/${slug}/file?path=notes.txt`);
    expect(create.status).toBe(201);
    const rename = await request.post(`/api/projects/${slug}/rename`).send({ from: 'notes.txt', to: 'notes.md' });
    expect(rename.status).toBe(200);
    const tree = await request.get(`/api/projects/${slug}/tree`);
    expect(tree.body.children.some((f) => f.path === 'notes.md')).toBe(true);
  });

  it('blocks path traversal', async () => {
    const res = await request.get(`/api/projects/${slug}/file?path=../secret.txt`);
    expect(res.status).toBe(400);
  });

  it('blocks writes under protected dirs', async () => {
    const res = await request.post(`/api/projects/${slug}/file?path=.preleaf/evil.txt`);
    expect(res.status).toBe(403);
  });

  it('deletes a file', async () => {
    const res = await request.delete(`/api/projects/${slug}/file?path=notes.md`);
    expect(res.status).toBe(200);
    const tree = await request.get(`/api/projects/${slug}/tree`);
    expect(tree.body.children.some((f) => f.path === 'notes.md')).toBe(false);
  });
});

describe('compile', () => {
  it('rejects a main file outside the project', async () => {
    const res = await request
      .post('/api/projects/file-test/compile')
      .send({ mainFile: '../main.tex' });
    expect(res.status).toBe(400);
  });

  it('enqueues a compile and returns 202', async () => {
    const res = await request.post('/api/projects/file-test/compile');
    expect(res.status).toBe(202);
    expect(res.body).toHaveProperty('jobId');
    expect(res.body.slug).toBe('file-test');
  });
});
