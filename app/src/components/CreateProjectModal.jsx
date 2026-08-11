import React, { useState } from 'react';
import { api } from '../lib/api.js';

const TEMPLATE_INFO = {
  report: { label: 'Rapport / mémoire', desc: 'Structure type mémoire (chapitres, biblio, figures)' },
  article: { label: 'Article', desc: 'Article scientifique compact' },
  blank: { label: 'Vierge', desc: 'Un simple main.tex vide' },
};

export default function CreateProjectModal({ templates, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('report');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const p = await api.createProject({ name: name.trim(), template });
      onCreated(p.slug);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>New project</h2>
        <label className="field">
          <span>Project name</span>
          <input
            className="input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. rapport-master-2026"
          />
        </label>
        <div className="field">
          <span>Template</span>
          <div className="template-list">
            {templates.map((t) => (
              <button
                type="button"
                key={t}
                className={`template-card ${template === t ? 'selected' : ''}`}
                onClick={() => setTemplate(t)}
              >
                <div className="template-name">{TEMPLATE_INFO[t]?.label || t}</div>
                <div className="template-desc">{TEMPLATE_INFO[t]?.desc}</div>
              </button>
            ))}
          </div>
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy || !name.trim()}>
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
