import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SmartMapLayerPanel from '../components/SmartMapLayerPanel';

const metrics = [
  {
    key: 'area',
    label: 'Area',
    unit: 'rai',
    icon: '🌾',
    colors: ['#6ee7b7', '#34d399'],
  },
];

const markerLayers = [
  { key: 'hotspot', label: 'Hotspots', color: '#ef4444', icon: '🔥' },
];

describe('Smart map panels', () => {
  it('keeps layer controls wired to their explicit handlers', () => {
    const onMetricToggle = vi.fn();
    const onLayerToggle = vi.fn();
    const onBasemapChange = vi.fn();

    render(
      <SmartMapLayerPanel
        isOpen
        onControlsClose={vi.fn()}
        metrics={metrics}
        activeMetric="area"
        onMetricToggle={onMetricToggle}
        markerLayers={markerLayers}
        visibleLayers={{ hotspot: false }}
        onLayerToggle={onLayerToggle}
        isSoilLayerVisible={false}
        soilLayerTitle="Load soil"
        soilLayerLoading={false}
        soilLayerError={null}
        onSoilLayerToggle={vi.fn()}
        showSubdistrictLayer
        onSubdistrictLayerToggle={vi.fn()}
        basemap="osm"
        onBasemapChange={onBasemapChange}
        currentMetric={metrics[0]}
        minVal={1}
        maxVal={10}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Area$/ }));
    fireEvent.click(screen.getByLabelText(/Hotspots/));
    fireEvent.click(screen.getByTitle(/Google Maps/));

    expect(onMetricToggle).toHaveBeenCalledWith('area');
    expect(onLayerToggle).toHaveBeenCalledWith('hotspot');
    expect(onBasemapChange).toHaveBeenCalledWith('google-road');
  });
});
