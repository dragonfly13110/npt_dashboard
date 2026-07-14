import { useEffect } from 'react';

export function FitBounds({
  useMap,
  geoJSONData,
  L,
  resetKey,
  selectedDistrict,
}) {
  const map = useMap();
  useEffect(() => {
    if (!geoJSONData || !L) return;
    const fitMap = () => {
      const bounds = L.geoJSON(geoJSONData).getBounds();
      if (!bounds.isValid()) return;
      map.invalidateSize();
      map.fitBounds(bounds, {
        paddingTopLeft: [selectedDistrict ? 360 : 28, 80],
        paddingBottomRight: [240, 100],
        maxZoom: 11,
        animate: true,
      });
    };
    const frame = requestAnimationFrame(fitMap);
    const timeout = window.setTimeout(fitMap, 250);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoJSONData, L, map, resetKey]);
  return null;
}

export function MapSizeInvalidator({ useMap, watchKey }) {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const invalidate = () => map.invalidateSize({ animate: false });
    const frame = requestAnimationFrame(invalidate);
    const timeout = window.setTimeout(invalidate, 250);
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(invalidate);
    observer?.observe(container);
    window.addEventListener('resize', invalidate);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
      observer?.disconnect();
      window.removeEventListener('resize', invalidate);
    };
  }, [map, watchKey]);
  return null;
}

export function MapFlyTo({ useMap, selectedDistrict, centroids }) {
  const map = useMap();
  useEffect(() => {
    const coords = selectedDistrict && centroids[selectedDistrict.name];
    if (coords) map.flyTo(coords, 11, { animate: true, duration: 1.2 });
  }, [selectedDistrict, map, centroids]);
  return null;
}

export function MapZoomTracker({ useMapEvents, setMapZoom }) {
  const map = useMapEvents({
    zoomend() {
      setMapZoom(map.getZoom());
    },
  });
  return null;
}

export function MapBoundsTracker({ useMapEvents, onBoundsChange }) {
  const map = useMapEvents({
    moveend() {
      const bounds = map.getBounds();
      onBoundsChange([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]);
    },
  });
  return null;
}
