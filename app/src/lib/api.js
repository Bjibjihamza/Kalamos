const BASE = '/api';

async function request(method, url, body, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  let payload = body;
  if (body !== undefined && !(body instanceof FormData)) {
    if (typeof body === 'string') headers['Content-Type'] = 'text/plain; charset=utf-8';
    else {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }
  const res = await fetch(BASE + url, { method, headers, body: payload });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = j.error || msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  listProjects: () => request('GET', '/projects'),
  listTemplates: () => request('GET', '/templates'),
  getProject: (slug) => request('GET', `/projects/${encodeURIComponent(slug)}`),
  createProject: (data) => request('POST', '/projects', data),
  duplicateProject: (slug) => request('POST', `/projects/${encodeURIComponent(slug)}/duplicate`),
  renameProject: (slug, name) => request('PATCH', `/projects/${encodeURIComponent(slug)}`, { name }),
  deleteProject: (slug) => request('DELETE', `/projects/${encodeURIComponent(slug)}`),
  compile: (slug) => request('POST', `/projects/${encodeURIComponent(slug)}/compile`),

  getTree: (slug) => request('GET', `/projects/${encodeURIComponent(slug)}/tree`),
  readFile: (slug, p) =>
    request('GET', `/projects/${encodeURIComponent(slug)}/file?path=${encodeURIComponent(p)}`),
  writeFile: (slug, p, content) =>
    request('PUT', `/projects/${encodeURIComponent(slug)}/file?path=${encodeURIComponent(p)}`, content),
  createFile: (slug, p) =>
    request('POST', `/projects/${encodeURIComponent(slug)}/file?path=${encodeURIComponent(p)}`),
  createFolder: (slug, p) =>
    request('POST', `/projects/${encodeURIComponent(slug)}/folder?path=${encodeURIComponent(p)}`),
  deleteFile: (slug, p) =>
    request('DELETE', `/projects/${encodeURIComponent(slug)}/file?path=${encodeURIComponent(p)}`),
  renamePath: (slug, from, to) =>
    request('POST', `/projects/${encodeURIComponent(slug)}/rename`, { from, to }),
  upload: (slug, dir, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request('POST', `/projects/${encodeURIComponent(slug)}/upload?path=${encodeURIComponent(dir)}`, fd);
  },

  synctexEdit: (slug, page, x, y) =>
    request('GET', `/projects/${encodeURIComponent(slug)}/synctex/edit?page=${page}&x=${x}&y=${y}`),
  synctexView: (slug, file, line) =>
    request('GET', `/projects/${encodeURIComponent(slug)}/synctex/view?file=${encodeURIComponent(file)}&line=${line}`),

  pdfUrl: (slug, cacheBust) =>
    `/api/projects/${encodeURIComponent(slug)}/build/main.pdf?t=${cacheBust || Date.now()}`,
};
