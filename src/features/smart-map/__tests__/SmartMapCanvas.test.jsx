import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../components/MapControls', () => ({
  FitBounds: () => null,
  MapFlyTo: () => null,
  MapSizeInvalidator: () => null,
  MapZoomTracker: () => null,
}));

import SmartMapCanvas from '../components/SmartMapCanvas';

const MapComponents = {
  L: {},
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  CircleMarker: () => null,
  Marker: () => null,
  Tooltip: () => null,
  Pane: ({ children }) => <div data-testid="map-error-pane">{children}</div>,
  GeoJSON: ({ onEachFeature }) => {
    if (onEachFeature) throw new Error('choropleth failed');
    return <span data-testid="district-outline" />;
  },
  useMap: () => ({}),
  useMapEvents: () => ({}),
  ZoomControl: () => null,
  Polyline: () => null,
};

describe('SmartMapCanvas', () => {
  it('keeps the district outline when the choropleth layer fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <SmartMapCanvas
        MapComponents={MapComponents}
        geoJSONData={{ type: 'FeatureCollection', features: [] }}
        resetKey={0}
        selectedDistrict={null}
        selectedSubdistrict={null}
        basemap="osm"
        isControlsOpen={false}
        setMapZoom={() => {}}
        districtCentroids={{}}
        activeMetric="area"
        districtStats={{ เมืองนครปฐม: { area: 1 } }}
        weatherData={{}}
        getDistrictColor={() => '#000'}
        getWeatherDetails={() => ({})}
        getPm25Color={() => '#000'}
        getPm25LevelLabel={() => ''}
        setPanelClosing={() => {}}
        setSelectedDistrict={() => {}}
        setSelectedSubdistrict={() => {}}
        isSoilLayerVisible={false}
        soilLayerData={null}
        soilLayerMeta={null}
        showSubdistrictLayer={false}
        mapZoom={9}
        visibleSubdistrictFeatures={[]}
        markerLayers={[]}
        visibleLayers={{}}
        allCoords={{}}
      />
    );

    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByTestId('district-outline')).toBeInTheDocument();
    expect(screen.getByTestId('map-error-pane')).toContainElement(
      screen.getByRole('status')
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'ไม่สามารถแสดงชั้นข้อมูลสีตามตัวชี้วัดได้'
    );
    consoleSpy.mockRestore();
  });
});
