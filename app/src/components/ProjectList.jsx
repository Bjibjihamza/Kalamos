import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { timeAgo } from '../lib/format.js';
import CreateProjectModal from './CreateProjectModal.jsx';
import EmptyState from './ui/EmptyState.jsx';
import Skeleton from './ui/Skeleton.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  PlusIcon,
  DocIcon,
  PencilIcon,
  CopyIcon,
  TrashIcon,
  CheckIcon,
  SearchIcon,
  SpinnerIcon,
  FolderIcon,
} from './icons.jsx';

const SORTS = [
  { key: 'modified', label: 'Last modified' },
  { key: 'created', label: 'Date created' },
  { key: 'name', label: 'Name' },
];

export default function ProjectList({ onOpen }) {
  const [projects, setProjects] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('modified');
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const refresh = useCallback(async () => {
    const [p, t] = await Promise.all([api.listProjects(), api.listTemplates()]);
    setProjects(p);
    setTemplates(t);
  }, []);

  useEffect(() => {
    refresh().catch((e) => toast.error(e.message));
  }, [refresh, toast]);

  const filtered = useMemo(() => {
    if (!projects) return [];
    const q = query.trim().toLowerCase();
    const list = q ? projects.filter((p) => p.name.toLowerCase().includes(q)) : [...projects];
    list.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      const ka = sort === 'created' ? a.createdAt : a.modifiedAt;
      const kb = sort === 'created' ? b.createdAt : b.modifiedAt;
      return (kb || '').localeCompare(ka || '');
    });
    return list;
  }, [projects, query, sort]);

  async function handleDelete(p) {
    const ok = await confirm({
      title: `Delete “${p.name}”?`,
      message: 'This permanently deletes the project and all its files. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api.deleteProject(p.slug);
      toast.success('Project deleted');
      await refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(p) {
    try {
      const copy = await api.duplicateProject(p.slug);
      toast.success(`Duplicated as “${copy.name}”`);
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleRename(p) {
    if (!renaming || !renaming.trim()) return setRenaming(null);
    try {
      await api.renameProject(p.slug, renaming.trim());
      toast.success('Project renamed');
      setRenaming(null);
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const loading = projects === null;

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="logo">
          <img className="logo-image" src="/Logo.png" alt="" aria-hidden="true" />
          kalamos
        </h1>
        <div className="search-box">
          <SearchIcon size={14} />
          <input
            className="input search-input"
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="home-actions">
          <button className="btn primary" onClick={() => setShowCreate(true)}>
            <PlusIcon size={14} /> New project
          </button>
        </div>
      </header>

      <main className="home-main max">
        {loading ? (
          <div className="skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="project-card skeleton-card">
                <Skeleton height={16} width="70%" />
                <div style={{ marginTop: 12 }}><Skeleton height={18} width="40%" /></div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<DocIcon size={26} />}
            title="No projects yet"
            message="Create your first LaTeX project to start writing."
            action={
              <button className="btn primary" onClick={() => setShowCreate(true)}>
                <PlusIcon size={14} /> New project
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<SearchIcon size={26} />}
            title={`No results for “${query}”`}
            message="Try a different search term."
          />
        ) : (
          <>
            <div className="list-toolbar">
              <span className="result-count">{filtered.length} project{filtered.length > 1 ? 's' : ''}</span>
              <select className="input select" value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="project-grid">
              {filtered.map((p) => (
                <div key={p.slug} className="project-card">
                  <button className="project-card-body" onClick={() => onOpen(p.slug)}>
                    <div className="project-card-head">
                      <span className="project-card-icon"><FolderIcon size={16} /></span>
                      <div className="project-card-name">{p.name}</div>
                    </div>
                    <div className="project-card-meta">
                      <span className="status-pill neutral">{p.template || 'project'}</span>
                      {p.hasPdf && <span className="status-pill success">Compiled</span>}
                      <span className="card-time">{timeAgo(p.modifiedAt)}</span>
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
                            if (e.key === 'Enter') handleRename(p);
                            if (e.key === 'Escape') setRenaming(null);
                          }}
                        />
                        <button className="icon-btn" title="Save" onClick={() => handleRename(p)}>
                          <CheckIcon />
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="icon-btn" title="Rename" onClick={() => setRenaming(p.slug)}>
                          <PencilIcon />
                        </button>
                        <button className="icon-btn" title="Duplicate" onClick={() => handleDuplicate(p)}>
                          <CopyIcon />
                        </button>
                        <button className="icon-btn danger" title="Delete" disabled={busy} onClick={() => handleDelete(p)}>
                          <TrashIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
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
