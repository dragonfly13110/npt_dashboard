import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MapLayerErrorBoundary from '../components/MapLayerErrorBoundary';

function BrokenLayer() {
  throw new Error('layer failed');
}

describe('MapLayerErrorBoundary', () => {
  it('keeps the map available when one layer fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <div>
        <span>map stays visible</span>
        <MapLayerErrorBoundary layerName="ชั้นข้อมูลดิน">
          <BrokenLayer />
        </MapLayerErrorBoundary>
      </div>
    );

    expect(screen.getByText('map stays visible')).toBeInTheDocument();
    expect(
      screen.getByText('ไม่สามารถแสดงชั้นข้อมูลดินได้')
    ).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
