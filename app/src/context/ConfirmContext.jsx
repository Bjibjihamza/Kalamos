import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertIcon } from '../components/icons.jsx';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      setState({
        title: opts.title || 'Are you sure?',
        message: opts.message || '',
        confirmLabel: opts.confirmLabel || 'Confirm',
        danger: opts.danger !== false,
        resolve,
      });
    });
  }, []);

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="modal-backdrop"
          onClick={() => close(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close(false);
          }}
        >
          <div
            className="modal confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-label={state.title}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-head">
              <span className={`confirm-icon ${state.danger ? 'danger' : ''}`}>
                <AlertIcon size={18} />
              </span>
              <div>
                <h2>{state.title}</h2>
                {state.message && <p className="confirm-msg">{state.message}</p>}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => close(false)}>Cancel</button>
              <button className={`btn ${state.danger ? 'danger' : 'primary'}`} onClick={() => close(true)} autoFocus>
                {state.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
