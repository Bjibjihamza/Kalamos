import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { socket, connectToProject, disconnectFromProject } from '../lib/socket.js';
import TopBar from './TopBar.jsx';
import FileTree from './FileTree.jsx';
import TabsBar from './TabsBar.jsx';
import EditorPane from './EditorPane.jsx';
import PdfPane from './PdfPane.jsx';
import LogPanel from './LogPanel.jsx';

export default function Editor({ slug, onBack }) {
  const [project, setProject] = useState(null);
  const [tree, setTree] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activePath, setActivePath] = useState(null);
  const [compile, setCompile] = useState({ state: 'idle', errors: [], warnings: [], log: [] });
  const [pdfKey, setPdfKey] = useState(Date.now());
  const [showLog, setShowLog] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const compilingRef = useRef(false);
  const timersRef = useRef({});
  const autoCompileRef = useRef(true);

  async function loadTree() {
    const t = await api.getTree(slug);
    setTree(t);
    return t;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [proj, t] = await Promise.all([api.getProject(slug), api.getTree(slug)]);
        if (cancelled) return;
        setProject(proj);
        setTree(t);
        if (proj.mainFile && !tabs.length) {
          openTab(proj.mainFile);
        }
        connectToProject(slug);
      } catch (e) {
        console.error(e);
        onBack();
      }
    })();
    return () => {
      cancelled = true;
      disconnectFromProject();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    const onStart = () => {
      setCompile((c) => ({ ...c, state: 'running', errors: [], warnings: [] }));
      setShowLog(true);
    };
    const onLog = ({ text }) => setCompile((c) => ({ ...c, log: [...c.log, text] }));
    const onDone = (res) => {
      compilingRef.current = false;
      setCompile((c) => ({
        state: res.success ? 'success' : 'error',
        errors: res.errors || [],
        warnings: res.warnings || [],
        log: c.log,
      }));
      if (res.success) setPdfKey(Date.now());
      setProject((p) => (p ? { ...p, hasPdf: !!res.pdfUrl } : p));
    };
    socket.on('compile:start', onStart);
    socket.on('compile:log', onLog);
    socket.on('compile:done', onDone);
    return () => {
      socket.off('compile:start', onStart);
      socket.off('compile:log', onLog);
      socket.off('compile:done', onDone);
    };
  }, []);

  async function openTab(path) {
    if (tabs.some((t) => t.path === path)) {
      setActivePath(path);
      return;
    }
    try {
      const content = await api.readFile(slug, path);
      setTabs((prev) => [...prev, { path, dirty: false, content }]);
      setActivePath(path);
    } catch (e) {
      console.error(e);
    }
  }

  function closeTab(path) {
    setTabs((prev) => prev.filter((t) => t.path !== path));
    setActivePath((cur) => (cur === path ? tabs.find((t) => t.path !== path)?.path || null : cur));
  }

  function onEdit(path, content) {
    setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, dirty: true, content } : t)));
    const timer = timersRef.current[path];
    clearTimeout(timer);
    timersRef.current[path] = setTimeout(async () => {
      await api.writeFile(slug, path, content);
      setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, dirty: false } : t)));
      if (autoCompileRef.current) compileNow();
    }, 1500);
  }

  async function compileNow() {
    if (compilingRef.current) return;
    compilingRef.current = true;
    setCompile((c) => ({ ...c, log: [] }));
    try {
      await api.compile(slug);
    } catch (e) {
      compilingRef.current = false;
      setCompile((c) => ({ ...c, state: 'error', errors: [{ message: e.message }], log: c.log }));
    }
  }

  async function handleRename(name) {
    const p = await api.renameProject(slug, name);
    setProject(p);
    setRenaming(false);
  }

  async function refreshTree() {
    const t = await loadTree();
    return t;
  }

  const activeTab = tabs.find((t) => t.path === activePath) || null;
  return (
    <div className="editor">
      <TopBar
        project={project}
        renaming={renaming}
        setRenaming={setRenaming}
        onRename={handleRename}
        compile={compile}
        onCompile={compileNow}
        onBack={onBack}
        onToggleLog={() => setShowLog((s) => !s)}
      />
      <div className="editor-body">
        <FileTree tree={tree} activePath={activePath} onOpen={openTab} onRefresh={refreshTree} slug={slug} />
        <div className="center">
          <TabsBar tabs={tabs} activePath={activePath} onSelect={setActivePath} onClose={closeTab} />
          <EditorPane activeTab={activeTab} onEdit={onEdit} />
        </div>
        <PdfPane slug={slug} pdfKey={pdfKey} compileState={compile.state} />
      </div>
      {showLog && <LogPanel compile={compile} onClose={() => setShowLog(false)} onJump={openTab} />}
    </div>
  );
}
