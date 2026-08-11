import React from 'react';
import { XIcon } from './icons.jsx';

export default function TabsBar({ tabs, activePath, onSelect, onClose }) {
  if (tabs.length === 0) return null;
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.path}
          className={`tab ${t.path === activePath ? 'active' : ''}`}
          onClick={() => onSelect(t.path)}
        >
          <span>{t.path.split('/').pop()}</span>
          {t.dirty && <span className="dirty-dot" title="Unsaved changes" />}
          <span
            className="tab-close"
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onClose(t.path);
            }}
          >
            <XIcon size={12} />
          </span>
        </button>
      ))}
    </div>
  );
}
