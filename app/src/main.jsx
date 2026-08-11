import React from 'react';
import ReactDOM from 'react-dom/client';
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import App from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ConfirmProvider } from './context/ConfirmContext.jsx';
import './styles.css';

self.MonacoEnvironment = {
  getWorker: () =>
    new Worker(new URL('monaco-editor/esm/vs/editor/editor.worker.js?worker', import.meta.url), {
      type: 'module',
    }),
};
loader.config({ monaco });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>
);
