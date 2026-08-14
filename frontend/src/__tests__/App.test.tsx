import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('App Component', () => {
  it('renders the initial App component and logichat title', () => {
    render(<App />);
    const elements = screen.getAllByText(/LogiChat/i);
    expect(elements.length).toBeGreaterThan(0);
  });
});
