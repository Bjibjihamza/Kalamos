import React from 'react';

export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="empty-state">
      {icon && <span className="empty-icon">{icon}</span>}
      <h2>{title}</h2>
      {message && <p>{message}</p>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}
