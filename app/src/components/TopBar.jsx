import React, { useState } from 'react';

const STATE_LABEL = {
  idle: 'Idle',
  running: 'Compiling…',
  success: 'Ready',
  error: 'Errors',
};

export default function TopBar({ project, renaming, setRenaming, onRename, compile, onCompile, onBack, onToggleLog }) {
  const [name, setName] = useState('');

  const errCount = compile.errors.length;
  const warnCount = compile.warnings.length;

  return (
    <header className="topbar">
      <button className="icon-btn back" title="Back to projects" onClick={onBack}>‹</button>
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

      <div className={`compile-status ${compile.state}`}>
        <span className="dot" />
        {STATE_LABEL[compile.state]}
        {errCount > 0 && <span className="count err">{errCount} error{errCount > 1 ? 's' : ''}</span>}
        {warnCount > 0 && <span className="count warn">{warnCount}</span>}
      </div>

      <button className="btn sm" onClick={onToggleLog}>Log</button>
      <button className="btn primary" onClick={onCompile} disabled={compile.state === 'running'}>
        {compile.state === 'running' ? 'Compiling…' : 'Recompile'}
      </button>
    </header>
  );
}
