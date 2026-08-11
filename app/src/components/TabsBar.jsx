import React from 'react';

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
            onClick={(e) => {
              e.stopPropagation();
              onClose(t.path);
            }}
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
}
