import { useEffect, useState } from 'react';

export function getHash() {
  return window.location.hash || '#/';
}

export function navigate(hash) {
  if (getHash() === hash) return;
  window.location.hash = hash;
}

export function useHashRoute() {
  const [hash, setHash] = useState(() => getHash());
  useEffect(() => {
    const onChange = () => setHash(getHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export function parseRoute(hash) {
  const clean = hash.replace(/^#\/?/, '');
  const [segment, slug] = clean.split('/');
  if (segment === 'p' && slug) return { view: 'editor', slug };
  return { view: 'home', slug: null };
}
