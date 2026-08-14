import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DocumentManager from '../web-admin/DocumentManager';

global.fetch = vi.fn();

describe('DocumentManager Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    const { container } = render(<DocumentManager />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders document hierarchy successfully', async () => {
    const mockHierarchy = [
      {
        source: 'Luật Hải quan.pdf',
        chapters: [{ chapter: 'Không phân chương' }, { chapter: 'Chương I' }]
      }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, hierarchy: mockHierarchy })
    });

    const { container } = render(<DocumentManager />);

    await waitFor(() => {
      expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Luật Hải quan.pdf')).toBeInTheDocument();
  });
});
