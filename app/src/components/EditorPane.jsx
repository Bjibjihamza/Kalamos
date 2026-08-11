import React, { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { languageOf } from '../lib/latex.js';
import { DocIcon } from './icons.jsx';

export default function EditorPane({ activeTab, onEdit, diagnostics, onCursorChange, onForwardSync, jump }) {
  const path = activeTab?.path;
  const language = path ? languageOf(path) : 'plaintext';
  const editorsRef = useRef(new Map());
  const monacoRef = useRef(null);

  useEffect(() => {
    const editor = editorsRef.current.get(path);
    if (editor && jump && jump.file === path) {
      editor.setPosition({ lineNumber: jump.line, column: 1 });
      editor.revealLineInCenter(jump.line);
      editor.focus();
    }
  }, [jump, path]);

  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    for (const model of monaco.editor.getModels()) {
      const modelPath = String(model.uri.path || '').replace(/^\//, '');
      const markers = (diagnostics || [])
        .filter((d) => d.file && normalize(d.file) === modelPath)
        .map((d) => ({
          severity: d.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
          message: d.message,
          startLineNumber: d.line || 1,
          endLineNumber: d.line || 1,
          startColumn: 1,
          endColumn: Number.MAX_SAFE_INTEGER,
        }));
      monaco.editor.setModelMarkers(model, 'preleaf', markers);
    }
  }, [diagnostics, path]);

  return (
    <div className="editor-pane">
      {activeTab ? (
        <Editor
          path={path}
          value={activeTab.content}
          language={language}
          theme="preleaf-dark"
          beforeMount={defineLanguages}
          onMount={(editor, monaco) => {
            monacoRef.current = monaco;
            editorsRef.current.set(path, editor);
            editor.onDidChangeCursorPosition(() => {
              onCursorChange?.(editor.getPosition());
            });
            editor.onMouseDown((e) => {
              if ((e.event.ctrlKey || e.event.metaKey) && e.target?.position && onForwardSync) {
                e.event.preventDefault();
                onForwardSync(path, e.target.position.lineNumber);
              }
            });
          }}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            tabSize: 2,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            renderWhitespace: 'selection',
            smoothScrolling: true,
            padding: { top: 12 },
            scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
            cursorBlinking: 'smooth',
          }}
          onChange={(value) => onEdit(path, value ?? '')}
        />
      ) : (
        <div className="no-file">
          <DocIcon size={32} />
          Select a file to start editing
        </div>
      )}
    </div>
  );
}

function normalize(p) {
  return String(p || '').replace(/^\//, '');
}

function defineLanguages(monaco) {
  if (monaco.languages.getLanguages().some((l) => l.id === 'latex')) return;

  monaco.editor.defineTheme('preleaf-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '62666d', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7170ff' },
      { token: 'tag', foreground: '5e6ad2' },
      { token: 'delimiter', foreground: '8a8f98' },
      { token: 'string', foreground: '4cb782' },
      { token: 'key', foreground: '828fff' },
    ],
    colors: {
      'editor.background': '#08090a',
      'editor.foreground': '#f7f8f8',
      'editor.lineHighlightBackground': '#ffffff08',
      'editor.selectionBackground': '#5e6ad240',
      'editor.inactiveSelectionBackground': '#5e6ad220',
      'editorCursor.foreground': '#7170ff',
      'editorLineNumber.foreground': '#3d3f44',
      'editorLineNumber.activeForeground': '#8a8f98',
      'editorIndentGuide.background': '#ffffff0a',
      'editorIndentGuide.activeBackground': '#ffffff14',
      'editorWhitespace.foreground': '#ffffff0f',
      'editorGutter.background': '#08090a',
      'editorSuggestWidget.background': '#1a1b1d',
      'editorSuggestWidget.border': '#34343a',
      'editorSuggestWidget.selectedBackground': '#5e6ad2',
      'editorWidget.background': '#1a1b1d',
      'editorWidget.border': '#34343a',
      'input.background': '#0f1011',
      'input.border': '#23252a',
      'input.foreground': '#f7f8f8',
      'scrollbarSlider.background': '#34343a80',
      'scrollbarSlider.hoverBackground': '#34343a',
      'scrollbarSlider.activeBackground': '#62666d',
    },
  });

  monaco.languages.register({ id: 'latex' });
  monaco.languages.setMonarchTokensProvider('latex', {
    tokenizer: {
      root: [
        [/\\begin\{/, { token: 'keyword', next: '@env' }],
        [/\\end\{/, 'keyword'],
        [/\\[a-zA-Z@]+\*?/, 'tag'],
        [/\\(\[|\])/, 'delimiter'],
        [/\$\$?/, 'delimiter'],
        [/[{}]/, 'delimiter'],
        [/%.*$/, 'comment'],
        [/&/, 'delimiter'],
        [/\^|_/, 'delimiter'],
        [/[^\\%${}&^_\n]+/, 'text'],
      ],
      env: [
        [/[a-zA-Z@]+\*?/, 'tag'],
        [/\}/, { token: '@rematch', next: '@pop' }],
      ],
    },
  });

  monaco.languages.register({ id: 'bibtex' });
  monaco.languages.setMonarchTokensProvider('bibtex', {
    tokenizer: {
      root: [
        [/@\w+/, 'keyword'],
        [/\w+\s*=/, 'key'],
        [/{|}|,/, 'delimiter'],
        [/%.*$/, 'comment'],
        [/[^@%{},]+/, 'string'],
      ],
    },
  });

  monaco.languages.registerCompletionItemProvider('latex', {
    triggerCharacters: ['\\'],
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };
      const cmds = [
        'section', 'subsection', 'subsubsection', 'begin', 'end', 'label', 'ref',
        'cite', 'bibliography', 'usepackage', 'documentclass', 'input', 'include',
        'includegraphics', 'item', 'textit', 'textbf', 'emph', 'frac', 'mathbf',
        'underline', 'newpage', 'clearpage', 'caption', 'centering', 'tableofcontents',
        'chapter', 'paragraph', 'title', 'author', 'date', 'maketitle', 'thanks',
        'textcolor', 'footnote', 'url', 'href',
      ];
      return {
        suggestions: cmds.map((c) => ({
          label: `\\${c}`,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: `\\${c}${c === 'begin' ? '{}' : ''}`,
          range,
        })),
      };
    },
  });
}
