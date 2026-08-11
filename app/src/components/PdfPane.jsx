import React from 'react';
import { api } from '../lib/api.js';

export default function PdfPane({ slug, pdfKey, compileState }) {
  const src = api.pdfUrl(slug, pdfKey);

  return (
    <div className="pdf-pane">
      <div className="pdf-toolbar">
        <span>Preview</span>
        <span className={`compile-status ${compileState}`}>
          <span className="dot" />
          {compileState === 'running' ? 'compiling' : 'ready'}
        </span>
      </div>
      <div className="pdf-frame">
        <iframe key={src} src={src} title="PDF preview" />
      </div>
    </div>
  );
}
