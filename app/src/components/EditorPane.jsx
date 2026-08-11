import React from 'react';
import Editor from '@monaco-editor/react';
import { languageOf } from '../lib/latex.js';

export default function EditorPane({ activeTab, onEdit }) {
  const path = activeTab?.path;
  const language = path ? languageOf(path) : 'plaintext';

  return (
    <div className="editor-pane">
      {activeTab ? (
        <Editor
          path={path}
          value={activeTab.content}
          language={language}
          theme="vs-dark"
          beforeMount={defineLanguages}
          options={{
            fontSize: 13,
            tabSize: 2,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            renderWhitespace: 'selection',
            smoothScrolling: true,
          }}
          onChange={(value) => onEdit(path, value ?? '')}
        />
      ) : (
        <div className="no-file">Select a file from the tree to start editing.</div>
      )}
    </div>
  );
}

function defineLanguages(monaco) {
  if (monaco.languages.getLanguages().some((l) => l.id === 'latex')) return;

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
