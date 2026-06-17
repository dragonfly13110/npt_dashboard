import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SmartTable from './SmartTable';

describe('SmartTable', () => {
  it('renders markdown bold markers as bold text in cells', () => {
    render(
      <SmartTable
        rawLines={[
          '| อำเภอ | จำนวน |',
          '| --- | --- |',
          '| **สามพราน** | **15** |',
        ]}
      />
    );

    expect(screen.getByText('สามพราน').tagName).toBe('STRONG');
    expect(screen.queryByText('**สามพราน**')).toBeNull();
  });
});
