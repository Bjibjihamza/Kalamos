import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { socket, connectToProject, disconnectFromProject } from '../lib/socket.js';
import { useToast } from '../context/ToastContext.jsx';
import TopBar from './TopBar.jsx';
import FileTree from './FileTree.jsx';
import TabsBar from './TabsBar.jsx';
import EditorPane from './EditorPane.jsx';
import PdfPane from './PdfPane.jsx';
import LogPanel from './LogPanel.jsx';
import StatusBar from './StatusBar.jsx';
import CommandPalette from './CommandPalette.jsx';
import ShortcutsModal from './ShortcutsModal.jsx';
import {
  ArrowLeftIcon,
  PlayIcon,
  TerminalIcon,
  PlusIcon,
  FolderPlusIcon,
  CommandIcon,
  DocIcon,
} from './icons.jsx';

const SAVE_DELAY = 1500;

export default function Editor({ slug, onBack }) {
  const [project, setProject] = useState(null);
  const [tree, setTree] = useState(null);
  const [tabs, setTabs] = useState([]);
  const [activePath, setActivePath] = useState(null);
  const [saveStates, setSaveStates] = useState({});
  const [cursor, setCursor] = useState(null);
  const [compile, setCompile] = useState({ state: 'idle', errors: [], warnings: [], log: [] });
  const [compileMs, setCompileMs] = useState(null);
  const [pdfKey, setPdfKey] = useState(Date.now());
  const [showLog, setShowLog] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [autoCompile, setAutoCompile] = useState(true);
  const [showPalette, setShowPalette] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [jump, setJump] = useState(null);
  const [focusPage, setFocusPage] = useState(null);
  const [treeAction, setTreeAction] = useState(null);
  const compilingRef = useRef(false);
  const timersRef = useRef({});
  const autoCompileRef = useRef(true);
  autoCompileRef.current = autoCompile;
  const toast = useToast();

  const loadTree = useCallback(async () => {
    const t = await api.getTree(slug);
    setTree(t);
    return t;
  }, [slug]);

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
        toast.error(e.message);
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
      setShowLog(false);
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
      setCompileMs(res.elapsedMs ?? null);
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

  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  const openTab = useCallback(
    async (path) => {
      if (!path) return;
      if (tabsRef.current.some((t) => t.path === path)) {
        setActivePath(path);
        return;
      }
      try {
        const content = await api.readFile(slug, path);
        setTabs((prev) => (prev.some((t) => t.path === path) ? prev : [...prev, { path, dirty: false, content }]));
        setActivePath(path);
      } catch (e) {
        toast.error(e.message);
      }
    },
    [slug, toast]
  );

  function closeTab(path) {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.path === path);
      const next = prev.filter((t) => t.path !== path);
      setActivePath((cur) => {
        if (cur !== path) return cur;
        return next[idx]?.path || next[next.length - 1]?.path || null;
      });
      return next;
    });
  }

  async function doSave(path, content) {
    setSaveStates((s) => ({ ...s, [path]: 'saving' }));
    try {
      await api.writeFile(slug, path, content);
      setSaveStates((s) => ({ ...s, [path]: 'saved' }));
      setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, dirty: false } : t)));
      if (autoCompileRef.current) compileNow();
    } catch (e) {
      setSaveStates((s) => ({ ...s, [path]: 'dirty' }));
      toast.error(`Could not save ${path.split('/').pop()}: ${e.message}`);
    }
  }

  function onEdit(path, content) {
    setTabs((prev) => prev.map((t) => (t.path === path ? { ...t, dirty: true, content } : t)));
    setSaveStates((s) => ({ ...s, [path]: 'dirty' }));
    const timer = timersRef.current[path];
    clearTimeout(timer);
    timersRef.current[path] = setTimeout(() => doSave(path, content), SAVE_DELAY);
  }

  async function saveAllNow() {
    const dirty = tabsRef.current.filter((t) => t.dirty);
    if (dirty.length === 0) return;
    for (const t of tabsRef.current) clearTimeout(timersRef.current[t.path]);
    await Promise.all(dirty.map((t) => doSave(t.path, t.content)));
  }

  async function compileNow() {
    if (compilingRef.current) return;
    compilingRef.current = true;
    setCompile((c) => ({ ...c, log: [], state: 'running' }));
    setShowLog(false);
    try {
      const mainFile = activePath?.toLowerCase().endsWith('.tex') ? activePath : project?.mainFile;
      await api.compile(slug, mainFile);
    } catch (e) {
      compilingRef.current = false;
      setCompile((c) => ({ ...c, state: 'error', errors: [{ message: e.message }], log: c.log }));
    }
  }

  async function handleRename(name) {
    try {
      const p = await api.renameProject(slug, name);
      setProject(p);
      setRenaming(false);
      toast.success('Project renamed');
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleSynctex(file, line) {
    if (!file) return;
    const clean = String(file).replace(/^\.\//, '');
    await openTab(clean);
    setJump({ file: clean, line, ts: Date.now() });
  }

  async function handleForwardSync(file, line) {
    try {
      const res = await api.synctexView(slug, file, line);
      if (res?.page) setFocusPage({ page: res.page, ts: Date.now() });
    } catch {
      /* ignore */
    }
  }

  const diagnostics = useMemo(
    () => compile.errors.map((e) => ({ file: e.file, line: e.line, message: e.message, severity: 'error' })),
    [compile.errors]
  );

  const paletteActions = useMemo(() => {
    const files = [];
    const walk = (nodes) => {
      for (const n of nodes || []) {
        if (n.type === 'folder') walk(n.children);
        else files.push(n);
      }
    };
    walk(tree?.children);
    return [
      {
        label: 'Back to projects',
        icon: <ArrowLeftIcon size={15} />,
        run: onBack,
      },
      {
        label: 'Recompile',
        icon: <PlayIcon size={15} />,
        shortcut: 'Ctrl ↵',
        run: compileNow,
      },
      {
        label: 'Save all files',
        icon: <CommandIcon size={15} />,
        shortcut: 'Ctrl S',
        run: saveAllNow,
      },
      {
        label: autoCompile ? 'Disable auto-compile' : 'Enable auto-compile',
        icon: <TerminalIcon size={15} />,
        run: () => setAutoCompile((v) => !v),
      },
      {
        label: showLog ? 'Hide log' : 'Show log',
        icon: <TerminalIcon size={15} />,
        run: () => setShowLog((v) => !v),
      },
      { label: 'New file', icon: <PlusIcon size={15} />, run: () => setTreeAction({ kind: 'file', dir: '', ts: Date.now() }) },
      { label: 'New folder', icon: <FolderPlusIcon size={15} />, run: () => setTreeAction({ kind: 'folder', dir: '', ts: Date.now() }) },
      ...files.map((f) => ({
        label: `Open ${f.path}`,
        icon: <DocIcon size={15} />,
        run: () => openTab(f.path),
      })),
      {
        label: 'Keyboard shortcuts',
        icon: <CommandIcon size={15} />,
        run: () => setShowShortcuts(true),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tree, autoCompile, showLog, onBack]);

  useEffect(() => {
    const onKey = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'Enter') {
        e.preventDefault();
        compileNow();
      } else if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveAllNow();
      } else if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowPalette((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeTab = tabs.find((t) => t.path === activePath) || null;
  const activeSaveState = activeTab ? saveStates[activeTab.path] || (activeTab.dirty ? 'dirty' : 'saved') : null;
  const pdfName = useMemo(() => {
    const mf = project?.mainFile;
    if (!mf) return 'main.pdf';
    return `${mf.replace(/\.tex$/i, '').split('/').pop()}.pdf`;
  }, [project]);

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
        onOpenPalette={() => setShowPalette(true)}
        onOpenShortcuts={() => setShowShortcuts(true)}
      />
      <div className="editor-body">
        <FileTree tree={tree} activePath={activePath} onOpen={openTab} onRefresh={loadTree} slug={slug} addSignal={treeAction} />
        <div className="center">
          <TabsBar tabs={tabs} activePath={activePath} onSelect={setActivePath} onClose={closeTab} />
          <EditorPane
            activeTab={activeTab}
            onEdit={onEdit}
            diagnostics={diagnostics}
            jump={jump}
            onCursorChange={setCursor}
            onForwardSync={handleForwardSync}
          />
          <StatusBar
            path={activePath}
            cursor={cursor}
            saveState={activeSaveState}
            autoCompile={autoCompile}
            onToggleAutoCompile={() => setAutoCompile((v) => !v)}
            compileMs={compileMs}
          />
        </div>
        <PdfPane slug={slug} pdfKey={pdfKey} pdfName={pdfName} compileState={compile.state} focusPage={focusPage} onSynctex={handleSynctex} />
      </div>
      {showLog && <LogPanel compile={compile} onClose={() => setShowLog(false)} onJump={openTab} />}
      {showPalette && <CommandPalette actions={paletteActions} onClose={() => setShowPalette(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
