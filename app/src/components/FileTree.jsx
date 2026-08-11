import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import ContextMenu from './ContextMenu.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import {
  ChevronRight,
  ChevronDown,
  FolderIcon,
  FileTexIcon,
  FileBibIcon,
  FileImgIcon,
  FileIcon,
  PlusIcon,
  FolderPlusIcon,
  UploadIcon,
  SearchIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  DocIcon,
} from './icons.jsx';

function fileIcon(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'tex') return <FileTexIcon />;
  if (ext === 'bib') return <FileBibIcon />;
  if (['png', 'jpg', 'jpeg', 'pdf', 'svg'].includes(ext)) return <FileImgIcon />;
  if (ext === 'cls' || ext === 'sty') return <FileTexIcon />;
  return <FileIcon />;
}

function dirOf(path) {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

function Node({ node, depth, activePath, onOpen, onContextMenu, renaming, onRenameCommit, onCancelRename }) {
  const [expanded, setExpanded] = useState(node.type === 'folder' && depth === 0);
  const indent = { paddingLeft: `${depth * 12 + 10}px` };

  if (node.type === 'folder') {
    return (
      <div>
        <button
          className="tree-row"
          style={indent}
          onClick={() => setExpanded((e) => !e)}
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, node);
          }}
        >
          <span className="chevron">{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
          <span className="file-icon"><FolderIcon size={14} /></span>
          <span className="tree-name">{node.name}</span>
        </button>
        {expanded &&
          node.children.map((c) => (
            <Node
              key={c.path}
              node={c}
              depth={depth + 1}
              activePath={activePath}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
              renaming={renaming}
              onRenameCommit={onRenameCommit}
              onCancelRename={onCancelRename}
            />
          ))}
      </div>
    );
  }

  const active = activePath === node.path;
  const isRenaming = renaming === node.path;
  return (
    <div style={{ position: 'relative' }}>
      <button
        className={`tree-row ${active ? 'active' : ''}`}
        style={indent}
        onClick={() => onOpen(node.path)}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, node);
        }}
      >
        <span className="chevron" />
        <span className="file-icon">{fileIcon(node.name)}</span>
        {isRenaming ? (
          <input
            className="input tree-rename"
            defaultValue={node.name}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameCommit(node, e.currentTarget.value);
              if (e.key === 'Escape') onCancelRename();
            }}
            onBlur={(e) => onRenameCommit(node, e.currentTarget.value)}
          />
        ) : (
          <span className="tree-name">{node.name}</span>
        )}
      </button>
    </div>
  );
}

function filterTree(nodes, q) {
  const query = q.toLowerCase();
  const out = [];
  for (const n of nodes) {
    if (n.type === 'folder') {
      const children = filterTree(n.children || [], query);
      if (children.length) out.push({ ...n, children });
      else if (n.name.toLowerCase().includes(query)) out.push({ ...n, children: [] });
    } else if (n.name.toLowerCase().includes(query)) {
      out.push(n);
    }
  }
  return out;
}

