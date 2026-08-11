import React from 'react';
import Modal from './ui/Modal.jsx';

const SHORTCUTS = [
  ['Recompile', 'Ctrl + Enter'],
  ['Save all', 'Ctrl + S'],
  ['Command palette', 'Ctrl + K'],
  ['Jump to source (from PDF)', 'Click on the PDF'],
  ['Forward search (PDF)', 'Ctrl + Click in editor'],
  ['Close file tab', '× on tab'],
  ['Rename project', 'Click project title'],
];

export default function ShortcutsModal({ onClose }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} width={440}>
      <div className="shortcuts-list">
        {SHORTCUTS.map(([label, keys]) => (
          <div key={label} className="shortcut-row">
            <span>{label}</span>
            <span className="chip">{keys}</span>
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn primary" onClick={onClose}>Got it</button>
      </div>
    </Modal>
  );
}
