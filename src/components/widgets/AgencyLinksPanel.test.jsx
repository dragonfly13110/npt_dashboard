import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AgencyLinksPanel from './AgencyLinksPanel';

describe('AgencyLinksPanel', () => {
    it('renders key ministry shortcuts as external links', () => {
        render(<AgencyLinksPanel />);

        expect(screen.getByText('ทางลัดเว็บไซต์หน่วยงาน')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'กระทรวงเกษตรและสหกรณ์' })).toHaveAttribute('href', 'https://www.moac.go.th/');
        expect(screen.getByRole('link', { name: 'กรมส่งเสริมการเกษตร' })).toHaveAttribute('href', 'https://www.doae.go.th/');
        expect(screen.getByRole('link', { name: 'สำนักงานเกษตรจังหวัดนครปฐม' })).toHaveAttribute('href', 'https://nakhonpathom.doae.go.th/');
    });
});
