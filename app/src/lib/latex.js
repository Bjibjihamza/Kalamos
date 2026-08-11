export function languageOf(path) {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'tex' || ext === 'sty' || ext === 'cls' || ext === 'ltx') return 'latex';
  if (ext === 'bib') return 'bibtex';
  if (ext === 'json') return 'json';
  if (ext === 'md') return 'markdown';
  if (ext === 'css') return 'css';
  if (ext === 'js' || ext === 'jsx' || ext === 'ts' || ext === 'tsx') return 'javascript';
  if (ext === 'sh') return 'shell';
  return 'plaintext';
}
