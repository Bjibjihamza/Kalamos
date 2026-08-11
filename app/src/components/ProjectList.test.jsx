import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectList from './ProjectList.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import { ConfirmProvider } from '../context/ConfirmContext.jsx';
import { api } from '../lib/api.js';

vi.mock('../lib/api.js', () => ({
  api: {
    listProjects: vi.fn(),
    listTemplates: vi.fn(),
    createProject: vi.fn(),
    deleteProject: vi.fn(),
    duplicateProject: vi.fn(),
    renameProject: vi.fn(),
  },
}));

function renderList() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <ProjectList onOpen={vi.fn()} />
      </ConfirmProvider>
    </ToastProvider>
  );
}

describe('ProjectList', () => {
  beforeEach(() => {
    vi.mocked(api.listProjects).mockResolvedValue([]);
    vi.mocked(api.listTemplates).mockResolvedValue(['report', 'article', 'blank']);
  });

  it('shows the empty state when there are no projects', async () => {
    renderList();
    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
  });

  it('renders project cards with template and compiled badge', async () => {
    vi.mocked(api.listProjects).mockResolvedValue([
      {
        slug: 'alpha',
        name: 'Alpha',
        template: 'report',
        hasPdf: true,
        createdAt: '2026-01-01T00:00:00Z',
        modifiedAt: '2026-01-02T00:00:00Z',
      },
      {
        slug: 'beta',
        name: 'Beta',
        template: 'blank',
        hasPdf: false,
        createdAt: '2026-01-01T00:00:00Z',
        modifiedAt: '2026-01-03T00:00:00Z',
      },
    ]);
    renderList();
    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getAllByText('report').length).toBe(1);
    expect(screen.getByText('Compiled')).toBeInTheDocument();
  });
});
