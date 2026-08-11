import React, { useEffect, useState } from 'react';
import ProjectList from './components/ProjectList.jsx';
import Editor from './components/Editor.jsx';

export default function App() {
  const [activeSlug, setActiveSlug] = useState(() => sessionStorage.getItem('preleaf:active') || null);

  useEffect(() => {
    if (activeSlug) sessionStorage.setItem('preleaf:active', activeSlug);
    else sessionStorage.removeItem('preleaf:active');
  }, [activeSlug]);

  if (activeSlug) {
    return <Editor slug={activeSlug} onBack={() => setActiveSlug(null)} />;
  }
  return <ProjectList onOpen={(slug) => setActiveSlug(slug)} />;
}
