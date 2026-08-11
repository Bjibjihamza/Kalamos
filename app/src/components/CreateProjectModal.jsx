import React, { useState } from 'react';
import { api } from '../lib/api.js';
import Modal from './ui/Modal.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { SpinnerIcon } from './icons.jsx';

const TEMPLATE_INFO = {
  report: { label: 'Report / thesis', desc: 'Thesis-style structure with chapters, bibliography and figures' },
  article: { label: 'Article', desc: 'Compact scientific article' },
  blank: { label: 'Blank', desc: 'A minimal main.tex' },
};

export default function CreateProjectModal({ templates, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('report');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const p = await api.createProject({ name: name.trim(), template });
      toast.success(`Project “${p.name}” created`);
      onCreated(p.slug);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      title="New project"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" form="create-project-form" disabled={busy || !name.trim()}>
            {busy ? <SpinnerIcon size={14} /> : null}
            {busy ? 'Creating' : 'Create'}
          </button>
        </>
      }
    >
      <form id="create-project-form" onSubmit={submit}>
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
      </form>
    </Modal>
  );
}
