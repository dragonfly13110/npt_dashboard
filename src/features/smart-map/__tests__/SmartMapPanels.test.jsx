import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SmartMapDetailPanel from '../components/SmartMapDetailPanel';
import SmartMapComparisonDialog from '../components/SmartMapComparisonDialog';
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

const oneMarkerLayer = [
  { key: 'hotspot', label: 'Hotspots', color: '#ef4444', icon: '🔥' },
];

const markerLayers = [
  {
    key: 'hotspot',
    apiLayer: 'fire_hotspots',
    label: 'Hotspots',
    color: '#ef4444',
    icon: 'fire',
  },
  {
    key: 'forecast',
    apiLayer: 'forecast_plots',
    label: 'Forecast plots',
    color: '#ec4899',
    icon: 'forecast',
  },
  {
    key: 'tourism',
    apiLayer: 'agri_tourism',
    label: 'Tourism',
    color: '#94a3b8',
    icon: 'tourism',
    disabled: true,
  },
];

describe('Smart map panels', () => {
  it('forwards comparison district selection through its explicit handler', () => {
    const onCompareDistrictChange = vi.fn();

    render(
      <SmartMapComparisonDialog
        selectedDistrict={{ name: 'เมืองนครปฐม', areaSqkm: 10 }}
        selectedData={{}}
        districtStats={{ กำแพงแสน: {} }}
        districtNames={['กำแพงแสน']}
        compareWithDistrictName="กำแพงแสน"
        onCompareDistrictChange={onCompareDistrictChange}
        onClose={vi.fn()}
        weatherData={{}}
        getWeatherDetails={vi.fn()}
        getPm25Color={vi.fn()}
        getPm25LevelLabel={vi.fn()}
        cropChartData={[]}
        simRiceConversion={0}
        onSimRiceConversionChange={vi.fn()}
        simResidueManagement={0}
        onSimResidueManagementChange={vi.fn()}
        simulationResults={{
          waterSaved: 0,
          incomeAdded: 0,
          co2Reduced: 0,
          hotspotReduction: 0,
        }}
        compareAreaSqkm={10}
        compSimRiceConversion={0}
        onCompSimRiceConversionChange={vi.fn()}
        compSimResidueManagement={0}
        onCompSimResidueManagementChange={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('เปรียบเทียบกับ:'), {
      target: { value: 'กำแพงแสน' },
    });

    expect(onCompareDistrictChange).toHaveBeenCalledWith('กำแพงแสน');
  });

  it('forwards a policy simulation change through its explicit handler', () => {
    const onRiceConversionChange = vi.fn();

    render(
      <SmartMapDetailPanel
        selectedDistrict={{ name: 'เมืองนครปฐม', areaSqkm: 10 }}
        selectedSubdistrict={null}
        selectedData={{ ricePrung: 100, ricePi: 20 }}
        panelClosing={false}
        onClose={vi.fn()}
        onCompare={vi.fn()}
        weather={null}
        cropChartData={[]}
        simRiceConversion={0}
        onRiceConversionChange={onRiceConversionChange}
        simResidueManagement={0}
        onResidueManagementChange={vi.fn()}
        simulationResults={{
          waterSaved: 0,
          incomeAdded: 0,
          co2Reduced: 0,
          hotspotReduction: 0,
        }}
        aiLoading={false}
        aiError={null}
        aiInsight={null}
        onGenerateAIInsight={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('เปลี่ยนนาปรังเป็นพืชสวน/พืชไร่'), {
      target: { value: '25' },
    });

    expect(onRiceConversionChange).toHaveBeenCalledWith(25);
  });

  it('labels district fallback data explicitly', () => {
    render(
      <SmartMapDetailPanel
        selectedDistrict={{ name: 'Mueang', areaSqkm: 10 }}
        selectedSubdistrict={{ name: 'Phra Pathom Chedi' }}
        selectedData={{ ricePrung: 0, ricePi: 0 }}
        summaryAvailability="district_only"
        panelClosing={false}
        onClose={vi.fn()}
        onCompare={vi.fn()}
        weather={null}
        cropChartData={[]}
        simRiceConversion={0}
        onRiceConversionChange={vi.fn()}
        simResidueManagement={0}
        onResidueManagementChange={vi.fn()}
        simulationResults={{
          waterSaved: 0,
          incomeAdded: 0,
          co2Reduced: 0,
          hotspotReduction: 0,
        }}
        aiLoading={false}
        aiError={null}
        aiInsight={null}
        onGenerateAIInsight={vi.fn()}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('ข้อมูลระดับอำเภอ');
  });

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
        markerLayers={oneMarkerLayer}
        visibleLayers={{ hotspot: false }}
        onLayerToggle={onLayerToggle}
        onClearPointLayers={vi.fn()}
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

  it('allows independent point layers, clears them all, and exposes counts', () => {
    const onLayerToggle = vi.fn();
    const onClearPointLayers = vi.fn();

    render(
      <SmartMapLayerPanel
        isOpen
        onControlsClose={vi.fn()}
        metrics={metrics}
        activeMetric={null}
        onMetricToggle={vi.fn()}
        markerLayers={markerLayers}
        visibleLayers={{ hotspot: true, forecast: true, tourism: false }}
        onLayerToggle={onLayerToggle}
        onClearPointLayers={onClearPointLayers}
        layerStatusById={{
          fire_hotspots: { availability: 'active', rowCount: 8 },
          forecast_plots: { availability: 'active', rowCount: 10 },
          agri_tourism: { availability: 'coordinate_incomplete', rowCount: 3 },
        }}
        layerMetaByKey={{ hotspot: { count: 2 }, forecast: { count: 5 } }}
        isSoilLayerVisible={false}
        soilLayerTitle="Load soil"
        soilLayerLoading={false}
        soilLayerError={null}
        onSoilLayerToggle={vi.fn()}
        showSubdistrictLayer={false}
        onSubdistrictLayerToggle={vi.fn()}
        basemap="osm"
        onBasemapChange={vi.fn()}
        currentMetric={null}
        minVal={0}
        maxVal={0}
      />
    );

    expect(screen.getByText(/Hotspots.*2.*8/)).toBeInTheDocument();
    expect(screen.getByText(/Forecast plots.*5.*10/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tourism/)).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/Hotspots/));
    fireEvent.click(screen.getByLabelText(/Forecast plots/));
    fireEvent.click(document.querySelector('.control-clear-btn'));

    expect(onLayerToggle).toHaveBeenNthCalledWith(1, 'hotspot');
    expect(onLayerToggle).toHaveBeenNthCalledWith(2, 'forecast');
    expect(onClearPointLayers).toHaveBeenCalledOnce();
  });
});
