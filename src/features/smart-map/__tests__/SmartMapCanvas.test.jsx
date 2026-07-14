import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../components/MapControls', () => ({
  FitBounds: () => null,
  MapFlyTo: () => null,
  MapSizeInvalidator: () => null,
  MapZoomTracker: () => null,
}));

import SmartMapCanvas from '../components/SmartMapCanvas';
import { getNormalizedPlaceValue } from '../../../utils/geojsonBoundaries';

let choroplethAttempts = 0;

const MapComponents = {
  L: {},
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  CircleMarker: () => null,
  Marker: () => null,
  Tooltip: () => null,
  Pane: ({ children }) => <div data-testid="map-error-pane">{children}</div>,
  GeoJSON: ({ onEachFeature }) => {
    if (onEachFeature) {
      choroplethAttempts += 1;
      throw new Error('choropleth failed');
    }
    return <span data-testid="district-outline" />;
  },
  useMap: () => ({}),
  useMapEvents: () => ({}),
  ZoomControl: () => null,
  Polyline: () => null,
};

const canvasProps = {
  MapComponents,
  geoJSONData: { type: 'FeatureCollection', features: [] },
  resetKey: 0,
  selectedDistrict: null,
  selectedSubdistrict: null,
  basemap: 'osm',
  isControlsOpen: false,
  setMapZoom: () => {},
  districtCentroids: {},
  activeMetric: 'area',
  districtStats: { เมืองนครปฐม: { area: 1 } },
  weatherData: {},
  getDistrictColor: () => '#000',
  getWeatherDetails: () => ({}),
  getPm25Color: () => '#000',
  getPm25LevelLabel: () => '',
  setPanelClosing: () => {},
  setSelectedDistrict: () => {},
  setSelectedSubdistrict: () => {},
  isSoilLayerVisible: false,
  soilLayerData: null,
  soilLayerMeta: null,
  showSubdistrictLayer: false,
  mapZoom: 9,
  visibleSubdistrictFeatures: [],
  markerLayers: [],
  visibleLayers: {},
  allCoords: {},
};

describe('SmartMapCanvas', () => {
  it('uses normalized district and subdistrict names for choropleth stats', () => {
    expect(
      getNormalizedPlaceValue(
        { '\u0e40\u0e21\u0e37\u0e2d\u0e07': { area: 1 } },
        '\u0e40\u0e21\u0e37\u0e2d\u0e07\u0e19\u0e04\u0e23\u0e1b\u0e10\u0e21'
      )
    ).toEqual({ area: 1 });
    expect(
      getNormalizedPlaceValue(
        { '\u0e1a\u0e32\u0e07\u0e41\u0e01\u0e49\u0e27': { area: 2 } },
        '\u0e15\u0e33\u0e1a\u0e25\u0e1a\u0e32\u0e07\u0e41\u0e01\u0e49\u0e27'
      )
    ).toEqual({ area: 2 });
  });

  it('keeps the district outline when the choropleth layer fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    choroplethAttempts = 0;

    render(<SmartMapCanvas {...canvasProps} />);

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

  it('does not retry a failed layer for unrelated canvas renders', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    choroplethAttempts = 0;
    const { rerender } = render(<SmartMapCanvas {...canvasProps} />);
    const attemptsBeforeRerender = choroplethAttempts;

    rerender(<SmartMapCanvas {...canvasProps} basemap="google-road" />);

    expect(attemptsBeforeRerender).toBeGreaterThan(0);
    expect(choroplethAttempts).toBe(attemptsBeforeRerender);
    consoleSpy.mockRestore();
  });
});
