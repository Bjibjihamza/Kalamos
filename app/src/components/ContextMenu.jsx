import React, { useEffect, useRef } from 'react';

export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - rect.width - 8);
    const top = Math.min(y, window.innerHeight - rect.height - 8);
    menu.style.left = `${Math.max(4, left)}px`;
    menu.style.top = `${Math.max(4, top)}px`;
  }, [x, y]);

  return (
    <>
      <div className="context-backdrop" onClick={onClose} />
      <div className="context-menu" ref={ref} role="menu">
        {items.map((item, i) =>
          item.separator ? (
            <div key={i} className="context-sep" />
          ) : (
            <button
              key={i}
              className={`context-item ${item.danger ? 'danger' : ''}`}
              role="menuitem"
              onClick={() => {
                onClose();
                item.onClick?.();
              }}
            >
              {item.icon && <span className="context-icon">{item.icon}</span>}
              {item.label}
            </button>
          )
        )}
      </div>
    </>
  );
}
