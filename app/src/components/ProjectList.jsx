import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import CreateProjectModal from './CreateProjectModal.jsx';

export default function ProjectList({ onOpen }) {
  const [projects, setProjects] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [p, t] = await Promise.all([api.listProjects(), api.listTemplates()]);
    setProjects(p);
    setTemplates(t);
  }

  useEffect(() => {
    refresh().catch((e) => console.error(e));
  }, []);

  async function handleDelete(slug, name) {
    if (!window.confirm(`Delete project "${name}"? This cannot be undone.`)) return;
    await api.deleteProject(slug);
    await refresh();
  }

  async function handleDuplicate(slug) {
    await api.duplicateProject(slug);
    await refresh();
  }

  async function handleRename(slug) {
    if (!renaming || !renaming.trim()) return setRenaming(null);
    await api.renameProject(slug, renaming.trim());
    setRenaming(null);
    await refresh();
  }

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="logo">
          <span className="leaf">☘</span> preleaf
        </h1>
        <span className="tagline">Local LaTeX report space</span>
        <div className="home-actions">
          <button className="btn primary" onClick={() => setShowCreate(true)}>
            + New project
          </button>
        </div>
      </header>

      <main className="home-main">
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <p>No projects yet.</p>
            <button className="btn primary" onClick={() => setShowCreate(true)}>
              Create your first project
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {projects.map((p) => (
              <div key={p.slug} className="project-card">
                <button className="project-card-body" onClick={() => onOpen(p.slug)}>
                  <div className="project-card-name">{p.name}</div>
                  <div className="project-card-meta">
                    <span>{p.template || 'project'}</span>
                    {p.hasPdf && <span className="badge ok">compiled</span>}
                  </div>
                </button>
                <div className="project-card-actions">
                  {renaming === p.slug ? (
                    <>
                      <input
                        className="input rename-input"
                        defaultValue={p.name}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(p.slug);
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                      />
                      <button className="icon-btn" title="Save" onClick={() => handleRename(p.slug)}>✓</button>
                    </>
                  ) : (
                    <>
                      <button className="icon-btn" title="Rename" onClick={() => setRenaming(p.slug)}>✎</button>
                      <button className="icon-btn" title="Duplicate" onClick={() => handleDuplicate(p.slug)}>⧉</button>
                      <button className="icon-btn danger" title="Delete" onClick={() => handleDelete(p.slug, p.name)}>✕</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <CreateProjectModal
          templates={templates}
          onClose={() => setShowCreate(false)}
          onCreated={(slug) => {
            setShowCreate(false);
            onOpen(slug);
          }}
        />
      )}
    </div>
  );
}
