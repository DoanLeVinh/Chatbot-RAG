import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminLogin from '../web-admin/AdminLogin';

// Mock fetch
global.fetch = vi.fn();

describe('AdminLogin Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it('renders login form correctly', () => {
    render(
      <MemoryRouter>
        <AdminLogin onLoginSuccess={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText('LogiAdmin')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('admin@logichat.vn')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('shows error on failed login', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({ success: false, error: 'Mật khẩu không đúng' })
    });

    render(
      <MemoryRouter>
        <AdminLogin onLoginSuccess={() => {}} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('admin@logichat.vn'), { target: { value: 'admin@logichat.vn' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Đăng Nhập/i }));

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu không đúng')).toBeInTheDocument();
    });
  });

  it('calls onLoginSuccess on successful admin login', async () => {
    const mockOnLoginSuccess = vi.fn();
    (global.fetch as any).mockResolvedValueOnce({
      json: async () => ({
        success: true,
        user: { role: 'admin' },
        token: 'fake-token'
      })
    });

    render(
      <MemoryRouter>
        <AdminLogin onLoginSuccess={mockOnLoginSuccess} />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('admin@logichat.vn'), { target: { value: 'admin@logichat.vn' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'correctpass' } });
    fireEvent.click(screen.getByRole('button', { name: /Đăng Nhập/i }));

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalled();
    });
    expect(sessionStorage.getItem('logichat_admin_token')).toBe('fake-token');
  });
});
