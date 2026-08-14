import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserManager from '../web-admin/UserManager';

global.fetch = vi.fn();

describe('UserManager Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<UserManager />);
    expect(screen.getByText('Đang tải danh sách người dùng...')).toBeInTheDocument();
  });

  it('renders users list successfully', async () => {
    const mockUsers = [
      { id: '1', email: 'admin@logichat.vn', full_name: 'Admin', role: 'admin', created_at: '2023-01-01' },
      { id: '2', email: 'user@logichat.vn', full_name: 'User', role: 'user', created_at: '2023-01-02' }
    ];

    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: true, users: mockUsers })
    });

    render(<UserManager />);

    await waitFor(() => {
      expect(screen.queryByText('Đang tải danh sách người dùng...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('admin@logichat.vn')).toBeInTheDocument();
    expect(screen.getByText('user@logichat.vn')).toBeInTheDocument();
  });

  it('shows error toast when fetch fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: false, detail: 'Lỗi tải danh sách' })
    });

    render(<UserManager />);

    await waitFor(() => {
      expect(screen.getByText('Lỗi tải danh sách')).toBeInTheDocument();
    });
  });
});
