import React from 'react';
import ProjectList from './components/ProjectList.jsx';
import Editor from './components/Editor.jsx';
import { useHashRoute, parseRoute, navigate } from './lib/router.js';

export default function App() {
  const hash = useHashRoute();
  const { view, slug } = parseRoute(hash);

  if (view === 'editor' && slug) {
    return <Editor key={slug} slug={slug} onBack={() => navigate('#/')} />;
  }
  return <ProjectList onOpen={(s) => navigate(`#/p/${s}`)} />;
}