export default function FileTree({ tree, activePath, onOpen, onRefresh, slug, addSignal }) {
  const [adding, setAdding] = useState(null);
  const [menu, setMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [query, setQuery] = useState('');
  const confirm = useConfirm();
  const toast = useToast();

  useEffect(() => {
    if (addSignal) {
      setAdding({ kind: addSignal.kind, name: '', dir: addSignal.dir || '' });
    }
  }, [addSignal]);

  async function handleCreate(kind, dir = '') {
    if (!adding?.name) return;
    const name = adding.name;
    const path = dir || (adding.dir ? `${adding.dir}/${name}` : name);
    try {
      if (kind === 'file') await api.createFile(slug, path);
      else await api.createFolder(slug, path);
      toast.success(kind === 'file' ? 'File created' : 'Folder created');
      setAdding(null);
      await onRefresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await api.upload(slug, adding?.dir || '', file);
      toast.success(`Uploaded ${file.name}`);
      setAdding(null);
      await onRefresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      e.target.value = '';
    }
  }

  async function handleDelete(node) {
    const ok = await confirm({
      title: `Delete “${node.name}”?`,
      message: node.type === 'folder' ? 'The folder and its contents will be permanently deleted.' : 'This file will be permanently deleted.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.deleteFile(slug, node.path);
      toast.success('Deleted');
      if (activePath && (activePath === node.path || activePath.startsWith(node.path + '/'))) onRefresh();
      else await onRefresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function renameCommit(node, newName) {
    if (!renaming) return;
    setRenaming(null);
    const clean = newName.trim();
    if (!clean || clean === node.name) return;
    const dir = dirOf(node.path);
    const to = dir ? `${dir}/${clean}` : clean;
    if (to === node.path) return;
    try {
      await api.renamePath(slug, node.path, to);
      toast.success('Renamed');
      await onRefresh();
    } catch (e) {
      toast.error(e.message);
    }
  }

  function openContextMenu(e, node) {
    const items = [
      {
        label: node.type === 'folder' ? 'New file here' : 'New file',
        icon: <PlusIcon size={14} />,
        onClick: () => {
          const dir = node.type === 'folder' ? node.path : dirOf(node.path);
          setAdding({ kind: 'file', name: '', dir });
        },
      },
      {
        label: node.type === 'folder' ? 'New folder here' : 'New folder',
        icon: <FolderPlusIcon size={14} />,
        onClick: () => {
          const dir = node.type === 'folder' ? node.path : dirOf(node.path);
          setAdding({ kind: 'folder', name: '', dir });
        },
      },
      {
        label: 'Upload here',
        icon: <UploadIcon size={14} />,
        onClick: () => {
          const dir = node.type === 'folder' ? node.path : dirOf(node.path);
          setAdding({ kind: 'upload', dir });
        },
      },
      { separator: true },
      {
        label: 'Rename',
        icon: <PencilIcon size={14} />,
        onClick: () => setRenaming(node.path),
      },
      {
        label: 'Delete',
        icon: <TrashIcon size={14} />,
        danger: true,
        onClick: () => handleDelete(node),
      },
    ];
    setMenu({ x: e.clientX, y: e.clientY, items });
  }

  const visibleTree = useMemo(() => (query.trim() ? filterTree(tree?.children || [], query.trim()) : tree?.children || []), [tree, query]);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span>Files</span>
        <button className="icon-btn" title="New file" onClick={() => setAdding((a) => (a?.kind === 'file' ? null : { kind: 'file', name: '', dir: '' }))}>
          <PlusIcon size={14} />
        </button>
        <button className="icon-btn" title="New folder" onClick={() => setAdding((a) => (a?.kind === 'folder' ? null : { kind: 'folder', name: '', dir: '' }))}>
          <FolderPlusIcon size={14} />
        </button>
        <button className="icon-btn" title="Upload file" onClick={() => setAdding((a) => (a?.kind === 'upload' ? null : { kind: 'upload', dir: '' }))}>
          <UploadIcon size={14} />
        </button>
      </div>

      <div className="tree-search">
        <SearchIcon size={13} />
        <input
          className="input"
          placeholder="Filter files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
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
                  if (e.key === 'Enter') handleCreate(adding.kind, adding.dir);
                  if (e.key === 'Escape') setAdding(null);
                }}
              />
              <button className="btn sm" onClick={() => handleCreate(adding.kind, adding.dir)}>Create</button>
            </>
          )}
        </div>
      )}

      <div className="tree">
        {visibleTree.length === 0 ? (
          <div className="tree-empty">
            <DocIcon size={18} />
            {tree ? (query ? 'No matching files' : 'No files yet') : 'Loading…'}
          </div>
        ) : (
          visibleTree.map((c) => (
            <Node
              key={c.path}
              node={c}
              depth={0}
              activePath={activePath}
              onOpen={onOpen}
              onContextMenu={openContextMenu}
              renaming={renaming}
              onRenameCommit={renameCommit}
              onCancelRename={() => setRenaming(null)}
            />
          ))
        )}
      </div>

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
    </aside>
  );
}
