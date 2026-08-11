import React, { useEffect, useMemo, useState } from 'react';
import { SearchIcon } from './icons.jsx';

export default function CommandPalette({ actions, onClose }) {
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);

  const filtered = useMemo(
    () => actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase())),
    [actions, query]
  );

  useEffect(() => setSel(0), [query]);

  function run(item) {
    onClose();
    item.run();
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(filtered.length - 1, s + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[sel]) run(filtered[sel]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="palette-input-wrap">
          <SearchIcon size={15} />
          <input
            autoFocus
            className="palette-input"
            placeholder="Type a command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <span className="chip">esc</span>
        </div>
        <div className="palette-list">
          {filtered.map((a, i) => (
            <button
              key={i}
              className={`palette-item ${i === sel ? 'active' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => run(a)}
            >
              {a.icon && <span className="palette-icon">{a.icon}</span>}
              <span className="palette-label">{a.label}</span>
              {a.shortcut && <span className="palette-shortcut">{a.shortcut}</span>}
            </button>
          ))}
          {filtered.length === 0 && <div className="palette-empty">No commands found</div>}
        </div>
      </div>
    </div>
  );
}
