import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { api } from '../lib/api.js';
import { DocIcon, MinusIcon, PlusIcon, DownloadIcon, SpinnerIcon } from './icons.jsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

export default function PdfPane({ slug, pdfKey, compileState, focusPage, onSynctex }) {
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(null); // null = fit width
  const [fitScale, setFitScale] = useState(1);
  const containerRef = useRef(null);
  const scrollerRef = useRef(null);
  const pdfRef = useRef(null);
  const canvasRefs = useRef(new Map());
  const unitWidths = useRef({});
  const renderToken = useRef(0);
  const onSynctexRef = useRef(onSynctex);
  onSynctexRef.current = onSynctex;

  const setCanvas = (page) => (node) => {
    if (node) canvasRefs.current.set(page, node);
    else canvasRefs.current.delete(page);
  };

  useEffect(() => {
    const token = ++renderToken.current;
    setPdf(null);
    setError(null);
    setPageCount(0);
    setCurrentPage(1);
    setZoom(null);
    pdfRef.current?.destroy();
    pdfRef.current = null;
    const src = api.pdfUrl(slug, pdfKey);
    pdfjsLib
      .getDocument({ url: src })
      .promise.then((doc) => {
        if (token !== renderToken.current) {
          doc.destroy();
          return;
        }
        pdfRef.current = doc;
        unitWidths.current = {};
        setPdf(doc);
        setPageCount(doc.numPages);
      })
      .catch(() => {
        if (token === renderToken.current) setError('not-compiled');
      });
    return () => {
      renderToken.current++;
    };
  }, [slug, pdfKey]);

  const renderAll = useCallback(async () => {
    const doc = pdf;
    if (!doc) return;
    const token = ++renderToken.current;
    const containerWidth = containerRef.current?.clientWidth || 800;
    try {
      const first = await doc.getPage(1);
      const unit = (unitWidths.current[1] ??= first.getViewport({ scale: 1 }).width);
      const fit = containerWidth / unit;
      setFitScale(fit);
      const scale = (zoom ?? fit) * (window.devicePixelRatio || 1);
      for (let i = 1; i <= doc.numPages; i++) {
        if (token !== renderToken.current) return;
        const page = await doc.getPage(i);
        unitWidths.current[i] ??= page.getViewport({ scale: 1 }).width;
        const vp = page.getViewport({ scale });
        const canvas = canvasRefs.current.get(i);
        if (!canvas) continue;
        const ctx = canvas.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = Math.floor(vp.width * (window.devicePixelRatio || 1));
        canvas.height = Math.floor(vp.height * (window.devicePixelRatio || 1));
        canvas.style.width = `${Math.floor(vp.width)}px`;
        canvas.style.height = `${Math.floor(vp.height)}px`;
        canvas.dataset.scale = String(scale);
        canvas.dataset.page = String(i);
        ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
      }
    } catch {
      /* aborted or failed render — ignore */
    }
  }, [pdf, zoom]);

  useEffect(() => {
    renderAll();
  }, [renderAll]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const pageEls = el.querySelectorAll('.pdf-page');
    let current = 1;
    for (const pg of pageEls) {
      if (pg.offsetTop - el.scrollTop <= 80) current = Number(pg.dataset.page) || 1;
      else break;
    }
    setCurrentPage(current);
  }, []);

  useEffect(() => {
    if (!focusPage || !pdf) return;
    const el = scrollerRef.current;
    const target = el?.querySelector(`.pdf-page[data-page="${focusPage.page}"]`);
    if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focusPage, pdf]);

  async function handleCanvasClick(e) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const scale = Number(canvas.dataset.scale);
    const page = Number(canvas.dataset.page);
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const x = Math.round(px / scale);
    const y = Math.round((rect.height - py) / scale);
    try {
      const res = await api.synctexEdit(slug, page, x, y);
      if (res?.file && res.line) onSynctexRef.current?.(res.file, res.line);
    } catch {
      /* no synctex match */
    }
  }

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, (z ?? fitScale) * 1.15));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, (z ?? fitScale) / 1.15));
  const zoomPct = zoom ? Math.round((zoom / fitScale) * 100) : null;

  const noPdf = error === 'not-compiled';
  const running = compileState === 'running';

  return (
    <div className="pdf-pane">
      <div className="pdf-toolbar">
        <span className="label">Preview</span>
        <div className="pdf-controls">
          {noPdf ? null : (
            <>
              <button className="icon-btn" title="Zoom out" onClick={zoomOut} disabled={!pdf}>
                <MinusIcon size={14} />
              </button>
              <button className="pdf-zoom" onClick={() => setZoom(null)} title="Reset zoom">
                {zoomPct ? `${zoomPct}%` : 'Fit'}
              </button>
              <button className="icon-btn" title="Zoom in" onClick={zoomIn} disabled={!pdf}>
                <PlusIcon size={14} />
              </button>
              {pageCount > 0 && <span className="pdf-page-ind">{currentPage} / {pageCount}</span>}
              <a className="icon-btn" title="Download PDF" href={api.pdfUrl(slug, pdfKey)} download="main.pdf">
                <DownloadIcon size={14} />
              </a>
            </>
          )}
        </div>
      </div>
      <div className="pdf-body">
        {noPdf ? (
          <div className="no-file">
            <DocIcon size={32} />
            No PDF yet
            <span style={{ fontSize: 12, color: 'var(--text-quaternary)' }}>Compile the project to generate a preview.</span>
          </div>
        ) : running && !pdf ? (
          <div className="no-file">
            <SpinnerIcon size={28} />
            Compiling…
          </div>
        ) : pdf ? (
          <div className="pdf-scroller" ref={scrollerRef} onScroll={onScroll}>
            <div className="pdf-pages" ref={containerRef}>
              {Array.from({ length: pageCount }).map((_, i) => {
                const page = i + 1;
                return (
                  <div className="pdf-page" key={page} data-page={page}>
                    <canvas ref={setCanvas(page)} onClick={handleCanvasClick} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="no-file">
            <SpinnerIcon size={28} />
            Loading PDF…
          </div>
        )}
      </div>
    </div>
  );
}
