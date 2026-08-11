import React, { useState } from 'react';
import { api } from '../lib/api.js';

function Node({ node, depth, activePath, onOpen }) {
  const [expanded, setExpanded] = useState(node.type === 'folder' && depth === 0);
  const indent = { paddingLeft: `${depth * 12 + 8}px` };

  if (node.type === 'folder') {
    return (
      <div>
        <button className="tree-row" style={indent} onClick={() => setExpanded((e) => !e)}>
          <span className="chevron">{expanded ? '▾' : '▸'}</span>
          <span className="folder-icon">📁</span>
          <span className="tree-name">{node.name}</span>
        </button>
        {expanded &&
          node.children.map((c) => (
            <Node key={c.path} node={c} depth={depth + 1} activePath={activePath} onOpen={onOpen} />
          ))}
      </div>
    );
  }
  const active = activePath === node.path;
  return (
    <button className={`tree-row ${active ? 'active' : ''}`} style={indent} onClick={() => onOpen(node.path)}>
      <span className="chevron" />
      <span className="file-icon">{fileIcon(node.name)}</span>
      <span className="tree-name">{node.name}</span>
    </button>
  );
}

function fileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'tex') return '📘';
  if (ext === 'bib') return '📚';
  if (['png', 'jpg', 'jpeg', 'pdf', 'svg'].includes(ext)) return '🖼';
  if (ext === 'cls' || ext === 'sty') return '🧩';
  return '📄';
}

export default function FileTree({ tree, activePath, onOpen, onRefresh, slug }) {
  const [adding, setAdding] = useState(null);

  function nodePath(node) {
    return node.path || '';
  }

  const findMainDir = () => {
    if (!tree) return '';
    return '';
  };

  async function handleCreate(kind) {
    if (!adding?.name) return;
    const base = adding.dir || '';
    const name = adding.name;
    const path = base ? `${base}/${name}` : name;
    try {
      if (kind === 'file') await api.createFile(slug, path);
      else await api.createFolder(slug, path);
      setAdding(null);
      await onRefresh();
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.upload(slug, adding?.dir || '', file);
      setAdding(null);
      await onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      e.target.value = '';
    }
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Files</span>
        <button className="icon-btn" title="New file" onClick={() => setAdding((a) => (a?.kind === 'file' ? null : { kind: 'file', name: '', dir: '' }))}>+</button>
        <button className="icon-btn" title="New folder" onClick={() => setAdding((a) => (a?.kind === 'folder' ? null : { kind: 'folder', name: '', dir: '' }))}>▁</button>
        <button className="icon-btn" title="Upload file" onClick={() => setAdding((a) => (a?.kind === 'upload' ? null : { kind: 'upload', dir: '' }))}>↑</button>
      </div>

      {adding && (
        <div className="add-panel">
          {adding.kind === 'upload' ? (
            <label className="upload-btn">
              Choose file…
              <input type="file" style={{ display: 'none' }} onChange={handleUpload} />
            </label>
          ) : (
            <>
              <input
                className="input"
                placeholder={adding.kind === 'file' ? 'filename.tex' : 'folder name'}
                value={adding.name}
                autoFocus
                onChange={(e) => setAdding({ ...adding, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate(adding.kind);
                  if (e.key === 'Escape') setAdding(null);
                }}
              />
              <button className="btn sm" onClick={() => handleCreate(adding.kind)}>Create</button>
            </>
          )}
        </div>
      )}

      <div className="tree">
        {tree &&
          tree.children.map((c) => (
            <Node key={c.path} node={c} depth={0} activePath={activePath} onOpen={onOpen} />
          ))}
      </div>
    </aside>
  );
}
