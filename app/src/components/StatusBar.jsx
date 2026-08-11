import React from 'react';
import { languageOf } from '../lib/latex.js';

export default function StatusBar({ path, cursor, saveState, autoCompile, onToggleAutoCompile, compileMs }) {
  return (
    <div className="statusbar">
      <span className="statusbar-name" title={path || undefined}>{path ? path.split('/').pop() : 'No file open'}</span>
      {cursor && <span className="statusbar-dim">Ln {cursor.lineNumber}, Col {cursor.column}</span>}
      {path && <span className="statusbar-dim">{languageOf(path)}</span>}
      {compileMs != null && <span className="statusbar-dim">compile {compileMs}ms</span>}
      <div className="statusbar-spacer" />
      {saveState === 'dirty' && <span className="statusbar-save dirty">Unsaved</span>}
      {saveState === 'saving' && <span className="statusbar-save">Saving…</span>}
      {saveState === 'saved' && <span className="statusbar-save">Saved</span>}
      <button className="statusbar-toggle" onClick={onToggleAutoCompile} title="Toggle automatic compilation on save">
        Auto-compile {autoCompile ? 'on' : 'off'}
      </button>
    </div>
  );
}
