import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorBoundary from './index';
import { BrowserRouter } from 'react-router-dom';

const ThrowError = () => {
    throw new Error('Test error');
};

describe('ErrorBoundary', () => {
    it('renders children when there is no error', () => {
        render(
            <BrowserRouter>
                <ErrorBoundary>
                    <div data-testid="child">Hello</div>
                </ErrorBoundary>
            </BrowserRouter>
        );
        expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders error fallback when child throws', () => {
        // Suppress console.error for this test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        render(
            <BrowserRouter>
                <ErrorBoundary>
                    <ThrowError />
                </ErrorBoundary>
            </BrowserRouter>
        );
        
        expect(screen.getByText(/เกิดข้อผิดพลาดในระบบ/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Test error/).length).toBeGreaterThanOrEqual(1);
        consoleSpy.mockRestore();
    });

    it('calls console.error when catching an error', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        
        render(
            <BrowserRouter>
                <ErrorBoundary>
                    <ThrowError />
                </ErrorBoundary>
            </BrowserRouter>
        );
        
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
