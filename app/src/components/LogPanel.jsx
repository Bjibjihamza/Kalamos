import React, { useEffect, useRef } from 'react';

export default function LogPanel({ compile, onClose, onJump }) {
  const boxRef = useRef(null);
  const { state, errors, warnings, log } = compile;

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [log, errors]);

  const openFile = (err) => {
    if (err?.file) onJump(err.file);
  };

  return (
    <div className="log-panel">
      <div className="log-header">
        <div className="log-tabs">
          {errors.length > 0 && <span className="log-tab err">{errors.length} errors</span>}
          {warnings.length > 0 && <span className="log-tab warn">{warnings.length} warnings</span>}
          <span className="log-tab">log</span>
        </div>
        <button className="icon-btn" onClick={onClose}>×</button>
      </div>
      {errors.length > 0 && (
        <div className="error-list">
          {errors.map((err, i) => (
            <button key={i} className="error-item" onClick={() => openFile(err)}>
              <span className="error-msg">{err.message}</span>
              {err.file && (
                <span className="error-loc">
                  {err.file}
                  {err.line ? `:${err.line}` : ''}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <pre className="log-body" ref={boxRef}>
        {state === 'running' ? 'Compiling…\n' : ''}
        {log.join('\n')}
      </pre>
    </div>
  );
}
