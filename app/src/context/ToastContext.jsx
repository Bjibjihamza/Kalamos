import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckIcon, AlertIcon, XIcon } from '../components/icons.jsx';

const ToastContext = createContext(null);

let seed = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++seed;
      setToasts((t) => [...t, { id, type, message }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (m) => push('success', m),
      error: (m) => push('error', m),
      info: (m) => push('info', m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' ? <CheckIcon size={15} /> : <AlertIcon size={15} />}
            </span>
            <span className="toast-msg">{t.message}</span>
            <button className="icon-btn" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <XIcon size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
