import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MapLayerErrorBoundary from '../components/MapLayerErrorBoundary';

function BrokenLayer() {
  throw new Error('layer failed');
}

function HealthyLayer() {
  return <span>layer recovered</span>;
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

  it('keeps a layer error visible when a caller passes a null fallback', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MapLayerErrorBoundary layerName="point layer" fallback={null}>
        <BrokenLayer />
      </MapLayerErrorBoundary>
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'ไม่สามารถแสดงpoint layerได้'
    );
    consoleSpy.mockRestore();
  });

  it('retries the layer when its reset identity changes', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { rerender } = render(
      <MapLayerErrorBoundary layerName="point layer" resetOn="old-data">
        <BrokenLayer />
      </MapLayerErrorBoundary>
    );

    rerender(
      <MapLayerErrorBoundary layerName="point layer" resetOn="new-data">
        <HealthyLayer />
      </MapLayerErrorBoundary>
    );

    expect(screen.getByText('layer recovered')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
