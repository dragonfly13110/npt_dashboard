import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NewsAccordion from './NewsAccordion';

describe('NewsAccordion', () => {
    const renderSections = () => {
        const renderGov = vi.fn(() => <div>Government widget mounted</div>);
        const renderMedia = vi.fn(() => <div>Media widget mounted</div>);

        render(
            <NewsAccordion
                sections={[
                    {
                        key: 'gov',
                        title: 'Government news',
                        description: 'Official sources',
                        defaultOpen: true,
                        renderContent: renderGov,
                    },
                    {
                        key: 'media',
                        title: 'Media news',
                        description: 'Press sources',
                        renderContent: renderMedia,
                    },
                ]}
            />
        );

        return { renderGov, renderMedia };
    };

    it('mounts only the default-open section on first render', () => {
        const { renderGov, renderMedia } = renderSections();

        expect(screen.getByText('Government widget mounted')).toBeInTheDocument();
        expect(screen.queryByText('Media widget mounted')).not.toBeInTheDocument();
        expect(renderGov).toHaveBeenCalledTimes(1);
        expect(renderMedia).not.toHaveBeenCalled();
    });

    it('mounts a closed section only after the user opens it', () => {
        const { renderMedia } = renderSections();

        fireEvent.click(screen.getByRole('button', { name: /Media news/ }));

        expect(screen.getByText('Media widget mounted')).toBeInTheDocument();
        expect(renderMedia).toHaveBeenCalledTimes(1);
        expect(screen.getByRole('button', { name: /Media news/ })).toHaveAttribute('aria-expanded', 'true');
    });
});
