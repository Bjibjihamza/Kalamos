import React, { useState } from 'react';
import { ArrowLeftIcon, PlayIcon, TerminalIcon, HelpIcon, SearchIcon } from './icons.jsx';

const STATE_LABEL = {
  idle: 'Idle',
  running: 'Compiling',
  success: 'Ready',
  error: 'Errors',
};

export default function TopBar({ project, renaming, setRenaming, onRename, compile, onCompile, onBack, onToggleLog, onOpenPalette, onOpenShortcuts }) {
  const [name, setName] = useState('');

  const errCount = compile.errors.length;
  const warnCount = compile.warnings.length;
  const stateClass =
    compile.state === 'running' ? 'running' :
    compile.state === 'success' ? 'success' :
    compile.state === 'error' ? 'danger' : 'neutral';

  return (
    <header className="topbar">
      <button className="icon-btn" title="Back to projects" onClick={onBack}>
        <ArrowLeftIcon size={16} />
      </button>
      {renaming ? (
        <div className="rename-inline">
          <input
            className="input"
            defaultValue={project?.name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRename(name || project.name);
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
          <button className="btn sm" onClick={() => onRename(name || project.name)}>Save</button>
          <button className="btn sm" onClick={() => setRenaming(false)}>Cancel</button>
        </div>
      ) : (
        <button className="project-title" title="Rename project" onClick={() => { setName(project?.name); setRenaming(true); }}>
          {project?.name || '…'}
        </button>
      )}

      <div className="topbar-spacer" />

      <span className={`status-pill ${stateClass}`}>
        <span className="dot" />
        {STATE_LABEL[compile.state]}
      </span>
      {errCount > 0 && <span className="status-pill danger">{errCount} error{errCount > 1 ? 's' : ''}</span>}
      {warnCount > 0 && <span className="status-pill warning">{warnCount} warn</span>}

      <button className="icon-btn" title="Toggle log" onClick={onToggleLog}>
        <TerminalIcon size={15} />
      </button>
      <button className="icon-btn" title="Command palette (Ctrl+K)" onClick={onOpenPalette}>
        <SearchIcon size={15} />
      </button>
      <button className="icon-btn" title="Keyboard shortcuts" onClick={onOpenShortcuts}>
        <HelpIcon size={15} />
      </button>
      <button className="btn primary" onClick={onCompile} disabled={compile.state === 'running'}>
        <PlayIcon size={13} />
        {compile.state === 'running' ? 'Compiling' : 'Recompile'}
      </button>
    </header>
  );
}
