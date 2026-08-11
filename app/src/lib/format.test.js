import { describe, it, expect } from 'vitest';
import { timeAgo, formatBytes, plural } from './format.js';

describe('timeAgo', () => {
  it('returns never for missing values', () => {
    expect(timeAgo(null)).toBe('never');
    expect(timeAgo('')).toBe('never');
  });

  it('formats seconds', () => {
    expect(timeAgo(new Date(Date.now() - 10000).toISOString())).toMatch(/^\d+s ago$/);
  });

  it('formats minutes', () => {
    expect(timeAgo(new Date(Date.now() - 2 * 60 * 1000).toISOString())).toBe('2m ago');
  });

  it('formats hours', () => {
    expect(timeAgo(new Date(Date.now() - 3 * 3600 * 1000).toISOString())).toBe('3h ago');
  });

  it('formats days', () => {
    expect(timeAgo(new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString())).toBe('4d ago');
  });

  it('falls back to a date for older values', () => {
    const out = timeAgo('2020-05-01T00:00:00Z');
    expect(out).not.toMatch(/ago$/);
    expect(out).not.toBe('—');
  });
});

describe('formatBytes', () => {
  it('formats bytes, KB and MB', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(3 * 1024 * 1024)).toBe('3.0 MB');
  });

  it('handles non-finite input', () => {
    expect(formatBytes(NaN)).toBe('—');
  });
});

describe('plural', () => {
  it('handles singular and plural', () => {
    expect(plural(1, 'project')).toBe('1 project');
    expect(plural(2, 'project')).toBe('2 projects');
  });
});
